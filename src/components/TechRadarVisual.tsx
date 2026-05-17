"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface RadarTech {
  id: string;
  name: string;
  quadrant: "Adopt" | "Trial" | "Assess" | "Hold";
  ring: number;
  description: string;
  category: string;
  license?: string;
  version?: string;
  purpose?: string;
  note?: string;
}

interface RadarStats {
  total: number;
  byQuadrant: Record<string, number>;
  byCategory: Record<string, number>;
}

interface Props {
  data: { technologies: RadarTech[]; stats: RadarStats } | null;
  loading: boolean;
  onRefresh: () => void;
}

const QUADRANT_COLORS: Record<string, string> = {
  Adopt: "#22c55e",
  Trial: "#fbbf24",
  Assess: "#60a5fa",
  Hold: "#ef4444",
};

const QUADRANT_ANGLES: Record<string, { start: number; end: number }> = {
  Adopt: { start: -Math.PI / 2, end: 0 },
  Trial: { start: 0, end: Math.PI / 2 },
  Assess: { start: Math.PI / 2, end: Math.PI },
  Hold: { start: Math.PI, end: (3 * Math.PI) / 2 },
};

const CATEGORY_COLORS: Record<string, string> = {
  framework: "#a78bfa",
  tool: "#34d399",
  language: "#f97316",
  platform: "#ec4899",
};

const RING_LABELS = ["", "Inner", "Mid-Inner", "Mid-Outer", "Outer"];

