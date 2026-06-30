import type { Metadata, Viewport } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

// Force dynamic rendering for all routes to prevent prerendering issues
export const dynamic = "force-dynamic";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

const sora = Sora({ 
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
};

export const metadata: Metadata = {
  title: "Alfred - OpenClaw Alfred",
  description: "Your OpenClaw agent dashboard powered by Alfred",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Service Worker removed: it intercepted /api/* with a caches.match()
            fallback that resolved to undefined, breaking every API call and
            staling the dashboard. It also cached navigation/RSC payloads
            cache-first, which broke SPA routing (every link rendered the same
            page). This block unregisters any previously installed SW so
            existing browsers self-heal without a manual DevTools cleanup. */}
        <script dangerouslySetInnerHTML={{ __html: `if("serviceWorker"in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})}).catch(function(){})}`} } />
      </head>
      <body 
        className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} font-sans`}
        style={{ 
          backgroundColor: 'var(--background)', 
          color: 'var(--foreground)',
          fontFamily: 'var(--font-body)'
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
