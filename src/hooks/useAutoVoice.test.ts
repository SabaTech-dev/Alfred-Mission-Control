import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { renderHook } from "@testing-library/react";

import { useAutoVoice } from "./useAutoVoice";
import type { AutoVoiceMessage } from "./useAutoVoice";

/**
 * Mock tipado para SpeechSynthesisUtterance.
 * Captura los handlers onstart/onend/onerror para poder dispararlos desde el test.
 */
class MockUtterance {
  text: string;
  lang = "";
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: unknown = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

type MockFn = ReturnType<typeof vi.fn>;

interface SpeechSynthesisMock {
  speak: MockFn;
  cancel: MockFn;
  speaking: boolean;
  pending: boolean;
  paused: boolean;
}

function createSpeechSynthesisMock(): SpeechSynthesisMock {
  return {
    speak: vi.fn(),
    cancel: vi.fn(),
    speaking: false,
    pending: false,
    paused: false,
  };
}

// Referencia al mock activo (se (re)asigna en cada beforeEach).
let synth: SpeechSynthesisMock;

function installSpeechSynthesis(): SpeechSynthesisMock {
  const mock = createSpeechSynthesisMock();
  Object.defineProperty(window, "speechSynthesis", {
    value: mock,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    value: MockUtterance,
    configurable: true,
    writable: true,
  });
  return mock;
}

function removeSpeechSynthesis() {
  // @ts-expect-error — borramos para simular entornos sin soporte
  delete window.speechSynthesis;
  // @ts-expect-error — idem
  delete window.SpeechSynthesisUtterance;
}

const userMsg = (id: string, content: string): AutoVoiceMessage => ({ id, role: "user", content });
const assistantMsg = (id: string, content: string): AutoVoiceMessage => ({ id, role: "assistant", content });

describe("useAutoVoice", () => {
  beforeEach(() => {
    localStorage.clear();
    synth = installSpeechSynthesis();
  });

  afterEach(() => {
    removeSpeechSynthesis();
    vi.restoreAllMocks();
  });

  it("reporta soporte cuando SpeechSynthesis esta disponible", () => {
    const { result } = renderHook(() => useAutoVoice());
    expect(result.current.isSupported).toBe(true);
  });

  it("reporta falta de soporte cuando no hay SpeechSynthesis", () => {
    removeSpeechSynthesis();
    const { result } = renderHook(() => useAutoVoice());
    expect(result.current.isSupported).toBe(false);
  });

  it("arranca desactivado por defecto", () => {
    const { result } = renderHook(() => useAutoVoice());
    expect(result.current.isEnabled).toBe(false);
  });

  it("lee el estado inicial desde localStorage", () => {
    localStorage.setItem("mc-auto-voice-enabled", "true");
    const { result } = renderHook(() => useAutoVoice());
    expect(result.current.isEnabled).toBe(true);
  });

  it("toggle activa la voz y persiste en localStorage", () => {
    const { result } = renderHook(() => useAutoVoice());
    act(() => result.current.toggle());
    expect(result.current.isEnabled).toBe(true);
    expect(localStorage.getItem("mc-auto-voice-enabled")).toBe("true");
  });

  it("toggle desactiva la voz y persiste en localStorage", () => {
    localStorage.setItem("mc-auto-voice-enabled", "true");
    const { result } = renderHook(() => useAutoVoice());
    act(() => result.current.toggle());
    expect(result.current.isEnabled).toBe(false);
    expect(localStorage.getItem("mc-auto-voice-enabled")).toBe("false");
  });

  it("speak llama a speechSynthesis.speak con un utterance que contiene el texto", () => {
    const { result } = renderHook(() => useAutoVoice());
    act(() => result.current.speak("Hola mundo"));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const utterance = synth.speak.mock.calls[0][0] as MockUtterance;
    expect(utterance.text).toBe("Hola mundo");
  });

  it("speak cancela cualquier reproduccion previa antes de hablar", () => {
    const { result } = renderHook(() => useAutoVoice());
    act(() => result.current.speak("primero"));
    act(() => result.current.speak("segundo"));
    expect(synth.cancel).toHaveBeenCalledTimes(2);
  });

  it("speak no hace nada cuando no hay soporte", () => {
    removeSpeechSynthesis();
    const { result } = renderHook(() => useAutoVoice());
    act(() => result.current.speak("nada"));
    expect(result.current.isSupported).toBe(false);
  });

  it("isSpeaking pasa a true al iniciar y false al terminar", () => {
    const { result } = renderHook(() => useAutoVoice());
    let utterance: MockUtterance;
    act(() => {
      result.current.speak("hablando");
      utterance = synth.speak.mock.calls[0][0] as MockUtterance;
      utterance.onstart?.();
    });
    expect(result.current.isSpeaking).toBe(true);
    act(() => {
      utterance!.onend?.();
    });
    expect(result.current.isSpeaking).toBe(false);
  });

  it("isSpeaking vuelve a false ante un error de sintesis", () => {
    const { result } = renderHook(() => useAutoVoice());
    let utterance: MockUtterance;
    act(() => {
      result.current.speak("falla");
      utterance = synth.speak.mock.calls[0][0] as MockUtterance;
      utterance.onstart?.();
    });
    expect(result.current.isSpeaking).toBe(true);
    act(() => {
      utterance!.onerror?.({});
    });
    expect(result.current.isSpeaking).toBe(false);
  });

  it("stop llama a speechSynthesis.cancel", () => {
    const { result } = renderHook(() => useAutoVoice());
    act(() => result.current.stop());
    expect(synth.cancel).toHaveBeenCalledTimes(1);
  });

  // --- Auto-speak al recibir nueva respuesta del agente ---

  it("reproduce el ultimo mensaje del asistente cuando llega una respuesta nueva y esta activado", () => {
    const { result, rerender } = renderHook(({ messages }) => useAutoVoice(messages), {
      initialProps: { messages: [userMsg("u1", "hola"), assistantMsg("a1", "respuesta inicial")] as AutoVoiceMessage[] },
    });
    act(() => result.current.toggle());
    expect(result.current.isEnabled).toBe(true);

    rerender({ messages: [userMsg("u1", "hola"), assistantMsg("a1", "respuesta inicial"), assistantMsg("a2", "nueva respuesta")] });

    expect(synth.speak).toHaveBeenCalledTimes(1);
    const utterance = synth.speak.mock.calls[0][0] as MockUtterance;
    expect(utterance.text).toBe("nueva respuesta");
  });

  it("no reproduce nada en la carga inicial del historial", () => {
    renderHook(() => useAutoVoice([assistantMsg("a1", "historial previo")]));
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("no reproduce cuando esta desactivado", () => {
    const { rerender } = renderHook(({ messages }) => useAutoVoice(messages), {
      initialProps: { messages: [assistantMsg("a1", "uno")] as AutoVoiceMessage[] },
    });
    rerender({ messages: [assistantMsg("a1", "uno"), assistantMsg("a2", "dos")] });
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("no reproduce mensajes del usuario", () => {
    const { result, rerender } = renderHook(({ messages }) => useAutoVoice(messages), {
      initialProps: { messages: [] as AutoVoiceMessage[] },
    });
    act(() => result.current.toggle());
    rerender({ messages: [userMsg("u9", "mio")] });
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("no reproduce dos veces el mismo mensaje", () => {
    const { result, rerender } = renderHook(({ messages }) => useAutoVoice(messages), {
      initialProps: { messages: [assistantMsg("a1", "hola")] as AutoVoiceMessage[] },
    });
    act(() => result.current.toggle());
    rerender({ messages: [assistantMsg("a1", "hola"), assistantMsg("a2", "chau")] });
    expect(synth.speak).toHaveBeenCalledTimes(1);
    // Re-render con el mismo id no dispara nueva reproduccion
    rerender({ messages: [assistantMsg("a1", "hola"), assistantMsg("a2", "chau")] });
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });
});
