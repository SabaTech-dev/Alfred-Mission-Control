"use client";

import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";

type Messages = Record<string, unknown>;
const DICTIONARY: Record<string, Messages> = { en, es };

function getByPath(obj: Messages, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (typeof acc === "object" && acc !== null && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function interpolate(text: string, values?: Record<string, string | number>) {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

function detectLocale(): string {
  if (typeof window === "undefined") return "en";
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith("alfred-locale="))
    ?.split("=")[1];
  if (cookie === "en" || cookie === "es") return cookie;
  return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

function getT(locale: string) {
  const messages = DICTIONARY[locale] || DICTIONARY.en;
  return (key: string, values?: Record<string, string | number>) => {
    const raw = getByPath(messages, key) ?? getByPath(DICTIONARY.en, key) ?? key;
    return typeof raw === "string" ? interpolate(raw, values) : key;
  };
}

export default function NotFound() {
  const locale = typeof window !== "undefined" ? detectLocale() : "en";
  const t = getT(locale);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div 
        className="max-w-md w-full text-center p-8 rounded-2xl"
        style={{ 
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)"
        }}
      >
        <div 
          className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--warning-soft)" }}
        >
          <FileQuestion 
            className="w-8 h-8" 
            style={{ color: "var(--warning)" }}
          />
        </div>

        <h1 
          className="text-2xl font-bold mb-2"
          style={{ 
            fontFamily: "var(--font-heading)",
            color: "var(--text-primary)"
          }}
        >
          {t("errors.notFound.title")}
        </h1>

        <p 
          className="mb-8"
          style={{ color: "var(--text-muted)" }}
        >
          {t("errors.notFound.description")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-colors"
            style={{ 
              backgroundColor: "var(--accent)",
              color: "white"
            }}
          >
            <Home className="w-4 h-4" />
            {t("errors.notFound.goHome")}
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors"
            style={{ 
              backgroundColor: "var(--surface-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)"
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t("errors.notFound.goBack")}
          </button>
        </div>
      </div>
    </div>
  );
}
