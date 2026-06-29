"use client";

import { Dock, TopBar, StatusBar } from "@/components/Alfred";
import { AutoVoiceProvider } from "@/components/AutoVoiceProvider";
import { CommandPalette } from "@/components/CommandPalette";
import { I18nProvider } from "@/i18n/provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider>
      <AutoVoiceProvider>
        <div className="alfred-shell" style={{ minHeight: "100vh" }} suppressHydrationWarning>
          <Dock />
          <TopBar />

          <main
            style={{
              marginLeft: "68px", // Width of dock
              marginTop: "48px", // Height of top bar
              marginBottom: "32px", // Height of status bar
              minHeight: "calc(100vh - 48px - 32px)",
              padding: "24px",
            }}
          >
            {children}
          </main>

          <StatusBar />

          {/* Command Palette - Global Cmd+K */}
          <CommandPalette />
        </div>
      </AutoVoiceProvider>
    </I18nProvider>
  );
}
