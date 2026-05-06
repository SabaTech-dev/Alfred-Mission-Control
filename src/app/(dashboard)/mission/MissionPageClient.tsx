"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { MissionCard } from "@/components/MissionCard";
import { saveMissionAction, resetMissionAction } from "./actions";
import type { Mission } from "@/lib/mission-types";
import {
  Save,
  RotateCcw,
  ArrowLeft,
  Plus,
  X,
  Target,
  Crosshair,
  Heart,
  Loader2,
} from "lucide-react";

interface MissionPageClientProps {
  initialMission: Mission | null;
}

export default function MissionPageClient({ initialMission }: MissionPageClientProps) {
  const { t } = useI18n();
  const [mission, setMission] = useState<Mission | null>(initialMission);
  const [isEditing, setIsEditing] = useState(!initialMission?.statement);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editStatement, setEditStatement] = useState(mission?.statement ?? "");
  const [editGoals, setEditGoals] = useState<string[]>(mission?.goals ?? []);
  const [editValues, setEditValues] = useState<string[]>(mission?.values ?? []);
  const [newGoal, setNewGoal] = useState("");
  const [newValue, setNewValue] = useState("");

  function startEditing() {
    setEditStatement(mission?.statement ?? "");
    setEditGoals(mission?.goals ?? []);
    setEditValues(mission?.values ?? []);
    setIsEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated: Mission = {
        statement: editStatement,
        goals: editGoals,
        values: editValues,
        lastUpdated: new Date(),
      };
      await saveMissionAction(updated);
      setMission(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save mission:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm(t("mission.confirmReset"))) return;
    setSaving(true);
    try {
      await resetMissionAction();
      setMission(null);
      setEditStatement("");
      setEditGoals([]);
      setEditValues([]);
      setIsEditing(true);
    } catch (err) {
      console.error("Failed to reset mission:", err);
    } finally {
      setSaving(false);
    }
  }

  function addGoal() {
    const trimmed = newGoal.trim();
    if (trimmed && !editGoals.includes(trimmed)) {
      setEditGoals([...editGoals, trimmed]);
      setNewGoal("");
    }
  }

  function removeGoal(index: number) {
    setEditGoals(editGoals.filter((_, i) => i !== index));
  }

  function addValue() {
    const trimmed = newValue.trim();
    if (trimmed && !editValues.includes(trimmed)) {
      setEditValues([...editValues, trimmed]);
      setNewValue("");
    }
  }

  function removeValue(index: number) {
    setEditValues(editValues.filter((_, i) => i !== index));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
          >
            <Target className="w-6 h-6" style={{ color: "var(--accent)" }} />
            {t("mission.title")}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            {t("mission.subtitle")}
          </p>
        </div>
        <a
          href="/"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-80"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("mission.backToDashboard")}
        </a>
      </div>

      {/* View Mode */}
      {!isEditing && mission && (
        <MissionCard mission={mission} onEdit={startEditing} />
      )}

      {/* Edit Mode */}
      {isEditing && (
        <div
          className="rounded-xl p-6 space-y-6"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Mission Statement */}
          <div>
            <label
              className="flex items-center gap-2 text-sm font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              <Crosshair className="w-4 h-4" style={{ color: "var(--accent)" }} />
              {t("mission.statement")}
            </label>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              {t("mission.tips.statement")}
            </p>
            <textarea
              value={editStatement}
              onChange={(e) => setEditStatement(e.target.value)}
              placeholder={t("mission.statementPlaceholder")}
              rows={4}
              className="w-full rounded-lg p-3 text-sm resize-y"
              style={{
                backgroundColor: "var(--card-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Goals */}
          <div>
            <label
              className="flex items-center gap-2 text-sm font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              <Target className="w-4 h-4" style={{ color: "var(--accent)" }} />
              {t("mission.goals")}
            </label>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              {t("mission.tips.goals")}
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {editGoals.map((goal, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm"
                  style={{
                    backgroundColor: "var(--card-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {goal}
                  <button
                    onClick={() => removeGoal(index)}
                    className="hover:opacity-70 transition-opacity"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGoal()}
                placeholder={t("mission.goalsPlaceholder")}
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--card-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={addGoal}
                disabled={!newGoal.trim()}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-40"
                style={{ backgroundColor: "var(--accent)", color: "white" }}
              >
                <Plus className="w-4 h-4" />
                {t("mission.addGoal")}
              </button>
            </div>
          </div>

          {/* Values */}
          <div>
            <label
              className="flex items-center gap-2 text-sm font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              <Heart className="w-4 h-4" style={{ color: "var(--accent)" }} />
              {t("mission.values")}
            </label>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              {t("mission.tips.values")}
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {editValues.map((value, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm"
                  style={{
                    backgroundColor: "var(--card-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {value}
                  <button
                    onClick={() => removeValue(index)}
                    className="hover:opacity-70 transition-opacity"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addValue()}
                placeholder={t("mission.valuesPlaceholder")}
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--card-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                onClick={addValue}
                disabled={!newValue.trim()}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-40"
                style={{ backgroundColor: "var(--accent)", color: "white" }}
              >
                <Plus className="w-4 h-4" />
                {t("mission.addValue")}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div
            className="flex items-center justify-between pt-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-40"
              style={{
                backgroundColor: "var(--card-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <RotateCcw className="w-4 h-4" />
              {t("mission.resetDefault")}
            </button>

            <button
              onClick={handleSave}
              disabled={saving || !editStatement.trim()}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: "var(--accent)", color: "white" }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? t("mission.saving") : t("mission.saveMission")}
            </button>
          </div>
        </div>
      )}

      {/* Null mission view (uses MissionCard) */}
      {isEditing && !mission && (
        <div className="mb-4">
          <MissionCard mission={null} onEdit={() => {}} />
        </div>
      )}
    </div>
  );
}
