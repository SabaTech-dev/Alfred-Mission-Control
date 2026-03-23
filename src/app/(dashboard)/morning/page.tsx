"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sun,
  CheckSquare,
  Square,
  Bot,
  Clock,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Zap,
  Gamepad2,
  LayoutDashboard,
  FileText,
  AlertCircle,
  Activity,
  Circle,
} from "lucide-react";

interface BriefData {
  found: boolean;
  date: string;
  tasks: string[];
  completed: string[];
  notes: string[];
}

interface SystemData {
  cpu: { usage: number; status: string };
  memory: { usage: string; status: string };
  disk: { usage: string };
  uptime: string;
  timestamp: string;
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
  model: string;
  status: 'active' | 'inactive';
  lastActivity?: string;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  nextRun?: string;
  lastStatus?: string;
}

export default function MorningPage() {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [system, setSystem] = useState<SystemData | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/morning/brief').then(r => r.json()),
      fetch('/api/morning/system').then(r => r.json()),
      fetch('/api/morning/agents').then(r => r.json()),
      fetch('/api/cron-jobs').then(r => r.json()).catch(() => ({ jobs: [] })),
    ]).then(([briefData, systemData, agentsData, cronData]) => {
      setBrief(briefData);
      setSystem(systemData);
      setAgents(agentsData.agents || []);
      setCronJobs(cronData.jobs || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high':
      case 'active':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
      case 'inactive':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading morning brief...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-primary)',
            letterSpacing: '-1.5px'
          }}
        >
          <Sun className="w-8 h-8" style={{ color: '#fbbf24' }} />
          Morning Pipeline
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Daily Brief */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="accent-line" />
            <h2
              className="text-base font-semibold flex items-center gap-2"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
            >
              <FileText className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              Brief del Día
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {!brief?.found ? (
              <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No daily note found for today</p>
              </div>
            ) : (
              <>
                {/* Pending Tasks */}
                {brief.tasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <CheckSquare className="w-4 h-4" />
                      Pending Tasks ({brief.tasks.length})
                    </h3>
                    <ul className="space-y-1">
                      {brief.tasks.slice(0, 5).map((task, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                          <Square className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                          <span className="line-clamp-2">{task}</span>
                        </li>
                      ))}
                      {brief.tasks.length > 5 && (
                        <li className="text-xs pl-6" style={{ color: 'var(--text-muted)' }}>
                          +{brief.tasks.length - 5} more tasks
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Completed Tasks */}
                {brief.completed.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--success)' }}>
                      <CheckSquare className="w-4 h-4" />
                      Completed ({brief.completed.length})
                    </h3>
                    <ul className="space-y-1">
                      {brief.completed.slice(0, 3).map((task, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm line-through opacity-60" style={{ color: 'var(--text-primary)' }}>
                          <CheckSquare className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                          <span className="line-clamp-1">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                {brief.notes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                      📝 Notes
                    </h3>
                    <ul className="space-y-1">
                      {brief.notes.slice(0, 3).map((note, i) => (
                        <li key={i} className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          • {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Agent Status */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="accent-line" />
            <h2
              className="text-base font-semibold flex items-center gap-2"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
            >
              <Bot className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              Agentes Status
            </h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--card-elevated)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{agent.emoji}</span>
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {agent.name}
                      </span>
                    </div>
                    <Circle
                      className="w-2 h-2"
                      style={{
                        fill: agent.status === 'active' ? '#10b981' : '#6b7280',
                        color: agent.status === 'active' ? '#10b981' : '#6b7280',
                      }}
                    />
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {agent.model.split('/').pop()}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {agent.status === 'active' ? '🟢 Active' : '⚪ Inactive'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="accent-line" />
            <h2
              className="text-base font-semibold flex items-center gap-2"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
            >
              <Server className="w-5 h-5" style={{ color: 'var(--success)' }} />
              System Health
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {system ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cpu className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>CPU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--card-elevated)' }}>
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.min(system.cpu.usage, 100)}%`,
                          backgroundColor: getStatusColor(system.cpu.status),
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {system.cpu.usage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MemoryStick className="w-5 h-5" style={{ color: 'var(--info)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Memory</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {system.memory.usage}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Disk</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {system.disk.usage}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Uptime</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {system.uptime}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                System metrics unavailable
              </p>
            )}
          </div>
        </div>

        {/* Cron Jobs */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="accent-line" />
              <h2
                className="text-base font-semibold flex items-center gap-2"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
              >
                <Clock className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                Cron Jobs de Hoy
              </h2>
            </div>
            <Link
              href="/cron"
              className="text-sm font-medium"
              style={{ color: 'var(--accent)' }}
            >
              View all →
            </Link>
          </div>
          <div className="p-5">
            {cronJobs.length > 0 ? (
              <ul className="space-y-2">
                {cronJobs.slice(0, 5).map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between p-2 rounded-lg"
                    style={{ backgroundColor: 'var(--card-elevated)' }}
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {job.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {job.schedule}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No cron jobs configured
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="accent-line" />
            <h2
              className="text-base font-semibold flex items-center gap-2"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
            >
              <Zap className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              Quick Actions
            </h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link
                href="/kanban"
                className="p-4 rounded-lg text-center transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--card-elevated)', border: '1px solid var(--border)' }}
              >
                <LayoutDashboard className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  View Kanban
                </span>
              </Link>
              <Link
                href="/office"
                className="p-4 rounded-lg text-center transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--card-elevated)', border: '1px solid var(--border)' }}
              >
                <Gamepad2 className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Office 3D
                </span>
              </Link>
              <Link
                href="/logs"
                className="p-4 rounded-lg text-center transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--card-elevated)', border: '1px solid var(--border)' }}
              >
                <Activity className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--info)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Live Logs
                </span>
              </Link>
              <Link
                href="/actions"
                className="p-4 rounded-lg text-center transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--card-elevated)', border: '1px solid var(--border)' }}
              >
                <Zap className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--warning)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Quick Actions
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
