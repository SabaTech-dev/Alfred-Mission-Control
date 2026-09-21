import { notFound } from "next/navigation";
import { getReportByShareToken } from "@/lib/report-generator";
import type { GeneratedReport } from "@/lib/report-generator";
import SharedReportView from "./SharedReportView";

export const dynamic = "force-dynamic";

/**
 * Shared report page — resolves the share token server-side. An invalid,
 * expired or failing token renders the app's 404 (notFound()) instead of
 * crashing into the error boundary.
 */
export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let report: GeneratedReport | null = null;
  try {
    report = getReportByShareToken(token);
  } catch (error) {
    console.error("[reports/shared] Error resolving token:", error);
  }

  if (!report) {
    notFound();
  }

  return <SharedReportView report={report} />;
}
