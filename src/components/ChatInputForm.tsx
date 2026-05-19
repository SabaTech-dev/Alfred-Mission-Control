"use client";

import { FormEvent } from "react";
import { Loader2, SendHorizonal } from "lucide-react";

import { useI18n } from "@/i18n/provider";

interface ChatInputFormProps {
  input: string;
  onInputChange: (value: string) => void;
  canSend: boolean;
  readOnly: boolean;
  sending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function ChatInputForm({
  input,
  onInputChange,
  canSend,
  readOnly,
  sending,
  onSubmit,
}: ChatInputFormProps) {
  const { t } = useI18n();

  return (
    <form onSubmit={onSubmit} className="border-t p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          className="min-h-[44px] flex-1 resize-y rounded-md px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
          disabled={readOnly || sending}
          placeholder={readOnly ? t("chat.readOnlyPlaceholder") : t("chat.placeholder")}
        />
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold"
          style={{
            backgroundColor: canSend ? "var(--accent)" : "var(--card-elevated)",
            color: canSend ? "var(--text-primary)" : "var(--text-muted)",
            border: "1px solid var(--border)",
          }}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
