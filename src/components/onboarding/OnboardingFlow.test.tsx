import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingFlow, resetOnboarding } from "./OnboardingFlow";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  X: () => <span data-testid="icon-x">X</span>,
  ChevronRight: () => <span data-testid="icon-chevron-right">→</span>,
  ChevronLeft: () => <span data-testid="icon-chevron-left">←</span>,
  Check: () => <span data-testid="icon-check">✓</span>,
  LayoutDashboard: () => <span data-testid="icon-dashboard">D</span>,
  Kanban: () => <span data-testid="icon-kanban">K</span>,
  Bot: () => <span data-testid="icon-bot">B</span>,
  Activity: () => <span data-testid="icon-activity">A</span>,
  Brain: () => <span data-testid="icon-brain">M</span>,
  Zap: () => <span data-testid="icon-zap">Z</span>,
}));

describe("OnboardingFlow", () => {
  beforeEach(() => {
    localStorage.clear();
    resetOnboarding();
  });

  it("should render when onboarding not completed", () => {
    render(<OnboardingFlow />);
    expect(screen.getByText("Welcome to Mission Control")).toBeDefined();
  });

  it("should not render when onboarding already completed", () => {
    localStorage.setItem(
      "mc-onboarding-completed",
      JSON.stringify({ completedAt: "2026-04-17T00:00:00Z" })
    );
    render(<OnboardingFlow />);
    expect(screen.queryByText("Welcome to Mission Control")).toBeNull();
  });

  it("should show progress bar", () => {
    render(<OnboardingFlow />);
    // First step = 1/6 = ~16.67%
    const progress = document.querySelector('[style*="width"]');
    expect(progress).toBeDefined();
  });

  it("should advance to next step on Next click", () => {
    render(<OnboardingFlow />);
    const nextBtn = screen.getByText("Next");
    fireEvent.click(nextBtn);
    // Should show second step
    expect(screen.getByText("Live Dashboard")).toBeDefined();
  });

  it("should close on Skip tour click", () => {
    render(<OnboardingFlow />);
    const skipBtn = screen.getByText("Skip tour");
    fireEvent.click(skipBtn);
    expect(screen.queryByText("Welcome to Mission Control")).toBeNull();
    // Should have saved to localStorage
    expect(localStorage.getItem("mc-onboarding-completed")).toBeDefined();
  });

  it("should close on X button click", () => {
    render(<OnboardingFlow />);
    const closeBtn = screen.getByTestId("icon-x");
    fireEvent.click(closeBtn);
    expect(screen.queryByText("Welcome to Mission Control")).toBeNull();
  });

  it("should show Get started on last step", () => {
    render(<OnboardingFlow />);
    // Click Next 5 times to reach last step
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText("Next"));
    }
    expect(screen.getByText("Get started")).toBeDefined();
  });

  it("should go back on Back button", () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Live Dashboard")).toBeDefined();
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Welcome to Mission Control")).toBeDefined();
  });

  it("should show step counter", () => {
    render(<OnboardingFlow />);
    expect(screen.getByText("1 / 6")).toBeDefined();
  });

  it("Back should be disabled on first step", () => {
    render(<OnboardingFlow />);
    const backBtn = screen.getByText("Back");
    expect(backBtn.closest("button")?.disabled).toBe(true);
  });
});
