"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, Filter, RotateCcw } from "lucide-react";

interface GraphNode {
  id: string;
  title: string;
  path: string;
  category: string;
  linkCount: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  categories: string[];
}

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  root: "#6366f1",
  agents: "#f59e0b",
  devops: "#10b981",
  services: "#3b82f6",
  architecture: "#8b5cf6",
  guides: "#ec4899",
  projects: "#14b8a6",
  tools: "#f97316",
  learning: "#06b6d4",
  research: "#84cc16",
  prompts: "#e11d48",
  workflows: "#64748b",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#94a3b8";
}

interface WikiGraphViewProps {
  onNodeClick?: (path: string) => void;
}

export default function WikiGraphView({ onNodeClick }: WikiGraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });
  const simulationRef = useRef<any>(null);

  // Fetch graph data
  useEffect(() => {
    fetch("/api/wiki/graph")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setGraphData(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Force simulation
  const runSimulation = useCallback(() => {
    if (!graphData || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 500;
    const centerX = width / 2;
    const centerY = height / 2;

    const nodes = graphData.nodes.map((n) => ({
      ...n,
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const edges = graphData.edges
      .map((e) => ({
        source: typeof e.source === "string" ? e.source : (e.source as GraphNode).id,
        target: typeof e.target === "string" ? e.target : (e.target as GraphNode).id,
      }))
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target));

    // Simple force simulation
    const alpha = 0.3;
    const alphaDecay = 0.005;
    const chargeStrength = -80;
    const linkDistance = 50;
    let currentAlpha = alpha;

    const tick = () => {
      if (currentAlpha < 0.001) return;

      // Charge repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[j].x || 0) - (nodes[i].x || 0);
          const dy = (nodes[j].y || 0) - (nodes[i].y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (chargeStrength * currentAlpha) / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx = (nodes[i].vx || 0) - fx;
          nodes[i].vy = (nodes[i].vy || 0) - fy;
          nodes[j].vx = (nodes[j].vx || 0) + fx;
          nodes[j].vy = (nodes[j].vy || 0) + fy;
        }
      }

      // Link attraction
      for (const edge of edges) {
        const source = nodeMap.get(edge.source)!;
        const target = nodeMap.get(edge.target)!;
        const dx = (target.x || 0) - (source.x || 0);
        const dy = (target.y || 0) - (source.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - linkDistance) * 0.05 * currentAlpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        source.vx = (source.vx || 0) + fx;
        source.vy = (source.vy || 0) + fy;
        target.vx = (target.vx || 0) - fx;
        target.vy = (target.vy || 0) - fy;
      }

      // Center gravity
      for (const node of nodes) {
        node.vx = (node.vx || 0) + (centerX - (node.x || 0)) * 0.01 * currentAlpha;
        node.vy = (node.vy || 0) + (centerY - (node.y || 0)) * 0.01 * currentAlpha;
        // Damping
        node.vx = (node.vx || 0) * 0.6;
        node.vy = (node.vy || 0) * 0.6;
        node.x = (node.x || 0) + (node.vx || 0);
        node.y = (node.y || 0) + (node.vy || 0);
      }

      currentAlpha -= alphaDecay;
    };

    // Run simulation in steps
    let frame = 0;
    const maxFrames = 300;

    const runFrame = () => {
      for (let i = 0; i < 3; i++) tick();
      frame++;
      setGraphData({ ...graphData, nodes: [...nodes], edges: graphData.edges });
      if (frame < maxFrames && currentAlpha >= 0.001) {
        simulationRef.current = requestAnimationFrame(runFrame);
      }
    };

    simulationRef.current = requestAnimationFrame(runFrame);
  }, [graphData]);

  useEffect(() => {
    if (graphData) {
      runSimulation();
    }
    return () => {
      if (simulationRef.current) cancelAnimationFrame(simulationRef.current);
    };
  }, [graphData?.nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.3, 5));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.3, 0.2));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    panStartOffset.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      setPan({
        x: panStartOffset.current.x + (e.clientX - panStart.current.x),
        y: panStartOffset.current.y + (e.clientY - panStart.current.y),
      });
    }
    if (hoveredNode && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 12 });
    }
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.2, Math.min(5, z * delta)));
  };

  // Filtered data
  const filteredNodes = selectedCategory
    ? graphData?.nodes.filter((n) => n.category === selectedCategory) || []
    : graphData?.nodes || [];

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges =
    graphData?.edges.filter(
      (e) =>
        filteredNodeIds.has(typeof e.source === "string" ? e.source : (e.source as GraphNode).id) &&
        filteredNodeIds.has(typeof e.target === "string" ? e.target : (e.target as GraphNode).id)
    ) || [];

  // Node size based on link count
  const getNodeRadius = (node: GraphNode) => {
    const base = 4;
    return base + Math.min(node.linkCount * 1.5, 12);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "500px", color: "var(--text-secondary)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", margin: "0 auto 12px" }} />
          <p style={{ fontSize: "13px" }}>Cargando grafo de conexiones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", color: "var(--red-400)", textAlign: "center" }}>
        <p>Error cargando grafo: {error}</p>
      </div>
    );
  }

  if (!graphData) return null;

  const width = containerRef.current?.clientWidth || 800;
  const height = 500;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "12px" }}>
      {/* Controls bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {/* Zoom controls */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={handleZoomIn} title="Zoom in" style={controlBtnStyle}>
            <ZoomIn size={14} />
          </button>
          <button onClick={handleZoomOut} title="Zoom out" style={controlBtnStyle}>
            <ZoomOut size={14} />
          </button>
          <button onClick={handleReset} title="Reset view" style={controlBtnStyle}>
            <RotateCcw size={14} />
          </button>
        </div>

        <span style={{ fontSize: "11px", color: "var(--text-secondary)", minWidth: "60px" }}>
          {Math.round(zoom * 100)}%
        </span>

        <div style={{ width: "1px", height: "20px", background: "var(--border)" }} />

        {/* Category filter */}
        <Filter size={14} style={{ color: "var(--text-secondary)" }} />
        <button
          onClick={() => setSelectedCategory(null)}
          style={{
            ...filterBtnStyle,
            background: !selectedCategory ? "var(--accent)" : "var(--bg-secondary)",
            color: !selectedCategory ? "#fff" : "var(--text-secondary)",
          }}
        >
          All ({graphData.nodes.length})
        </button>
        {graphData.categories.map((cat) => {
          const count = graphData.nodes.filter((n) => n.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              style={{
                ...filterBtnStyle,
                background: selectedCategory === cat ? getCategoryColor(cat) : "var(--bg-secondary)",
                color: selectedCategory === cat ? "#fff" : "var(--text-secondary)",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: getCategoryColor(cat),
                  marginRight: "4px",
                }}
              />
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-secondary)" }}>
        <span>{filteredNodes.length} notas</span>
        <span>{filteredEdges.length} conexiones</span>
        <span>{graphData.categories.length} categorías</span>
      </div>

      {/* Graph container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: "500px",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          overflow: "hidden",
          position: "relative",
          background: "var(--card)",
          cursor: isPanning.current ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${width / zoom} ${height / zoom}`}
          style={{ display: "block" }}
        >
          {/* Edges */}
          <g stroke="var(--border)" strokeWidth="0.5" opacity="0.4">
            {filteredEdges.map((edge, i) => {
              const sourceId = typeof edge.source === "string" ? edge.source : (edge.source as GraphNode).id;
              const targetId = typeof edge.target === "string" ? edge.target : (edge.target as GraphNode).id;
              const sourceNode = graphData.nodes.find((n) => n.id === sourceId);
              const targetNode = graphData.nodes.find((n) => n.id === targetId);
              if (!sourceNode?.x || !targetNode?.x) return null;
              return (
                <line
                  key={i}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {filteredNodes.map((node) => {
              if (!node.x || !node.y) return null;
              const radius = getNodeRadius(node);
              const color = getCategoryColor(node.category);
              const isHovered = hoveredNode?.id === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNodeClick) onNodeClick(node.path);
                  }}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    r={radius + (isHovered ? 3 : 0)}
                    fill={color}
                    opacity={isHovered ? 1 : 0.7}
                    stroke={isHovered ? "#fff" : "none"}
                    strokeWidth={isHovered ? 2 : 0}
                  />
                  {/* Show title for important nodes (high link count) or hovered */}
                  {(node.linkCount >= 4 || isHovered) && (
                    <text
                      x={radius + 4}
                      y={4}
                      fontSize={isHovered ? "11px" : "9px"}
                      fill={isHovered ? "var(--text-primary)" : "var(--text-secondary)"}
                      fontWeight={isHovered ? 600 : 400}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.title.length > 25 ? node.title.slice(0, 22) + "..." : node.title}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {hoveredNode && (
          <div
            style={{
              position: "absolute",
              left: tooltipPos.x,
              top: tooltipPos.y,
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "12px",
              pointerEvents: "none",
              zIndex: 10,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              maxWidth: "250px",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
              {hoveredNode.title}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: getCategoryColor(hoveredNode.category),
                  marginRight: "4px",
                }}
              />
              {hoveredNode.category} · {hoveredNode.linkCount} conexiones
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "11px", color: "var(--text-secondary)" }}>
        {graphData.categories.map((cat) => (
          <span key={cat} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: getCategoryColor(cat),
              }}
            />
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}

const controlBtnStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "6px 8px",
  cursor: "pointer",
  color: "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
};

const filterBtnStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "4px",
  border: "1px solid var(--border)",
  cursor: "pointer",
  fontSize: "11px",
  display: "flex",
  alignItems: "center",
};
