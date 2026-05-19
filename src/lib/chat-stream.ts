interface ErrorResponsePayload {
  code?: string;
  details?: string;
  message?: string;
  error?: string;
}

export async function getErrorMessage(response: Response): Promise<string | null> {
  const body = (await response.text()).trim();
  if (!body) {
    return null;
  }

  try {
    const parsed = JSON.parse(body) as ErrorResponsePayload;
    const message = typeof parsed.message === "string" && parsed.message.trim().length > 0
      ? parsed.message.trim()
      : typeof parsed.error === "string" && parsed.error.trim().length > 0
        ? parsed.error.trim()
        : null;
    const diagnostics: string[] = [];

    if (typeof parsed.code === "string" && parsed.code.trim().length > 0) {
      diagnostics.push(parsed.code.trim());
    }

    if (typeof parsed.details === "string" && parsed.details.trim().length > 0) {
      diagnostics.push(parsed.details.trim());
    }

    if (message) {
      return diagnostics.length > 0 ? `${message} (${diagnostics.join(" | ")})` : message;
    }

    if (diagnostics.length > 0) {
      return diagnostics.join(" | ");
    }

    return null;
  } catch {
    if (body.startsWith("<!DOCTYPE") || body.startsWith("<html")) {
      return null;
    }
    return body.slice(0, 180);
  }
}

export function mapGatewayScopeError(message: string, t: (key: string) => string): string {
  if (/missing scope:\s*operator\.write/i.test(message)) {
    return t("chat.errors.missingWriteScope");
  }

  return message;
}

interface StreamCallbacks {
  onDelta: (text: string) => void;
  onFinal: (text: string) => void;
  onDone: (history: Array<{ id: string; role: string; content: string; timestamp: string }>) => void;
}

/**
 * Parse an SSE stream from the chat API and invoke callbacks for each event.
 * @throws Error on non-OK responses, unexpected content types, or stream parse failures.
 */
export async function processChatStream(
  response: Response,
  callbacks: StreamCallbacks,
  t: (key: string) => string,
): Promise<void> {
  if (!response.body) {
    throw new Error(t("chat.errors.unexpectedResponse"));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const dataLines = chunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());

      if (dataLines.length === 0) {
        continue;
      }

      let payload: {
        type: string;
        text?: string;
        message?: string;
        history?: Array<{ id: string; role: string; content: string; timestamp: string }>;
      };

      try {
        payload = JSON.parse(dataLines.join("\n")) as typeof payload;
      } catch {
        throw new Error(t("chat.errors.streamFailed"));
      }

      if (payload.type === "assistant_delta") {
        callbacks.onDelta(payload.text ?? "");
      }

      if (payload.type === "assistant_final") {
        callbacks.onFinal(payload.text ?? "");
      }

      if (payload.type === "error") {
        throw new Error(payload.message ?? t("chat.errors.streamFailed"));
      }

      if (payload.type === "done") {
        callbacks.onDone(payload.history ?? []);
      }
    }
  }
}
