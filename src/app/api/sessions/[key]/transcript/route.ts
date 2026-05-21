import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { requireAgentOrSessionAuth } from "@/lib/auth-helpers";

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || "/home/ubuntu/.openclaw";

// Safe session key pattern: agent:main:* with allowed characters
const SAFE_SESSION_KEY_PATTERN = /^agent:[a-zA-Z0-9_\-]+:[a-zA-Z0-9_\-:./@]*$/;

function isValidSessionKey(key: string): boolean {
  if (!key || key.length === 0 || key.length > 255) {
    return false;
  }
  if (key.includes("..") || key.includes("\0")) {
    return false;
  }
  return SAFE_SESSION_KEY_PATTERN.test(key);
}

export const dynamic = "force-dynamic";

interface SessionInfo {
  sessionId: string;
  updatedAt?: number;
  [key: string]: unknown;
}

interface SessionsJson {
  [sessionKey: string]: SessionInfo;
}

interface JsonlMessage {
  type: string;
  id?: string;
  timestamp?: string;
  message?: {
    role: string;
    content: string | Array<{ type: string; text?: string; name?: string; input?: unknown; id?: string }>;
    timestamp?: number;
  };
  provider?: string;
  modelId?: string;
  customType?: string;
  data?: unknown;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  // Auth check
  const authResult = await requireAgentOrSessionAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    const { key } = await params;
    const sessionKey = decodeURIComponent(key);
    
    if (!isValidSessionKey(sessionKey)) {
      return NextResponse.json(
        { error: "Invalid session key" },
        { status: 400 }
      );
    }

    // Read sessions.json to map session key -> sessionId
    const sessionsJsonPath = join(OPENCLAW_DIR, "agents", "main", "sessions", "sessions.json");
    
    if (!existsSync(sessionsJsonPath)) {
      return NextResponse.json(
        { error: "Sessions database not found" },
        { status: 500 }
      );
    }

    let sessionsJson: SessionsJson;
    try {
      const sessionsContent = readFileSync(sessionsJsonPath, "utf-8");
      sessionsJson = JSON.parse(sessionsContent);
    } catch {
      return NextResponse.json(
        { error: "Failed to read sessions database" },
        { status: 500 }
      );
    }

    // Look up sessionId by session key
    const sessionInfo = sessionsJson[sessionKey];
    if (!sessionInfo || !sessionInfo.sessionId) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const sessionId = sessionInfo.sessionId;
    
    // Validate sessionId format (UUID)
    if (!/^[a-f0-9-]{36}$/.test(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 500 }
      );
    }

    // Build path to session JSONL file
    const sessionPath = join(OPENCLAW_DIR, "agents", "main", "sessions", `${sessionId}.jsonl`);
    
    if (!existsSync(sessionPath)) {
      return NextResponse.json(
        { error: "Session transcript not found" },
        { status: 404 }
      );
    }

    // Read and parse JSONL
    const content = readFileSync(sessionPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    
    let currentModel = "";
    
    const messages = lines
      .map((line, index) => {
        try {
          const data: JsonlMessage = JSON.parse(line);
          
          // Track model changes
          if (data.type === "model_change" && data.modelId) {
            currentModel = data.modelId;
          }
          
          // Only process message type entries
          if (data.type !== "message" || !data.message) {
            return null;
          }
          
          const msg = data.message;
          const role = msg.role;
          const timestamp = data.timestamp || new Date().toISOString();
          
          // Handle string content
          if (typeof msg.content === "string") {
            return {
              id: data.id || `msg-${index}`,
              type: role === "user" ? "user" : "assistant",
              role,
              content: msg.content,
              timestamp,
              model: currentModel || undefined,
            };
          }
          
          // Handle array content (blocks)
          if (Array.isArray(msg.content)) {
            const results: Array<{
              id: string;
              type: string;
              role: string;
              content: string;
              timestamp: string;
              model?: string;
              toolName?: string;
            }> = [];
            
            for (const block of msg.content) {
              if (block.type === "text" && block.text) {
                results.push({
                  id: (data.id || `msg-${index}`) + "-text",
                  type: role === "user" ? "user" : "assistant",
                  role,
                  content: block.text,
                  timestamp,
                  model: currentModel || undefined,
                });
              } else if (block.type === "tool_use" && block.name) {
                results.push({
                  id: block.id || (data.id || `msg-${index}`) + "-tool",
                  type: "tool_use",
                  role,
                  content: `${block.name}(${block.input ? JSON.stringify(block.input).slice(0, 200) : ""})`,
                  timestamp,
                  toolName: block.name,
                  model: currentModel || undefined,
                });
              } else if (block.type === "tool_result") {
                const resultContent = Array.isArray(block.text)
                  ? (block.text as Array<{ type: string; text?: string }>).map((b) => b.text || "").join("\n")
                  : (block.text as string) || "";
                results.push({
                  id: (data.id || `msg-${index}`) + "-result",
                  type: "tool_result",
                  role,
                  content: resultContent.slice(0, 500),
                  timestamp,
                  model: currentModel || undefined,
                });
              }
            }
            return results.length === 1 ? results[0] : results;
          }
          
          return null;
        } catch {
          return null;
        }
      })
      .filter((msg) => msg !== null)
      .flat();

    return NextResponse.json({ messages, total: messages.length });
  } catch (error) {
    console.error("Error reading transcript:", error);
    return NextResponse.json(
      { error: "Failed to read transcript" },
      { status: 500 }
    );
  }
}
