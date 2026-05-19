"use client";

import { getModelDisplayName } from "@/lib/model-utils";
import { useState, useRef, useEffect } from "react";
import { DEPARTMENTS, type DepartmentId, groupAgentsByDepartment } from "@/lib/agent-auto-config";
import { type Agent, DepartmentCard } from "@/components/OrgTreeNode";

const DEPARTMENT_ORDER: DepartmentId[] = [
  "DEVELOPMENT", "SECURITY", "RESEARCH", "QA_TESTING", "DATA_EXTRACTION",
  "MEMORY_NOTES", "COMMUNICATION", "INFRASTRUCTURE", "ENTERTAINMENT", "GENERAL", "OTHER",
];

interface Connection {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
}

interface AgentOrganigramaProps {
  agents: Agent[];
}

export function AgentOrganigrama({ agents }: AgentOrganigramaProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const hqRef = useRef<HTMLDivElement>(null);
  const deptRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const rootAgent = agents.find((a) => a.id === "main") ||
    agents.reduce((best, a) =>
      ((a.allowAgents?.length || 0) > (best.allowAgents?.length || 0)) ? a : best, agents[0]);
  const rootAgentId = rootAgent?.id || null;
  const isAlfredRoot = rootAgentId === "main" || rootAgentId === "alfred";
  const alfredRoot = isAlfredRoot ? { ...rootAgent!, emoji: "🤖", name: "Alfred" } : rootAgent;

  const otherAgents = rootAgentId ? agents.filter((a) => a.id !== rootAgentId) : agents;
  const grouped = groupAgentsByDepartment(otherAgents);
  const departmentsWithAgents = DEPARTMENT_ORDER.filter((deptId) => grouped[deptId]?.length);

  const calculateConnections = (): Connection[] => {
    if (!containerRef.current || !hqRef.current) return [];
    const containerRect = containerRef.current.getBoundingClientRect();
    const hqRect = hqRef.current.getBoundingClientRect();
    const result: Connection[] = [];
    const hqX = hqRect.left + hqRect.width / 2 - containerRect.left;
    const hqY = hqRect.bottom - containerRect.top;
    for (const deptId of departmentsWithAgents) {
      const deptEl = deptRefs.current[deptId];
      if (!deptEl) continue;
      const deptRect = deptEl.getBoundingClientRect();
      result.push({
        id: `hq-${deptId}`,
        x1: hqX, y1: hqY,
        x2: deptRect.left + deptRect.width / 2 - containerRect.left,
        y2: deptRect.top - containerRect.top,
        color: rootAgent?.color || "#6366f1",
      });
    }
    return result;
  };

  useEffect(() => {
    const timer = setTimeout(() => setConnections(calculateConnections()), 200);
    return () => clearTimeout(timer);
  }, [agents, rootAgent, departmentsWithAgents]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleResize = () => setConnections(calculateConnections());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [departmentsWithAgents, rootAgent]); // eslint-disable-line react-hooks/exhaustive-deps

  if (agents.length === 0) {
    return <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>No agents configured</div>;
  }

  if (!rootAgent) {
    return (
      <div style={{ padding: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {DEPARTMENT_ORDER.map((deptId) => {
            const deptAgents = grouped[deptId];
            if (!deptAgents || deptAgents.length === 0) return null;
            return <DepartmentCard key={deptId} deptId={deptId} agents={deptAgents} hoveredId={hoveredId} setHoveredId={setHoveredId} />;
          })}
        </div>
      </div>
    );
  }

  const rootColor = isAlfredRoot ? "#6366f1" : rootAgent.color;

  return (
    <div ref={containerRef} style={{ padding: "1rem", position: "relative" }}>
      {/* SVG Layer */}
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, minHeight: "800px" }}>
        {connections.map((conn) => (
          <g key={conn.id}>
            <path
              d={`M ${conn.x1} ${conn.y1} C ${conn.x1} ${conn.y1 + 40}, ${conn.x2} ${conn.y2 - 40}, ${conn.x2} ${conn.y2}`}
              stroke={conn.color} strokeWidth="2" fill="none" strokeDasharray="6,4" opacity="0.5"
            />
            <circle cx={conn.x1} cy={conn.y1} r="4" fill={conn.color} opacity="0.6" />
            <circle cx={conn.x2} cy={conn.y2} r="4" fill={conn.color} opacity="0.6" />
          </g>
        ))}
      </svg>

      {/* HQ Section - Root Agent */}
      <div ref={hqRef} style={{ marginBottom: "80px", position: "relative", zIndex: 1, maxWidth: "500px", marginLeft: "auto", marginRight: "auto" }}>
        <div style={{
          backgroundColor: `${rootColor}08`, borderRadius: "16px",
          border: `2px solid ${rootColor}`, overflow: "hidden",
          boxShadow: `0 4px 20px ${rootColor}20`,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem",
            backgroundColor: `${rootColor}15`, borderBottom: `1px solid ${rootColor}20`,
          }}>
            <span style={{ fontSize: "1.5rem" }}>{alfredRoot?.emoji || rootAgent.emoji}</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: alfredRoot?.color || rootAgent.color }}>
                {alfredRoot?.name || rootAgent.name}
                <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>{isAlfredRoot ? " (CEO Agent / Orquestador)" : " (HQ)"}</span>
              </h3>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {rootAgent.allowAgents?.length || 0} subagent{(rootAgent.allowAgents?.length || 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div style={{ padding: "0.5rem 1rem", fontSize: "0.7rem", color: "var(--text-muted)", backgroundColor: "var(--card)" }}>
            {getModelDisplayName(rootAgent.model)}
          </div>
        </div>
      </div>

      {/* Other Departments Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", position: "relative", zIndex: 1 }}>
        {departmentsWithAgents.map((deptId) => {
          const deptAgents = grouped[deptId];
          if (!deptAgents || deptAgents.length === 0) return null;
          return (
            <div key={deptId} ref={(el) => { deptRefs.current[deptId] = el; }}>
              <DepartmentCard deptId={deptId} agents={deptAgents} hoveredId={hoveredId} setHoveredId={setHoveredId} />
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "2rem",
        paddingTop: "1rem", borderTop: "1px solid var(--border)", fontSize: "0.75rem",
        color: "var(--text-muted)", position: "relative", zIndex: 1,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#4ade80" }} /> Online
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#6b7280" }} /> Offline
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <span style={{ width: "20px", height: "2px", backgroundColor: rootAgent?.color || "#6366f1", opacity: 0.5 }} /> Connection
        </span>
      </div>
    </div>
  );
}
