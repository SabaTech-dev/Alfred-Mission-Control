import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AutoVoiceToggle } from "./AutoVoiceToggle";
import { I18nProvider } from "@/i18n/provider";

function renderToggle(props: Partial<React.ComponentProps<typeof AutoVoiceToggle>> = {}) {
  const onToggle = vi.fn();
  render(
    <I18nProvider>
      <AutoVoiceToggle
        isEnabled={false}
        isSpeaking={false}
        onToggle={onToggle}
        {...props}
      />
    </I18nProvider>,
  );
  return { onToggle };
}

describe("AutoVoiceToggle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("rendera un boton accesible", () => {
    renderToggle();
    const btn = screen.getByRole("button");
    expect(btn).toBeDefined();
  });

  it("muestra estado desactivado (aria-pressed=false) por defecto", () => {
    renderToggle({ isEnabled: false });
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("muestra estado activado (aria-pressed=true) cuando esta habilitado", () => {
    renderToggle({ isEnabled: true });
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("llama a onToggle al hacer click", () => {
    const { onToggle } = renderToggle();
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("no muestra el indicador de ondas cuando no esta reproduciendo", () => {
    renderToggle({ isEnabled: true, isSpeaking: false });
    expect(screen.queryByTestId("voice-wave")).toBeNull();
  });

  it("muestra el indicador de ondas cuando esta reproduciendo", () => {
    renderToggle({ isEnabled: true, isSpeaking: true });
    expect(screen.getByTestId("voice-wave")).toBeDefined();
  });

  it("el indicador de ondas tiene varias barras animadas", () => {
    renderToggle({ isEnabled: true, isSpeaking: true });
    const wave = screen.getByTestId("voice-wave");
    const bars = wave.querySelectorAll("[data-voice-bar]");
    expect(bars.length).toBeGreaterThanOrEqual(3);
  });
});
