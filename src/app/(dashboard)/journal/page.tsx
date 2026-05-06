import { listJournalEntries } from "@/lib/kanban-db";
import JournalClient, { JournalInitialData } from "./JournalClient";

export const dynamic = "force-dynamic";

async function getJournalInitialData(): Promise<JournalInitialData> {
  const entries = listJournalEntries({});
  return {
    entries,
  };
}

export default async function JournalPage() {
  const initialData = await getJournalInitialData();
  return <JournalClient initialData={initialData} />;
}
