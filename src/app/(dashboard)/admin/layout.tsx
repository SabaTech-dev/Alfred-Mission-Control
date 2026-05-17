import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Alfred Mission Control",
  description: "Hidden admin pages for Alfred Mission Control management",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
