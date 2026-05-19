import { useState, useEffect, useRef, useCallback } from "react";

export interface GraphNode {
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

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  categories: string[];
}

// Category colors
export const CATEGORY_COLORS: Record<string, string> = {
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

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#94a3b8";
}

/** Node size based on link count */
export function getNodeRadius(node: GraphNode): number {
  return 4 + Math.min(node.linkCount * 1.5, 12);
}

export const controlBtnStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "6px 8px",
  cursor: "pointer",
  color: "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
};

export const filterBtnStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: "4px",
  border: "1px solid var(--border)",
  cursor: "pointer",
  fontSize: "11px",
  display: "flex",
  alignItems: "center",
};

export function useWikiGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const simulationRef = useRef<number | null>(null);

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

  return { graphData, loading, error, containerRef };
}
