import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression tests for /api/notifications.
 *
 * Context: QA reported /api/notifications among the endpoints returning 500.
 * As with /api/agents, the route itself was healthy after the sqlite migration
 * — notifications is filesystem-backed, not sqlite-backed — but we had no unit
 * coverage. These tests pin the GET / POST / PATCH / DELETE contract so a
 * future regression (e.g. someone swapping fs/promises for a sqlite store and
 * breaking the empty-state path) surfaces in CI.
 *
 * The fs/promises module is mocked so the tests never touch real disk.
 */

const readFileMock = vi.fn();
const writeFileMock = vi.fn();
const accessMock = vi.fn();
const mkdirMock = vi.fn();

// The route uses `import fs from 'fs/promises'` (default import), so the mock
// must expose a `default` whose members delegate to our per-function mocks.
// Named exports are kept too so any future `import { readFile }` keeps working.
const fsApi = {
  readFile: (...args: unknown[]) => readFileMock(...args),
  writeFile: (...args: unknown[]) => writeFileMock(...args),
  access: (...args: unknown[]) => accessMock(...args),
  mkdir: (...args: unknown[]) => mkdirMock(...args),
};

vi.mock("fs/promises", () => ({
  ...fsApi,
  default: fsApi,
}));

// rateLimiter is exercised by POST; default to "always allowed" so the POST
// happy path can be tested without nosy into the limiter's internals.
vi.mock("@/lib/rate-limiter", () => ({
  rateLimiter: {
    isAllowed: () => ({ allowed: true, remaining: 9, resetIn: 0 }),
  },
}));

function makeRequest(url: string, init?: { body?: unknown; method?: string }): Request {
  const req = new Request(url, {
    method: init?.method ?? "GET",
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
  return req;
}

async function callGet(url = "http://localhost/api/notifications") {
  const route = await import("./route");
  return route.GET(makeRequest(url) as any);
}

async function callPost(body: unknown, url = "http://localhost/api/notifications") {
  const route = await import("./route");
  return route.POST(makeRequest(url, { body, method: "POST" }) as any);
}

async function callPatch(body: unknown) {
  const route = await import("./route");
  return route.PATCH(makeRequest("http://localhost/api/notifications", { body, method: "PATCH" }) as any);
}

async function callDelete(url: string) {
  const route = await import("./route");
  return route.DELETE(makeRequest(url, { method: "DELETE" }) as any);
}

describe("/api/notifications GET", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 with an empty list when the data file does not exist", async () => {
    // ENOENT is the canonical "no notifications yet" state; the route must
    // treat it as an empty array, not a 500.
    const notFound = new Error("ENOENT") as NodeJS.ErrnoException;
    notFound.code = "ENOENT";
    readFileMock.mockRejectedValue(notFound);

    const response = await callGet();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.notifications).toEqual([]);
    expect(data.unreadCount).toBe(0);
  });

  it("returns 200 with stored notifications sorted newest-first", async () => {
    const stored = [
      { id: "old", timestamp: "2026-01-01T00:00:00.000Z", title: "Old", message: "m", type: "info", read: false },
      { id: "new", timestamp: "2026-06-30T00:00:00.000Z", title: "New", message: "m", type: "info", read: false },
    ];
    readFileMock.mockResolvedValue(JSON.stringify(stored));

    const response = await callGet();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.notifications).toHaveLength(2);
    expect(data.notifications[0].id).toBe("new");
    expect(data.unreadCount).toBe(2);
  });

  it("respects the unread=true filter and limit query param", async () => {
    const stored = [
      { id: "a", timestamp: "2026-06-30T00:00:00.000Z", title: "A", message: "m", type: "info", read: false },
      { id: "b", timestamp: "2026-06-29T00:00:00.000Z", title: "B", message: "m", type: "info", read: true },
      { id: "c", timestamp: "2026-06-28T00:00:00.000Z", title: "C", message: "m", type: "info", read: false },
    ];
    readFileMock.mockResolvedValue(JSON.stringify(stored));

    const response = await callGet("http://localhost/api/notifications?unread=true&limit=1");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0].id).toBe("a");
  });
});

