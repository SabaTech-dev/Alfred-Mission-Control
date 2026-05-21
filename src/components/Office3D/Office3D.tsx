"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useState, useRef, Fragment } from "react";
import { Vector3 } from "three";

import { type AgentState } from "./agentsConfig";
import AgentDesk from "./AgentDesk";
import Floor from "./Floor";
import Walls from "./Walls";
import Ceiling from "./Ceiling";
import Lights from "./Lights";
import AgentPanel from "./AgentPanel";
import FileCabinet from "./FileCabinet";
import Whiteboard from "./Whiteboard";
import CoffeeMachine from "./CoffeeMachine";
import PlantPot from "./PlantPot";
import Bookshelf from "./Bookshelf";
import WallClock from "./WallClock";
import Window from "./Window";
import FirstPersonControls from "./FirstPersonControls";
import { MemoryModal } from "./MemoryModal";
import { RoadmapModal } from "./RoadmapModal";
import { EnergyModal } from "./EnergyModal";
import WalkingAvatar from "./WalkingAvatar";
import RestingAvatar from "./RestingAvatar";
import { AreaRug } from "./AreaRug";
import { OfficeZones } from "./OfficeZones";
import { SubagentLayer } from "./SubagentLayer";
import { OfficeControlsOverlay } from "./OfficeControlsOverlay";

import { useOfficePolling } from "@/hooks/useOfficePolling";
import type { AgentConfig } from "@/lib/office3d-types";
import { buildObstacles } from "@/lib/office-utils";
import {
  PLANT_DECORATIONS,
  FILE_CABINET_POSITION,
  WHITEBOARD_POSITION,
  COFFEE_MACHINE_POSITION,
  LEFT_BOOKSHELF_POSITION,
  RIGHT_BOOKSHELF_POSITION,
  FRONT_WINDOW_POSITION,
  SIDE_WINDOW_LEFT,
  SIDE_WINDOW_RIGHT,
  WALKWAY_LANES,
} from "@/lib/office-scene-config";

interface Office3DProps {
  initialAgents?: AgentConfig[];
}

