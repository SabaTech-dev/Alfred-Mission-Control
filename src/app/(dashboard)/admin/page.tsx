"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";

export default function AdminDashboard() {
  return (
    <AdminPageLayout title="Admin Dashboard" description="Hidden admin pages for Alfred Mission Control management">
      <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
        Select a page from the navigation above to view admin tools.
      </p>
    </AdminPageLayout>
  );
}