describe("/api/notifications POST", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Directory exists during POST save flow.
    accessMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 201 and persists a new notification", async () => {
    readFileMock.mockResolvedValue("[]");

    const response = await callPost({ title: "Build OK", message: "All green", type: "success" });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeTruthy();
    expect(data.title).toBe("Build OK");
    expect(data.read).toBe(false);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const written = JSON.parse((writeFileMock.mock.calls[0] as unknown[])[1] as string);
    expect(written).toHaveLength(1);
    expect(written[0].title).toBe("Build OK");
  });

  it("returns 400 when title is missing", async () => {
    const response = await callPost({ message: "no title" });
    expect(response.status).toBe(400);
  });

  it("returns 400 when type is invalid", async () => {
    const response = await callPost({ title: "T", message: "m", type: "bogus" });
    expect(response.status).toBe(400);
  });

  it("trims the store to the last 100 entries", async () => {
    const stored = Array.from({ length: 100 }, (_, i) => ({
      id: `old-${i}`,
      timestamp: "2026-01-01T00:00:00.000Z",
      title: `Old ${i}`,
      message: "m",
      type: "info",
      read: true,
    }));
    readFileMock.mockResolvedValue(JSON.stringify(stored));

    const response = await callPost({ title: "New", message: "m" });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe("New");
    const written = JSON.parse((writeFileMock.mock.calls[0] as unknown[])[1] as string);
    expect(written).toHaveLength(100);
    expect(written[0].title).toBe("New");
  });
});

describe("/api/notifications PATCH", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("marks a single notification as read by id", async () => {
    const stored = [
      { id: "n1", timestamp: "2026-06-30T00:00:00.000Z", title: "N1", message: "m", type: "info", read: false },
    ];
    readFileMock.mockResolvedValue(JSON.stringify(stored));

    const response = await callPatch({ id: "n1", read: true });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.read).toBe(true);
  });

  it("returns 404 when the id is not found", async () => {
    readFileMock.mockResolvedValue("[]");

    const response = await callPatch({ id: "missing", read: true });
    expect(response.status).toBe(404);
  });

  it("marks all as read when action=markAllRead", async () => {
    const stored = [
      { id: "a", timestamp: "2026-06-30T00:00:00.000Z", title: "A", message: "m", type: "info", read: false },
      { id: "b", timestamp: "2026-06-29T00:00:00.000Z", title: "B", message: "m", type: "info", read: false },
    ];
    readFileMock.mockResolvedValue(JSON.stringify(stored));

    const response = await callPatch({ action: "markAllRead" });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.updated).toBe(2);
    const written = JSON.parse((writeFileMock.mock.calls[0] as unknown[])[1] as string);
    expect(written.every((n: { read: boolean }) => n.read)).toBe(true);
  });
});

describe("/api/notifications DELETE", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes a single notification by id", async () => {
    const stored = [
      { id: "n1", timestamp: "2026-06-30T00:00:00.000Z", title: "N1", message: "m", type: "info", read: false },
      { id: "n2", timestamp: "2026-06-29T00:00:00.000Z", title: "N2", message: "m", type: "info", read: false },
    ];
    readFileMock.mockResolvedValue(JSON.stringify(stored));

    const response = await callDelete("http://localhost/api/notifications?id=n1");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    const written = JSON.parse((writeFileMock.mock.calls[0] as unknown[])[1] as string);
    expect(written).toHaveLength(1);
    expect(written[0].id).toBe("n2");
  });

  it("clears all read notifications when action=clearRead", async () => {
    const stored = [
      { id: "a", timestamp: "2026-06-30T00:00:00.000Z", title: "A", message: "m", type: "info", read: true },
      { id: "b", timestamp: "2026-06-29T00:00:00.000Z", title: "B", message: "m", type: "info", read: false },
    ];
    readFileMock.mockResolvedValue(JSON.stringify(stored));

    const response = await callDelete("http://localhost/api/notifications?action=clearRead");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(1);
    const written = JSON.parse((writeFileMock.mock.calls[0] as unknown[])[1] as string);
    expect(written).toHaveLength(1);
    expect(written[0].id).toBe("b");
  });

  it("returns 404 when the id is not found", async () => {
    readFileMock.mockResolvedValue("[]");

    const response = await callDelete("http://localhost/api/notifications?id=missing");
    expect(response.status).toBe(404);
  });
});
