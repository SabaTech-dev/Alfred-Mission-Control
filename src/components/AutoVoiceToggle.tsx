"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/i18n/provider";

interface AutoVoiceToggleProps {
  isEnabled: boolean;
  isSpeaking: boolean;
  onToggle: () => void;
}

export function AutoVoiceToggle({ isEnabled, isSpeaking, onToggle }: AutoVoiceToggleProps) {
  const { t } = useI18n();

  const label = isEnabled ? "Disable auto-voice" : "Enable auto-voice";

  return (
    <div className="inline-flex items-center gap-1">
      {isEnabled && isSpeaking && (
        <div
          data-testid="voice-wave"
          className="inline-flex items-end gap-0.5 h-4 mr-1"
          aria-hidden="true"
        >
          <span data-voice-bar className="w-0.5 bg-current rounded-full h-2" />
          <span data-voice-bar className="w-0.5 bg-current rounded-full h-3" />
          <span data-voice-bar className="w-0.5 bg-current rounded-full h-4" />
          <span data-voice-bar className="w-0.5 bg-current rounded-full h-3" />
          <span data-voice-bar className="w-0.5 bg-current rounded-full h-2" />
        </div>
      )}
      <button
        type="button"
        aria-pressed={isEnabled}
        aria-label={label}
        title={label}
        onClick={onToggle}
        className="inline-flex items-center justify-center rounded-md px-2 py-1 text-sm"
      >
        {isEnabled ? (
          <Volume2 className="w-4 h-4" />
        ) : (
          <VolumeX className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
