"use client";

import { type AgentState, type AgentStatus } from "./agentsConfig";

/**
 * Office3D Controls Overlay — orbit/FPS mode toggle and control hints.
 */
interface OfficeControlsOverlayProps {
  controlMode: "orbit" | "fps";
  onToggle: () => void;
}

export function OfficeControlsOverlay({ controlMode, onToggle }: OfficeControlsOverlayProps) {
  return (
    <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg backdrop-blur-sm">
      <h2 className="text-lg font-bold mb-2">🏢 The Office</h2>
      <div className="text-sm space-y-1 mb-3">
        <p>
          <strong>Mode: {controlMode === "orbit" ? "🖱️ Orbit" : "🎮 FPS"}</strong>
        </p>
        {controlMode === "orbit" ? (
          <>
            <p>🖱️ Mouse: Rotar vista</p>
            <p>🔄 Scroll: Zoom</p>
            <p>👆 Click: Seleccionar</p>
          </>
        ) : (
          <>
            <p>Click to lock cursor</p>
            <p>WASD/Arrows: Mover</p>
            <p>Space: Subir | Shift: Bajar</p>
            <p>Mouse: Mirar | ESC: Unlock</p>
          </>
        )}
      </div>
      <button
        onClick={onToggle}
        className="w-full bg-warning hover:bg-warning text-black font-bold py-2 px-3 rounded text-xs transition-colors"
      >
        Switch to {controlMode === "orbit" ? "FPS Mode" : "Orbit Mode"}
      </button>
    </div>
  );
}
