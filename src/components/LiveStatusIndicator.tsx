"use client";

import { useEffect, useRef } from "react";

/**
 * LiveStatusIndicator — Animated status dot with pulsing ring.
 *
 * Modes:
 * - "pulse"    : expanding ring (default)
 * - "blink"    : fade in/out
 * - "wave"     : three-dot wave animation
 */

interface LiveStatusIndicatorProps {
  color: string;
  size?: number;
  mode?: "pulse" | "blink" | "wave";
  label?: string;
  speed?: number; // ms per cycle
}

export function LiveStatusIndicator({
  color,
  size = 10,
  mode = "pulse",
  label,
  speed = 2000,
}: LiveStatusIndicatorProps) {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dotRef.current;
    if (!el) return;

    // Clean previous animations
    el.getAnimations().forEach((a) => a.cancel());

    if (mode === "pulse") {
      el.animate(
        [
          { transform: "scale(1)", opacity: 1, boxShadow: `0 0 0 0 ${color}60` },
          { transform: "scale(1)", opacity: 1, boxShadow: `0 0 0 ${size * 0.8}px ${color}00` },
        ],
        { duration: speed, iterations: Infinity, easing: "ease-out" },
      );
    } else if (mode === "blink") {
      el.animate(
        [
          { opacity: 1 },
          { opacity: 0.3 },
          { opacity: 1 },
        ],
        { duration: speed, iterations: Infinity, easing: "ease-in-out" },
      );
    }
    // "wave" uses CSS keyframes via three dots — no JS animation needed
  }, [color, size, mode, speed]);

  if (mode === "wave") {
    return (
      <div className="flex items-center gap-1" aria-label={label}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="rounded-full inline-block"
            style={{
              width: size * 0.6,
              height: size * 0.6,
              backgroundColor: color,
              animation: `liveWave 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes liveWave {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2" aria-label={label}>
      <div
        ref={dotRef}
        className="rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      {label && (
        <span className="text-xs font-medium" style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
}
