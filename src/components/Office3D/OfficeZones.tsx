"use client";

import { Box } from "@react-three/drei";
import { AreaRug } from "./AreaRug";
import { CollabTable } from "./CollabTable";
import { LoungeChair } from "./LoungeChair";
import {
  COLLAB_ZONE_CENTER,
  FOCUS_ZONE_CENTER,
  BREAK_ZONE_CENTER,
} from "@/lib/office-scene-config";

/**
 * OfficeZones — renders the three premium zones:
 * collaboration, focus, and break areas.
 */
export function OfficeZones() {
  return (
    <>
      {/* Open Office Premium: collaboration zone near whiteboard */}
      <group>
        <AreaRug
          position={[COLLAB_ZONE_CENTER[0], 0, COLLAB_ZONE_CENTER[2]]}
          size={[5.2, 3.0]}
          color="#2b3445"
          borderColor="#1e2736"
        />

        <CollabTable position={[COLLAB_ZONE_CENTER[0], 0, COLLAB_ZONE_CENTER[2]]} />

        {[
          [-1.6, -1.1, 0],
          [1.6, -1.1, 0],
          [-1.6, 1.1, Math.PI],
          [1.6, 1.1, Math.PI],
        ].map(([x, z, rot], index) => (
          <LoungeChair
            key={`collab-chair-${index}`}
            position={[COLLAB_ZONE_CENTER[0] + Number(x), 0, COLLAB_ZONE_CENTER[2] + Number(z)]}
            rotation={[0, Number(rot), 0]}
            variant="task"
          />
        ))}

        <spotLight
          position={[COLLAB_ZONE_CENTER[0], 4.2, COLLAB_ZONE_CENTER[2] + 0.5]}
          angle={0.5}
          penumbra={0.5}
          intensity={0.4}
          distance={11}
          color="#f8fafc"
          castShadow
        />
        <pointLight position={[COLLAB_ZONE_CENTER[0] - 1.8, 1.8, COLLAB_ZONE_CENTER[2] + 0.1]} intensity={0.14} distance={6} color="#93c5fd" />
        <pointLight position={[COLLAB_ZONE_CENTER[0] + 1.9, 1.7, COLLAB_ZONE_CENTER[2] - 0.1]} intensity={0.12} distance={6} color="#fde68a" />
      </group>

      {/* Open Office Premium: focus zone — back-left corner by bookshelves */}
      <group>
        <AreaRug
          position={[FOCUS_ZONE_CENTER[0], 0, FOCUS_ZONE_CENTER[2]]}
          size={[3.4, 2.4]}
          color="#3d2f2f"
          borderColor="#2a1f1f"
        />

        <Box args={[1.5, 0.1, 0.7]} position={[FOCUS_ZONE_CENTER[0], 0.74, FOCUS_ZONE_CENTER[2] + 0.05]} castShadow>
          <meshStandardMaterial color="#65473a" roughness={0.72} />
        </Box>

        <LoungeChair
          position={[FOCUS_ZONE_CENTER[0] + 1.15, 0, FOCUS_ZONE_CENTER[2] + 0.15]}
          rotation={[0, -Math.PI / 2, 0]}
          variant="executive"
          color="#0f172a"
        />

        {/* Floor lamp */}
        <mesh position={[FOCUS_ZONE_CENTER[0] - 0.55, 0, FOCUS_ZONE_CENTER[2] - 0.2]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
          <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[FOCUS_ZONE_CENTER[0] - 0.55, 0.35, FOCUS_ZONE_CENTER[2] - 0.2]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.45} roughness={0.4} />
        </mesh>
        <mesh position={[FOCUS_ZONE_CENTER[0] - 0.55, 0.74, FOCUS_ZONE_CENTER[2] - 0.2]} castShadow>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#fde68a" emissive="#d97706" emissiveIntensity={0.24} />
        </mesh>

        <pointLight position={[FOCUS_ZONE_CENTER[0] - 0.45, 1.8, FOCUS_ZONE_CENTER[2] - 0.2]} intensity={0.2} distance={4} color="#fde68a" />
        <pointLight position={[FOCUS_ZONE_CENTER[0] + 1.2, 1.5, FOCUS_ZONE_CENTER[2] + 0.2]} intensity={0.08} distance={3.2} color="#60a5fa" />
      </group>

      {/* Open Office Premium: break zone — back-right corner near coffee */}
      <group>
        <AreaRug
          position={[BREAK_ZONE_CENTER[0], 0, BREAK_ZONE_CENTER[2]]}
          size={[2.8, 2.0]}
          color="#1f3b3b"
          borderColor="#162d2d"
        />

        <mesh position={[BREAK_ZONE_CENTER[0] - 0.55, 0.42, BREAK_ZONE_CENTER[2] - 0.35]} castShadow>
          <cylinderGeometry args={[0.23, 0.23, 0.82, 20]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[BREAK_ZONE_CENTER[0] - 0.55, 0.87, BREAK_ZONE_CENTER[2] - 0.35]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.06, 20]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>

        <LoungeChair
          position={[BREAK_ZONE_CENTER[0] + 0.85, 0, BREAK_ZONE_CENTER[2] + 0.05]}
          rotation={[0, -Math.PI / 2.8, 0]}
          variant="lounge"
          color="#334155"
        />

        <pointLight position={[BREAK_ZONE_CENTER[0] - 0.4, 1.4, BREAK_ZONE_CENTER[2] - 0.4]} intensity={0.12} distance={3.6} color="#fbbf24" />
        <pointLight position={[BREAK_ZONE_CENTER[0] + 0.8, 1.2, BREAK_ZONE_CENTER[2] + 0.2]} intensity={0.08} distance={3.2} color="#a7f3d0" />
      </group>
    </>
  );
}
