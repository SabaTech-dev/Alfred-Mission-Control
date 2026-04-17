"use client";

interface BreadcrumbsProps {
  path: string;
  onNavigate: (path: string) => void;
  prefix?: string;
}

export function Breadcrumbs({ path, onNavigate, prefix }: BreadcrumbsProps) {
  const segments = path.split("/").filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm" style={{ color: "var(--text-secondary)" }}>
      <button
        type="button"
        onClick={() => onNavigate("")}
        className="font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {prefix || "/"}
      </button>
      {segments.map((segment, index) => {
        const nextPath = segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;

        return (
          <div key={`${segment}-${index}`} className="flex items-center gap-1">
            <span style={{ color: "var(--text-muted)" }}>/</span>
            {isLast ? (
              <span style={{ color: "var(--text-primary)" }}>{segment}</span>
            ) : (
              <button type="button" onClick={() => onNavigate(nextPath)}>
                {segment}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}