// --- React 19 act() fix (DEBE ir primero, antes que @testing-library) ---
//
// React 19 + Vitest 4 + Vite: @vitejs/plugin-react añade "react-server" a
// resolve conditions. react-dom/test-utils (CJS) require("react") internamente
// y resuelve a react-server (sin act). Esto rompe @testing-library/react.
//
// El fix real está en vitest.config.ts (plugin force-react-browser-build +
// conditions browser + deps inline). Si sigue fallando, cada test file
// debe añadir un vi.mock al inicio. Ver comment en vitest.config.ts.

import "@testing-library/jest-dom";
import { vi, afterEach } from "vitest";

// Node 22+ instala un `localStorage` nativo (experimental) en el global que,
// sin --localstorage-file, devuelve `undefined` y ademas impide que jsdom
// instale el suyo propio. Si detectamos que no hay uno funcional, plantamos
// un polyfill spec-compliant para que los hooks/componentes que lo usan
// funcionen igual que en el navegador.
function ensureLocalStorage() {
  const existing = (globalThis as { localStorage?: Storage }).localStorage;
  try {
    if (existing && typeof existing.setItem === "function") {
      existing.setItem("__ls_probe__", "1");
      existing.removeItem("__ls_probe__");
      return; // ya hay uno funcional
    }
  } catch {
    // sigue abajo
  }

  class LocalStoragePolyfill implements Storage {
    private store = new Map<string, string>();
    get length(): number { return this.store.size; }
    clear(): void { this.store.clear(); }
    getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
    key(index: number): string | null {
      const keys = Array.from(this.store.keys());
      return index >= 0 && index < keys.length ? keys[index]! : null;
    }
    removeItem(key: string): void { this.store.delete(key); }
    setItem(key: string, value: string): void { this.store.set(key, String(value)); }
  }

  const polyfill = new LocalStoragePolyfill();
  Object.defineProperty(globalThis, "localStorage", {
    value: polyfill,
    configurable: true,
    writable: true,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      value: polyfill,
      configurable: true,
      writable: true,
    });
  }
}
ensureLocalStorage();

// Set up environment variables for tests before any modules load
vi.stubEnv("JWT_SECRET", "test-secret-key-min-32-chars-long-12345");
vi.stubEnv("AUTH_SECRET", "test-auth-secret-key-min-32-chars-long");

vi.mock("server-only", () => ({}));

// Global cleanup after each test: reset activities-db singleton
afterEach(async () => {
  try {
    const activitiesDb = await import("@/lib/activities-db");
    if (activitiesDb.resetDbForTesting) {
      activitiesDb.resetDbForTesting();
    }
  } catch {
    // Ignore if activities-db hasn't been imported
  }
});

