import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST, DELETE } from "./route";
import fs from "fs";
import path from "path";

// Mock auth-helpers - all requests authenticated by default
vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn().mockResolvedValue({ authorized: true }),
  requireAgentOrSessionAuth: vi.fn().mockResolvedValue({ authorized: true }),
}));

const mockRequest = new Request("http://localhost:3000/api/system/backups");

const BACKUP_DIR = path.join(
  process.env.OPENCLAW_DIR || path.join(process.env.HOME || "/root", ".openclaw"),
  "backups"
);

const indexPath = path.join(BACKUP_DIR, "index.json");

describe("Backup System API", () => {
  beforeEach(() => {
    // Clean backup index before each test
    try {
      if (fs.existsSync(indexPath)) {
        fs.writeFileSync(indexPath, "[]");
      }
    } catch {
      // ignore
    }
  });

  it("GET /api/system/backups should return 200 with empty list", async () => {
    const response = await GET(mockRequest as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.backups).toBeDefined();
    expect(Array.isArray(data.backups)).toBe(true);
    expect(typeof data.total).toBe("number");
  });

  it("POST /api/system/backups should create backup with status completed", async () => {
    const response = await POST(mockRequest as any);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.status).toBe("completed");
    expect(typeof data.timestamp).toBe("string");
    expect(Array.isArray(data.components)).toBe(true);
    expect(typeof data.size_bytes).toBe("number");
  });

  it("GET after POST should show the created backup", async () => {
    await POST(mockRequest as any);
    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.backups[0].status).toBe("completed");
  });

  it("DELETE should remove backup by id", async () => {
    const createResp = await POST(mockRequest as any);
    const { id } = await createResp.json();

    const request = new Request(`http://localhost/api/system/backups?id=${id}`);
    const delResp = await DELETE(request);
    expect(delResp.status).toBe(200);

    const delData = await delResp.json();
    expect(delData.deleted).toBe(id);

    // Verify it's gone from list
    const listResp = await GET(mockRequest as any);
    const listData = await listResp.json();
    const found = listData.backups.find((b: { id: string }) => b.id === id);
    expect(found).toBeUndefined();
  });

  it("DELETE nonexistent backup should return 404", async () => {
    const request = new Request("http://localhost/api/system/backups?id=nonexistent-id");
    const response = await DELETE(request);
    expect(response.status).toBe(404);
  });

  it("DELETE without id should return 400", async () => {
    const request = new Request("http://localhost/api/system/backups");
    const response = await DELETE(request);
    expect(response.status).toBe(400);
  });

  it("should handle multiple backups", async () => {
    await POST(mockRequest as any);
    await POST(mockRequest as any);
    await POST(mockRequest as any);

    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(data.total).toBeGreaterThanOrEqual(3);
  });

  it("POST backup should have valid UUID id", async () => {
    const response = await POST(mockRequest as any);
    const data = await response.json();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(data.id).toMatch(uuidRegex);
  });
});
