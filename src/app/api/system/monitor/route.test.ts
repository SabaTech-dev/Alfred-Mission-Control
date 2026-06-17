/**
 * Tests for /api/system/monitor route
 *
 * Validates the bounded-probe behaviour introduced to fix the telemetry
 * timeouts: when an OS probe (tailscale/ufw/df) hangs, the endpoint must still
 * return a 200 within the budget with that section degraded to safe defaults,
 * rather than blocking and cascading into sibling requests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type ExecCallback = (err: Error | null, stdout: string, stderr: string) => void;

// vitest hoists vi.mock above imports; only `mock`-prefixed top-level bindings
// are visible inside the factory.
interface CmdBehaviour {
  stdout?: string;
  stderr?: string;
  error?: Error;
  hang?: boolean;
}
const mockBehaviours: Record<string, CmdBehaviour> = {};

vi.mock("child_process", () => {
  const PROMISIFY_CUSTOM = Symbol.for("nodejs.util.promisify.custom");
  const exec = function (
    cmd: string,
    _opts: unknown,
    cb: ExecCallback,
  ): unknown {
    const cmdKey = cmd.split(/\s+/)[0];
    const behaviour = mockBehaviours[cmdKey] ?? mockBehaviours[cmd];
    if (!behaviour || behaviour.hang) {
      return undefined; // hang: never call back
    }
    if (behaviour.error) {
      cb(behaviour.error, behaviour.stderr ?? "", "");
    } else {
      cb(null, behaviour.stdout ?? "", behaviour.stderr ?? "");
    }
    return undefined;
  } as ((cmd: string, opts: unknown, cb: ExecCallback) => unknown) & {
    [k: symbol]: unknown;
  };
  exec[PROMISIFY_CUSTOM] = (cmd: string, opts: unknown) =>
    new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(cmd, opts, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve({ stdout, stderr });
      });
    });
  return { default: { exec }, exec };
});

import { GET } from "./route";

describe("/api/system/monitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // `df` returns a believable row by default so the disk probe resolves.
    mockBehaviours["df"] = { stdout: "none 200 80 120 0% /" };
    // systemctl resolves to "active" by default for every service.
    mockBehaviours["systemctl"] = { stdout: "active" };
    // docker absent => empty stdout.
    mockBehaviours["docker"] = { stdout: "" };
  });

  afterEach(() => {
    vi.useRealTimers();
    for (const key of Object.keys(mockBehaviours)) delete mockBehaviours[key];
  });

  it("returns 200 with degraded defaults when tailscale hangs past the budget", async () => {
    // `which tailscale` resolves (tailscale present), but `tailscale status`
    // hangs forever — simulating a stuck daemon.
    mockBehaviours["which"] = { stdout: "/usr/bin/tailscale" };
    mockBehaviours["tailscale"] = { hang: true };
    // ufw resolves quickly.
    mockBehaviours["ufw"] = { stdout: "Status: inactive" };

    const pending = GET();
    // Advance well past the probe budget (5s).
    await vi.advanceTimersByTimeAsync(8000);

    const response = await pending;
    expect(response.status).toBe(200);
    const data = await response.json();

    // Disk + firewall still populated; tailscale degraded to defaults.
    expect(data.disk.total).toBe(200);
    expect(data.firewall.active).toBe(false);
    expect(data.tailscale.active).toBe(false);
    expect(data.tailscale.devices).toEqual([]);
    expect(Array.isArray(data.systemd)).toBe(true);
  });

  it("returns 200 with full tailscale data when probes resolve quickly", async () => {
    mockBehaviours["which"] = { stdout: "/usr/bin/tailscale" };
    mockBehaviours["tailscale"] = {
      stdout: "100.64.0.1 node-1 user linux active",
    };
    mockBehaviours["ufw"] = { stdout: "Status: inactive" };

    const pending = GET();
    await vi.advanceTimersByTimeAsync(0);

    const response = await pending;
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.tailscale.active).toBe(true);
    expect(data.tailscale.devices).toHaveLength(1);
    expect(data.tailscale.ip).toBe("100.64.0.1");
  });

  it("returns 200 with firewall rules when ufw is active", async () => {
    mockBehaviours["which"] = { error: new Error("not found") }; // no tailscale
    mockBehaviours["ufw"] = {
      stdout: [
        "Status: active",
        "",
        "     [ 1] 22/tcp                     ALLOW IN    Anywhere",
      ].join("\n"),
    };

    const pending = GET();
    await vi.advanceTimersByTimeAsync(0);

    const response = await pending;
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.firewall.active).toBe(true);
    expect(data.firewall.rules.length).toBeGreaterThanOrEqual(1);
    expect(data.tailscale.active).toBe(false);
  });
});
