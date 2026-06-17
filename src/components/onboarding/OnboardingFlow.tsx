"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  LayoutDashboard,
  Kanban,
  Bot,
  Activity,
  Brain,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "mc-onboarding-completed";

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Mission Control",
    description:
      "Your central hub for monitoring and managing OpenClaw agents, tasks, and system health. Let's take a quick tour.",
    icon: <LayoutDashboard className="h-8 w-8 text-blue-400" />,
  },
  {
    id: "dashboard",
    title: "Live Dashboard",
    description:
      "Monitor real-time agent activity, session status, and system metrics at a glance. The dashboard auto-refreshes every 5 seconds.",
    icon: <Activity className="h-8 w-8 text-green-400" />,
    target: "/live",
  },
  {
    id: "kanban",
    title: "Task Board",
    description:
      "Manage tasks across backlog, in-progress, review, and done columns. Assign tasks to agents and track progress.",
    icon: <Kanban className="h-8 w-8 text-purple-400" />,
    target: "/kanban",
  },
  {
    id: "agents",
    title: "Agent Management",
    description:
      "View and configure your specialized agents — coder, security, QA, research, and more. Each agent has its own memory and skills.",
    icon: <Bot className="h-8 w-8 text-orange-400" />,
    target: "/agents",
  },
  {
    id: "memory",
    title: "Memory System",
    description:
      "Browse and manage the memory-core memory banks. View memories, entities, and knowledge graphs across all agents.",
    icon: <Brain className="h-8 w-8 text-pink-400" />,
    target: "/memory",
  },
  {
    id: "system",
    title: "System Health",
    description:
      "Monitor CPU, memory, disk, service status, uptime, and performance metrics. Set up alerts for critical thresholds.",
    icon: <Zap className="h-8 w-8 text-yellow-400" />,
    target: "/system",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function OnboardingFlow() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        setVisible(true);
      }
    } catch {
      // SSR or storage unavailable
    }
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedAt: new Date().toISOString() }));
    } catch {
      // ignore
    }
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleClose();
    }
  }, [currentStep, handleClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    handleClose();
  }, [handleClose]);

  if (!visible) return null;

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-8 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress bar */}
        <div className="mb-6 h-1 overflow-hidden rounded-full bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step content */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-xl bg-gray-800 p-4">{step.icon}</div>
          <h2 className="mb-2 text-xl font-bold text-white">{step.title}</h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-300">
            {step.description}
          </p>

          {/* Step indicator */}
          <div className="mb-6 flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === currentStep
                    ? "w-6 bg-blue-500"
                    : i < currentStep
                    ? "w-1.5 bg-blue-400"
                    : "w-1.5 bg-gray-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <span className="text-xs text-gray-500">
            {currentStep + 1} / {STEPS.length}
          </span>

          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              Skip tour
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  Get started
                  <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reset utility (for testing / re-triggering)                        */
/* ------------------------------------------------------------------ */

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
