"use client";

import { useState, useRef } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Filter } from "lucide-react";
import {
  useWikiGraph,
  getCategoryColor,
  getNodeRadius,
  controlBtnStyle,
  filterBtnStyle,
  type GraphNode,
} from "@/hooks/useWikiGraph";

interface WikiGraphViewProps {
  onNodeClick?: (path: string) => void;
}

export function WikiGraphView({ onNodeClick }: WikiGraphViewProps) {
  const { graphData, loading, error, containerRef } = useWikiGraph();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.3, 5));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.3, 0.2));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

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

  const handleMouseUp = () => { isPanning.current = false; };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.2, Math.min(5, z * (e.deltaY > 0 ? 0.9 : 1.1))));
  };

  const filteredNodes = selectedCategory
    ? graphData?.nodes.filter((n) => n.category === selectedCategory) || []
    : graphData?.nodes || [];
  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = graphData?.edges.filter(
    (e) =>
      filteredNodeIds.has(typeof e.source === "string" ? e.source : (e.source as GraphNode).id) &&
      filteredNodeIds.has(typeof e.target === "string" ? e.target : (e.target as GraphNode).id)
  ) || [];

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
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={handleZoomIn} title="Zoom in" style={controlBtnStyle}><ZoomIn size={14} /></button>
          <button onClick={handleZoomOut} title="Zoom out" style={controlBtnStyle}><ZoomOut size={14} /></button>
          <button onClick={handleReset} title="Reset view" style={controlBtnStyle}><RotateCcw size={14} /></button>
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-secondary)", minWidth: "60px" }}>{Math.round(zoom * 100)}%</span>
        <div style={{ width: "1px", height: "20px", background: "var(--border)" }} />
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
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: getCategoryColor(cat), marginRight: "4px" }} />
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
          flex: 1, minHeight: "500px", border: "1px solid var(--border)", borderRadius: "8px",
          overflow: "hidden", position: "relative", background: "var(--card)",
          cursor: isPanning.current ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${width / zoom} ${height / zoom}`}
          style={{ display: "block" }}
        >
          <g stroke="var(--border)" strokeWidth="0.5" opacity="0.4">
            {filteredEdges.map((edge, i) => {
              const sourceId = typeof edge.source === "string" ? edge.source : (edge.source as GraphNode).id;
              const targetId = typeof edge.target === "string" ? edge.target : (edge.target as GraphNode).id;
              const sourceNode = graphData.nodes.find((n) => n.id === sourceId);
              const targetNode = graphData.nodes.find((n) => n.id === targetId);
              if (!sourceNode?.x || !targetNode?.x) return null;
              return <line key={i} x1={sourceNode.x} y1={sourceNode.y} x2={targetNode.x} y2={targetNode.y} />;
            })}
          </g>
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
                  onClick={(e) => { e.stopPropagation(); if (onNodeClick) onNodeClick(node.path); }}
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
                  {(node.linkCount >= 4 || isHovered) && (
                    <text
                      x={radius + 4} y={4}
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
          <div style={{
            position: "absolute", left: tooltipPos.x, top: tooltipPos.y,
            background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "6px",
            padding: "8px 12px", fontSize: "12px", pointerEvents: "none", zIndex: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)", maxWidth: "250px",
          }}>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>{hoveredNode.title}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: getCategoryColor(hoveredNode.category), marginRight: "4px" }} />
              {hoveredNode.category} · {hoveredNode.linkCount} conexiones
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "11px", color: "var(--text-secondary)" }}>
        {graphData.categories.map((cat) => (
          <span key={cat} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: getCategoryColor(cat) }} />
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}