export default function TechRadarVisual({ data, loading, onRefresh }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<RadarTech | null>(null);
  const [hovered, setHovered] = useState<RadarTech | null>(null);
  const [filterQuadrant, setFilterQuadrant] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [techPositions, setTechPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  const filteredTech = useCallback(() => {
    if (!data) return [];
    return data.technologies.filter(t => {
      if (filterQuadrant !== "all" && t.quadrant !== filterQuadrant) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data, filterQuadrant, filterCategory, searchQuery]);

  // Draw radar
  useEffect(() => {
    const container = canvasRef.current;
    if (!container || !data) return;

    const techs = filteredTech();
    const size = Math.min(container.clientWidth, 600);
    if (size <= 0) return;

    const cx = size / 2;
    const cy = size / 2;
    const maxRadius = size / 2 - 40;
    const rings = [maxRadius * 0.25, maxRadius * 0.5, maxRadius * 0.75, maxRadius];

    const positions = new Map<string, { x: number; y: number }>();

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.style.maxWidth = "100%";

    // Background
    const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bgCircle.setAttribute("cx", String(cx));
    bgCircle.setAttribute("cy", String(cy));
    bgCircle.setAttribute("r", String(maxRadius));
    bgCircle.setAttribute("fill", "var(--card-elevated, #1a1a2e)");
    bgCircle.setAttribute("stroke", "var(--border, #333)");
    bgCircle.setAttribute("stroke-width", "1");
    svg.appendChild(bgCircle);

    // Quadrant backgrounds
    const quadrantOrder = ["Adopt", "Trial", "Assess", "Hold"];
    
    // Quadrant labels
    for (const q of quadrantOrder) {
      const angles = QUADRANT_ANGLES[q];
      const x1 = cx + maxRadius * Math.cos(angles.start);
      const y1 = cy + maxRadius * Math.sin(angles.start);
      const x2 = cx + maxRadius * Math.cos(angles.end);
      const y2 = cy + maxRadius * Math.sin(angles.end);
      const largeArc = (angles.end - angles.start) > Math.PI ? 1 : 0;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${cx} ${cy} L ${x1} ${y1} A ${maxRadius} ${maxRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`);
      path.setAttribute("fill", QUADRANT_COLORS[q] + "08");
      path.setAttribute("stroke", "none");
      svg.appendChild(path);
      
      // Draw boundary lines at start and end
      for (const angle of [angles.start, angles.end]) {
        const ex = cx + maxRadius * Math.cos(angle);
        const ey = cy + maxRadius * Math.sin(angle);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(cx));
        line.setAttribute("y1", String(cy));
        line.setAttribute("x2", String(ex));
        line.setAttribute("y2", String(ey));
        line.setAttribute("stroke", "var(--border, #333)");
        line.setAttribute("stroke-width", "0.5");
        svg.appendChild(line);
      }
    }

    // Ring circles
    for (const r of rings) {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", String(r));
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", "var(--border, #333)");
      circle.setAttribute("stroke-width", "0.5");
      circle.setAttribute("stroke-dasharray", "4,4");
      svg.appendChild(circle);
    }

    // Ring circles

    // Quadrant labels
    for (const q of quadrantOrder) {
      const angles = QUADRANT_ANGLES[q];
      const midAngle = (angles.start + angles.end) / 2;
      const labelR = maxRadius + 22;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(lx));
      text.setAttribute("y", String(ly));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", QUADRANT_COLORS[q]);
      text.setAttribute("font-size", "12");
      text.setAttribute("font-weight", "bold");
      text.textContent = q;
      svg.appendChild(text);
    }

    // Ring labels (inner)
    const ringLabels = ["Adopted", "Trial", "Assess", "Watch"];
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      const labelAngle = -Math.PI / 4; // top-right diagonal for labels
      const lx = cx + (r - 10) * Math.cos(labelAngle);
      const ly = cy + (r - 10) * Math.sin(labelAngle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(lx));
      text.setAttribute("y", String(ly));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", "var(--text-muted, #888)");
      text.setAttribute("font-size", "8");
      text.textContent = ringLabels[i];
      svg.appendChild(text);
    }

    // Plot technologies
    const quadrantTechs: Record<string, RadarTech[]> = { Adopt: [], Trial: [], Assess: [], Hold: [] };
    for (const t of techs) {
      if (quadrantTechs[t.quadrant]) quadrantTechs[t.quadrant].push(t);
    }

    for (const q of quadrantOrder) {
      const qTechs = quadrantTechs[q] || [];
      const angles = QUADRANT_ANGLES[q];
      const ringIndex = q === "Adopt" ? 0 : q === "Trial" ? 1 : q === "Assess" ? 2 : 3;
      const innerR = ringIndex > 0 ? rings[ringIndex - 1] : 0;
      const outerR = rings[ringIndex];
      const midR = (innerR + outerR) / 2;
      const angleSpan = angles.end - angles.start;

      // Distribute in a grid-like pattern within the quadrant arc
      const cols = Math.ceil(Math.sqrt(qTechs.length));
      const rows = Math.ceil(qTechs.length / cols);

      qTechs.forEach((t, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;

        const rOffset = rows > 1 ? (row / (rows)) * (outerR - innerR) * 0.7 + innerR + (outerR - innerR) * 0.15 : midR;
        const aOffset = cols > 1 ? (col / (cols - 1)) * angleSpan * 0.7 + angles.start + angleSpan * 0.15 : (angles.start + angles.end) / 2;

        const tx = cx + rOffset * Math.cos(aOffset);
        const ty = cy + rOffset * Math.sin(aOffset);

        positions.set(t.id, { x: tx, y: ty });

        const catColor = CATEGORY_COLORS[t.category] || "#6b7280";
        const isSelected = selected?.id === t.id;
        const isHovered = hovered?.id === t.id;
        const dotRadius = isSelected ? 8 : isHovered ? 7 : 5;

        // Glow
        if (isSelected || isHovered) {
          const glow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          glow.setAttribute("cx", String(tx));
          glow.setAttribute("cy", String(ty));
          glow.setAttribute("r", String(dotRadius + 4));
          glow.setAttribute("fill", catColor + "33");
          svg.appendChild(glow);
        }

        // Dot
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", String(tx));
        dot.setAttribute("cy", String(ty));
        dot.setAttribute("r", String(dotRadius));
        dot.setAttribute("fill", catColor);
        dot.setAttribute("stroke", isSelected ? "#fff" : "var(--card, #111)");
        dot.setAttribute("stroke-width", isSelected ? "2" : "1");
        dot.setAttribute("cursor", "pointer");
        dot.setAttribute("data-id", t.id);

        // Tooltip title
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = `${t.name}\n${t.description}\nCategory: ${t.category} | License: ${t.license || "N/A"}`;
        dot.appendChild(title);

        dot.addEventListener("mouseenter", () => setHovered(t));
        dot.addEventListener("mouseleave", () => setHovered(null));
        dot.addEventListener("click", () => setSelected(prev => prev?.id === t.id ? null : t));

        svg.appendChild(dot);

        // Label for larger dots
        if (isSelected || isHovered) {
          const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.setAttribute("x", String(tx));
          label.setAttribute("y", String(ty - dotRadius - 4));
          label.setAttribute("text-anchor", "middle");
          label.setAttribute("fill", "var(--text-primary, #fff)");
          label.setAttribute("font-size", "10");
          label.setAttribute("font-weight", "600");
          label.textContent = t.name;
          svg.appendChild(label);
        }
      });
    }

    setTechPositions(positions);

    // Clear and append
    container.innerHTML = "";
    container.appendChild(svg);
  }, [data, filterQuadrant, filterCategory, searchQuery, selected, hovered, filteredTech]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading Tech Radar...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No radar data available</p>
        <button onClick={onRefresh} className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)" }}>
          Retry
        </button>
      </div>
    );
  }

  const techs = filteredTech();
  const categories = Object.keys(data.stats.byCategory).sort();

  return (
    <div>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {(["Adopt", "Trial", "Assess", "Hold"] as const).map(q => (
          <button
            key={q}
            onClick={() => setFilterQuadrant(filterQuadrant === q ? "all" : q)}
            className="rounded-xl p-3 text-left transition-all"
            style={{
              backgroundColor: filterQuadrant === q ? QUADRANT_COLORS[q] + "15" : "var(--card)",
              border: `1px solid ${filterQuadrant === q ? QUADRANT_COLORS[q] + "66" : "var(--border)"}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: QUADRANT_COLORS[q] }} />
              <span className="text-xs font-medium" style={{ color: QUADRANT_COLORS[q] }}>{q}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: QUADRANT_COLORS[q] }}>{data.stats.byQuadrant[q] || 0}</p>
          </button>
        ))}
      </div>

      {/* Category Legend + Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search technologies..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <div className="flex gap-1 flex-wrap items-center">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
              style={{
                backgroundColor: filterCategory === cat ? (CATEGORY_COLORS[cat] || "#6b7280") + "22" : "var(--card)",
                color: filterCategory === cat ? CATEGORY_COLORS[cat] || "#6b7280" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {cat} ({data.stats.byCategory[cat] || 0})
            </button>
          ))}
        </div>
        {(filterQuadrant !== "all" || filterCategory !== "all" || searchQuery) && (
          <button
            onClick={() => { setFilterQuadrant("all"); setFilterCategory("all"); setSearchQuery(""); }}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ color: "var(--accent)" }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>Categories:</span>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <span key={cat} className="flex items-center gap-1.5 capitalize">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {cat}
          </span>
        ))}
        <span className="ml-auto">Showing {techs.length} of {data.stats.total}</span>
      </div>

      {/* Radar + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar SVG */}
        <div className="lg:col-span-2 rounded-xl p-4 flex items-center justify-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div ref={canvasRef} style={{ width: "100%", maxWidth: 600, aspectRatio: "1" }} />
        </div>

        {/* Detail Panel */}
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          {selected ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{selected.name}</h3>
                <button onClick={() => setSelected(null)} className="text-xs px-2 py-1 rounded" style={{ color: "var(--text-muted)" }}>✕</button>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: QUADRANT_COLORS[selected.quadrant] + "15", color: QUADRANT_COLORS[selected.quadrant] }}>
                  {selected.quadrant}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full capitalize font-medium" style={{ backgroundColor: (CATEGORY_COLORS[selected.category] || "#6b7280") + "15", color: CATEGORY_COLORS[selected.category] || "#6b7280" }}>
                  {selected.category}
                </span>
                {selected.license && (
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-muted)" }}>
                    {selected.license}
                  </span>
                )}
              </div>

              {selected.version && (
                <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                  Version: <span style={{ color: "var(--text-primary)" }}>{selected.version}</span>
                </div>
              )}

              {selected.description && (
                <div className="mb-3">
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Purpose</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{selected.description}</p>
                </div>
              )}

              {selected.note && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Notes</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{selected.note}</p>
                </div>
              )}
            </div>
          ) : hovered ? (
            <div>
              <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>{hovered.name}</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: QUADRANT_COLORS[hovered.quadrant] + "15", color: QUADRANT_COLORS[hovered.quadrant] }}>
                  {hovered.quadrant}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full capitalize font-medium" style={{ backgroundColor: (CATEGORY_COLORS[hovered.category] || "#6b7280") + "15", color: CATEGORY_COLORS[hovered.category] || "#6b7280" }}>
                  {hovered.category}
                </span>
              </div>
              {hovered.description && (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{hovered.description}</p>
              )}
              <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>Click to see full details</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Click a technology on the radar to see details
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                {techs.length} technologies displayed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tech List (collapsible) */}
      <details className="mt-4 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <summary className="p-4 cursor-pointer text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          📋 Technology List ({techs.length})
        </summary>
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
          {techs.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="flex items-center gap-3 p-3 rounded-lg text-left transition-all"
              style={{
                backgroundColor: selected?.id === t.id ? "var(--card-elevated)" : "transparent",
                border: "1px solid var(--border)",
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[t.category] || "#6b7280" }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{t.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-medium" style={{ color: QUADRANT_COLORS[t.quadrant] }}>{t.quadrant}</span>
                  <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{t.description}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
