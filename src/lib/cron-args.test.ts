import { describe, it, expect } from "vitest";
import { buildCronAddArgs } from "./cron-args";

describe("buildCronAddArgs", () => {
  const base = { name: "test-job" };

  it("includes --tz (default Europe/Madrid) when schedule is a cron expression", () => {
    const args = buildCronAddArgs({ ...base, schedule: "0 4 * * *" });
    expect(args).toContain("--cron");
    expect(args.join(" ")).toContain("--tz Europe/Madrid");
  });

  it("sends custom --tz when provided with schedule", () => {
    const args = buildCronAddArgs({ ...base, schedule: "0 4 * * *", timezone: "UTC" });
    expect(args.join(" ")).toContain("--tz UTC");
  });

  it("omits --tz when every is used (CLI rejects --tz with --every)", () => {
    const args = buildCronAddArgs({ ...base, every: "24h", timezone: "Europe/Madrid" });
    expect(args.join(" ")).toContain("--every 24h");
    expect(args).not.toContain("--tz");
  });

  it("sends --tz when at is offset-less", () => {
    const args = buildCronAddArgs({ ...base, at: "2026-09-22T09:00", timezone: "Europe/Madrid" });
    expect(args.join(" ")).toContain("--at 2026-09-22T09:00");
    expect(args.join(" ")).toContain("--tz Europe/Madrid");
  });

  it("omits --tz when at carries a Z offset", () => {
    const args = buildCronAddArgs({ ...base, at: "2026-09-22T09:00Z" });
    expect(args).not.toContain("--tz");
  });

  it("omits --tz when at carries a numeric offset", () => {
    const args = buildCronAddArgs({ ...base, at: "2026-09-22T09:00+02:00" });
    expect(args).not.toContain("--tz");
  });

  it("forwards optional agent, message, description and disabled flags", () => {
    const args = buildCronAddArgs({
      ...base,
      schedule: "0 4 * * *",
      agentId: "main",
      message: "hello",
      description: "desc",
      disabled: true,
    });
    expect(args.join(" ")).toContain("--agent main");
    expect(args.join(" ")).toContain("--message hello");
    expect(args.join(" ")).toContain("--description desc");
    expect(args).toContain("--disabled");
  });
});
