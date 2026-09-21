type CronJobInput = {
  name: string;
  schedule?: string;
  every?: string;
  at?: string;
  timezone?: string;
  agentId?: string;
  message?: string;
  description?: string;
  disabled?: boolean;
};

// Matches a trailing Z or ±HH:MM / ±HHMM timezone designator on an `at` value.
const OFFSET_SUFFIX = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/**
 * The openclaw CLI rejects --tz unless the schedule is --cron or an
 * offset-less --at ("--tz is only valid with --cron or offset-less --at").
 */
export function shouldSendTimezone(data: Pick<CronJobInput, "schedule" | "every" | "at">): boolean {
  if (data.every) return false;
  if (data.schedule) return true;
  if (data.at) return !OFFSET_SUFFIX.test(data.at.trim());
  return false;
}

/**
 * Build `openclaw cron add` CLI args from validated request data.
 * Mirrors CreateCronJobSchema (api-validation.ts).
 */
export function buildCronAddArgs(data: CronJobInput): string[] {
  const args: string[] = ["cron", "add", "--json", "--name", data.name];

  if (data.schedule) {
    args.push("--cron", data.schedule);
  }

  if (data.every) {
    args.push("--every", data.every);
  }

  if (data.at) {
    args.push("--at", data.at);
  }

  if (shouldSendTimezone(data)) {
    args.push("--tz", data.timezone || "Europe/Madrid");
  }

  if (data.agentId) {
    args.push("--agent", data.agentId);
  }

  if (data.message) {
    args.push("--message", data.message);
  }

  if (data.description) {
    args.push("--description", data.description);
  }

  if (data.disabled) {
    args.push("--disabled");
  }

  return args;
}
