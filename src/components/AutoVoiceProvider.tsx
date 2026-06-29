"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAutoVoice, type AutoVoiceMessage, type UseAutoVoiceResult } from "@/hooks/useAutoVoice";

interface AutoVoiceContextValue extends UseAutoVoiceResult {
  messages: AutoVoiceMessage[];
  setMessages: (messages: AutoVoiceMessage[]) => void;
}

const AutoVoiceContext = createContext<AutoVoiceContextValue | null>(null);

/**
 * Eleva el hook useAutoVoice al arbol del dashboard.
 *
 * - El TopBar consume el context para renderizar el toggle global.
 * - El panel de chat empuja los messages via setMessages para que el hook
 *   detecte y reproduzca las nuevas respuestas del asistente.
 */
export function AutoVoiceProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<AutoVoiceMessage[]>([]);
  const voice = useAutoVoice(messages);

  const value = useMemo<AutoVoiceContextValue>(
    () => ({
      ...voice,
      messages,
      setMessages,
    }),
    [
      voice.isEnabled,
      voice.isSpeaking,
      voice.isSupported,
      voice.toggle,
      voice.speak,
      voice.stop,
      messages,
    ],
  );

  return <AutoVoiceContext.Provider value={value}>{children}</AutoVoiceContext.Provider>;
}

export function useAutoVoiceContext(): AutoVoiceContextValue {
  const ctx = useContext(AutoVoiceContext);
  if (!ctx) {
    throw new Error("useAutoVoiceContext debe usarse dentro de <AutoVoiceProvider>");
  }
  return ctx;
}