export default function Office3D({ initialAgents }: Office3DProps = {}) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [interactionModal, setInteractionModal] = useState<string | null>(null);
  const [controlMode, setControlMode] = useState<"orbit" | "fps">("orbit");
  const walkingAvatarPositionsRef = useRef<Map<string, Vector3>>(new Map());

  const {
    agents, agentStates, configuredSubagents, subagentConfigs,
    subagentStateById, runtimeSubagentByConfiguredId, loading,
  } = useOfficePolling({ initialAgents });

  const handleWalkingPositionUpdate = (id: string, pos: Vector3) => {
    walkingAvatarPositionsRef.current.set(id, pos.clone());
  };

  const getAgentState = (agentId: string): AgentState =>
    agentStates[agentId] || { id: agentId, status: "offline", model: "unknown", tokensPerHour: 0, tasksInQueue: 0, uptime: 0 };

  const handleDeskClick = (agentId: string) => setSelectedAgent(agentId);
  const handleClosePanel = () => setSelectedAgent(null);
  const handleFileCabinetClick = () => setInteractionModal("memory");
  const handleWhiteboardClick = () => setInteractionModal("roadmap");
  const handleCoffeeClick = () => setInteractionModal("energy");
  const handleCloseModal = () => setInteractionModal(null);
  const toggleControlMode = () => setControlMode((m) => (m === "orbit" ? "fps" : "orbit"));

  // Selected agent derived state
  const selectedAgentConfig = selectedAgent
    ? agents.find((a) => a.id === selectedAgent) || subagentConfigs.find((a) => a.id === selectedAgent) || null
    : null;
  const selectedConfiguredSubagent = selectedAgent
    ? configuredSubagents.find((s) => s.id === selectedAgent) || null
    : null;

  const selectedPanelAgent: AgentConfig | null = (() => {
    if (!selectedAgentConfig) return null;
    if (!selectedConfiguredSubagent) return selectedAgentConfig;
    return {
      ...selectedAgentConfig,
      id: selectedConfiguredSubagent.subagentId,
      name: selectedConfiguredSubagent.name,
      emoji: selectedConfiguredSubagent.emoji,
      color: selectedConfiguredSubagent.color,
    };
  })();

  const selectedAgentState: AgentState | null = (() => {
    if (!selectedAgent || !selectedAgentConfig) return null;
    const primary = agents.find((a) => a.id === selectedAgent);
    if (primary) return getAgentState(selectedAgent);
    const runtime = runtimeSubagentByConfiguredId.get(selectedAgent);
    const configuredState = selectedConfiguredSubagent ? agentStates[selectedConfiguredSubagent.subagentId] : undefined;
    const status = subagentStateById.get(selectedAgent) || "offline";
    return {
      id: selectedAgent, status,
      currentTask: configuredState?.currentTask || runtime?.task,
      model: configuredState?.model || runtime?.model,
      tokensUsed: configuredState?.tokensUsed ?? runtime?.tokens,
      sessionCount: configuredState?.sessionCount ?? (runtime ? 1 : 0),
      lastActivity: configuredState?.lastActivity || (runtime ? new Date(Date.now() - runtime.ageMs).toISOString() : undefined),
      mood: configuredState?.mood,
    };
  })();

  const obstacles = buildObstacles(agents, subagentConfigs);
  const officeBounds = { minX: -12, maxX: 12, minZ: -9, maxZ: 9 };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-neutral-900 flex items-center justify-center" style={{ height: "100vh", width: "100vw" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-warning mx-auto mb-4"></div>
          <p className="text-neutral-400 text-lg">Loading office...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-neutral-900" style={{ height: "100vh", width: "100vw" }}>
      <Canvas camera={{ position: [0, 8, 12], fov: 60 }} shadows gl={{ antialias: true, alpha: false }} style={{ width: "100%", height: "100%" }} onPointerMissed={() => {}}>
        <Suspense fallback={<mesh><boxGeometry args={[2, 2, 2]} /><meshStandardMaterial color="orange" /></mesh>}>
          <Lights />
          <Sky sunPosition={[100, 20, 100]} />
          <Floor />
          <AreaRug position={[0, 0, 0.5]} size={[18, 10]} color="#3d3a34" borderColor="#2e2b26" />
          <Walls />
          {controlMode === "fps" && <Ceiling />}

          {WALKWAY_LANES.map((lane) => (
            <mesh key={lane.id} position={lane.position} rotation={[-Math.PI / 2, lane.rotationY || 0, 0]} receiveShadow>
              <planeGeometry args={lane.size} />
              <meshStandardMaterial color={lane.color} roughness={0.94} metalness={0.02} />
            </mesh>
          ))}

          <OfficeZones />

          {agents.map((agent, index) => (
            <AgentDesk key={agent.id} agentId={agent.id} agentName={agent.name} agentColor={agent.color}
              agentEmoji={agent.emoji} agentRole={agent.role} agentAccessories={agent.accessories}
              deskPosition={agent.position} deskRotation={agent.deskRotation}
              avatarState={getAgentState(agent.id).status} currentTask={getAgentState(agent.id).currentTask}
              onClick={() => handleDeskClick(agent.id)} isSelected={selectedAgent === agent.id} isMainAgent={index === 0} />
          ))}

          {agents.map((agent) => {
            const status = getAgentState(agent.id).status;
            return (
              <Fragment key={agent.id}>
                <WalkingAvatar agent={agent} status={status} visible={status === "idle"}
                  officeBounds={officeBounds} obstacles={obstacles}
                  otherAvatarPositions={walkingAvatarPositionsRef.current}
                  onPositionUpdate={handleWalkingPositionUpdate} />
                <RestingAvatar agent={agent} visible={status === "offline"} />
              </Fragment>
            );
          })}

          <SubagentLayer subagentConfigs={subagentConfigs} subagentStateById={subagentStateById}
            agents={agents} obstacles={obstacles} officeBounds={officeBounds}
            walkingAvatarPositions={walkingAvatarPositionsRef.current}
            onWalkingPositionUpdate={handleWalkingPositionUpdate}
            onDeskClick={handleDeskClick} selectedAgent={selectedAgent} />

          <FileCabinet position={FILE_CABINET_POSITION} onClick={handleFileCabinetClick} />
          <Whiteboard position={WHITEBOARD_POSITION} rotation={[0, 0, 0]} onClick={handleWhiteboardClick} />
          <CoffeeMachine position={COFFEE_MACHINE_POSITION} onClick={handleCoffeeClick} />
          <Window position={FRONT_WINDOW_POSITION} size={[2.6, 1.8]} />
          <Window position={SIDE_WINDOW_LEFT} rotation={[0, Math.PI / 2, 0]} size={[2.2, 1.6]} />
          <Window position={SIDE_WINDOW_RIGHT} rotation={[0, -Math.PI / 2, 0]} size={[2.2, 1.6]} />
          <Bookshelf position={LEFT_BOOKSHELF_POSITION} rotation={[0, Math.PI / 2, 0]} />
          <Bookshelf position={RIGHT_BOOKSHELF_POSITION} rotation={[0, -Math.PI / 2, 0]} />
          {PLANT_DECORATIONS.map((plant, i) => (
            <PlantPot key={`plant-${i}`} position={plant.position} size={plant.size} type={plant.type} />
          ))}
          <WallClock position={[0, 2.8, -7.6]} rotation={[0, 0, 0]} />

          {controlMode === "orbit" ? (
            <OrbitControls enableDamping dampingFactor={0.05} minDistance={5} maxDistance={30} maxPolarAngle={Math.PI / 2.2} />
          ) : (
            <FirstPersonControls moveSpeed={5} />
          )}

          <EffectComposer>
            <Bloom intensity={0.15} luminanceThreshold={0.9} luminanceSmoothing={0.9} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {selectedPanelAgent && selectedAgentState && (
        <AgentPanel agent={selectedPanelAgent} state={selectedAgentState} onClose={handleClosePanel} />
      )}
      {interactionModal === "memory" && <MemoryModal onClose={handleCloseModal} />}
      {interactionModal === "roadmap" && <RoadmapModal onClose={handleCloseModal} />}
      {interactionModal === "energy" && <EnergyModal onClose={handleCloseModal} />}

      <OfficeControlsOverlay controlMode={controlMode} onToggle={toggleControlMode} />
    </div>
  );
}
