export interface SystemdService {
  name: string;
  status: string;
  description: string;
  backend?: string;
  uptime?: number | null;
  restarts?: number;
  pid?: number | null;
  mem?: number | null;
  cpu?: number | null;
}

export interface TailscaleDevice {
  ip: string;
  hostname: string;
  os: string;
  online: boolean;
}

export interface FirewallRule {
  port: string;
  action: string;
  from: string;
  comment: string;
}

export interface SystemData {
  cpu: { usage: number; cores: number[]; loadAvg: number[] };
  ram: { total: number; used: number; free: number; cached: number };
  disk: { total: number; used: number; free: number; percent: number };
  network: { rx: number; tx: number };
  systemd: SystemdService[];
  tailscale: { active: boolean; ip: string; devices: TailscaleDevice[] };
  firewall: { active: boolean; rules: FirewallRule[]; ruleCount: number };
}

export interface LogsModal {
  name: string;
  backend: string;
  content: string;
  loading: boolean;
}
