import SkillsClient from "./SkillsClient";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  // Skills load client-side via /api/skills with pagination
  // SSR is now fast — no 1MB+ payload
  return <SkillsClient />;
}
