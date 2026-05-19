"use client";

import { Lock } from "lucide-react";

interface ConfigDataViewerProps {
  data: unknown;
  editable: boolean;
  path: string;
  onChange: (path: string, value: unknown) => void;
  depth?: number;
}

export function ConfigDataViewer({ data, editable, path, onChange, depth = 0 }: ConfigDataViewerProps) {
  if (data === null || data === undefined) {
    return (
      <span className="text-sm font-mono italic" style={{ color: "var(--text-muted)" }}>
        null
      </span>
    );
  }

  if (typeof data === "boolean") {
    if (editable) {
      return (
        <select
          value={String(data)}
          onChange={(e) => onChange(path, e.target.value === "true")}
          className="px-2 py-1 rounded text-sm font-mono"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }
    return (
      <span className="text-sm font-mono text-info">{String(data)}</span>
    );
  }

  if (typeof data === "number") {
    if (editable) {
      return (
        <input
          type="number"
          value={data}
          onChange={(e) => onChange(path, parseFloat(e.target.value) || 0)}
          className="px-2 py-1 rounded text-sm font-mono w-32"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
      );
    }
    return (
      <span className="text-sm font-mono text-purple-400">{data}</span>
    );
  }

  if (typeof data === "string") {
    const isMasked = data.includes("••••");
    const isLong = data.length > 50;

    if (editable && !isMasked) {
      return (
        <input
          type="text"
          value={data}
          onChange={(e) => onChange(path, e.target.value)}
          className={`px-2 py-1 rounded text-sm font-mono ${isLong ? "w-full" : "w-64"}`}
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
      );
    }

    return (
      <span className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>
        &quot;{data}&quot;
        {isMasked && <Lock className="inline w-3 h-3 ml-1" style={{ color: "var(--text-muted)" }} />}
      </span>
    );
  }

  if (Array.isArray(data)) {
    return (
      <div className="ml-4">
        <span style={{ color: "var(--text-muted)" }}>[</span>
        <div className="ml-4 space-y-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-sm font-mono min-w-[30px]" style={{ color: "var(--text-muted)" }}>
                {index}:
              </span>
              <ConfigDataViewer
                data={item}
                editable={editable}
                path={`${path}[${index}]`}
                onChange={onChange}
                depth={depth + 1}
              />
            </div>
          ))}
        </div>
        <span style={{ color: "var(--text-muted)" }}>]</span>
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);

    if (entries.length === 0) {
      return (
        <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
          {"{}"}
        </span>
      );
    }

    return (
      <div className={`space-y-2 ${depth > 0 ? "ml-4" : ""}`}>
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 flex-wrap">
            <span
              className="text-sm font-mono min-w-[120px] md:min-w-[180px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {key}:
            </span>
            <ConfigDataViewer
              data={value}
              editable={editable}
              path={`${path}.${key}`}
              onChange={onChange}
              depth={depth + 1}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <span className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>
      {String(data)}
    </span>
  );
}
