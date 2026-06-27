import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Stub the heavy Three.js scene so the dynamic import resolves instantly and
// we can assert the wrapper renders client-side (ssr: false).
vi.mock("@/components/Office3D/Office3D", () => ({
  default: ({ initialAgents }: { initialAgents: unknown[] }) => (
    <div data-testid="office3d-scene">rendered:{initialAgents.length}</div>
  ),
}));

import Office3DClient from "./Office3DClient";

describe("Office3DClient", () => {
  it("renders the 3D scene client-side (no SSR) once the dynamic import resolves", async () => {
    render(<Office3DClient initialAgents={[]} />);

    // next/dynamic with ssr:false resolves asynchronously; wait for the scene.
    await waitFor(() => {
      expect(screen.getByTestId("office3d-scene")).toBeDefined();
    });
    expect(screen.getByText("rendered:0")).toBeDefined();
  });

  it("forwards the initial agents to the 3D scene", async () => {
    const agents = [{ id: "a" }, { id: "b" }, { id: "c" }];
    render(<Office3DClient initialAgents={agents} />);

    await waitFor(() => {
      expect(screen.getByText("rendered:3")).toBeDefined();
    });
  });
});
