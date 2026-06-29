"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Coins,
  ShieldCheck,
  Sunrise,
  TestTube,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { useI18n } from "@/i18n/provider";

interface RoutineCard {
  href: string;
  icon: typeof Activity;
  color: string;
  titleKey: string;
  descKey: string;
}

const ROUTINES: RoutineCard[] = [
  {
    href: "/?routine=morning-brief",
    icon: Sunrise,
    color: "#f59e0b",
    titleKey: "routines.morningBrief.title",
    descKey: "routines.morningBrief.description",
  },
  {
    href: "/system?focus=security",
    icon: ShieldCheck,
    color: "#60a5fa",
    titleKey: "routines.securitySweep.title",
    descKey: "routines.securitySweep.description",
  },
  {
    href: "/activity?focus=e2e",
    icon: TestTube,
    color: "#4ade80",
    titleKey: "routines.e2eCheck.title",
    descKey: "routines.e2eCheck.description",
  },
  {
    href: "/analytics",
    icon: Coins,
    color: "#a78bfa",
    titleKey: "routines.costReview.title",
    descKey: "routines.costReview.description",
  },
];

export default function RoutinesPage() {
  const { t } = useI18n();

  return (
    <div>
      <PageHeader title={t("routines.title")} subtitle={t("routines.subtitle")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ROUTINES.map(({ href, icon: Icon, color, titleKey, descKey }) => (
          <Link
            key={titleKey}
            href={href}
            className="group rounded-xl p-5 transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: "var(--card-elevated)" }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <h3
              className="mb-1 text-base font-semibold"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--text-primary)",
              }}
            >
              {t(titleKey)}
            </h3>
            <p
              className="mb-4 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {t(descKey)}
            </p>
            <span
              className="inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5"
              style={{ color: "var(--accent)" }}
            >
              {t("routines.open")}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
