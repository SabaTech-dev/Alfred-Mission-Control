"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "mc-auto-voice-enabled";

export interface AutoVoiceMessage {
  id: string;
  role: string;
  content: string;
}

export interface UseAutoVoiceResult {
  isEnabled: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  toggle: () => void;
  speak: (text: string) => void;
  stop: () => void;
}

function readStoredEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function detectSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

/**
 * Hook de Auto-Voice.
 *
 * - Persiste el toggle on/off en localStorage.
 * - Usa la Web Speech API nativa (window.speechSynthesis), sin dependencias.
 * - Cuando se pasa `messages`, reproduce automaticamente la ultima respuesta
 *   nueva del asistente (no reproduce la carga inicial del historial).
 */
export function useAutoVoice(messages?: AutoVoiceMessage[]): UseAutoVoiceResult {
  const [isSupported] = useState<boolean>(detectSupport);
  const [isEnabled, setIsEnabled] = useState<boolean>(readStoredEnabled);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs para leer el estado mas reciente dentro de callbacks estables.
  const isEnabledRef = useRef(isEnabled);
  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance;
    if (!synth || !Utterance) return;
    if (!text.trim()) return;

    // Cortamos cualquier reproduccion en curso antes de encolar la nueva.
    synth.cancel();
    const utterance = new Utterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synth.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    setIsSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Almacenamiento no disponible: el estado en memoria sobrevive.
      }
      if (!next) stop();
      return next;
    });
  }, [stop]);

  // Auto-speak: detectar la ultima respuesta nueva del asistente.
  const lastSeenAssistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!messages || messages.length === 0) return;

    let lastAssistant: AutoVoiceMessage | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistant = messages[i];
        break;
      }
    }
    if (!lastAssistant) return;

    // La primera poblacion (carga inicial del historial) se registra sin hablar.
    if (lastSeenAssistantIdRef.current === null) {
      lastSeenAssistantIdRef.current = lastAssistant.id;
      return;
    }

    if (lastSeenAssistantIdRef.current !== lastAssistant.id) {
      lastSeenAssistantIdRef.current = lastAssistant.id;
      if (isEnabledRef.current) {
        speak(lastAssistant.content);
      }
    }
  }, [messages, speak]);

  // Detener la voz al desmontar para no dejar audio huerfano.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { isEnabled, isSpeaking, isSupported, toggle, speak, stop };
}
