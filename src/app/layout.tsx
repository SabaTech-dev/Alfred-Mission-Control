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

/**
 * Inline Service Worker self-heal script.
 *
 * Kept as a plain string (no template interpolation) so it is trivial to audit
 * and impossible to accidentally close the surrounding <script> tag. See the
 * comment in <head> for the full rationale.
 */
const SW_SELF_HEAL_SCRIPT = [
  "if('serviceWorker' in navigator){",
  "navigator.serviceWorker.getRegistrations()",
  ".then(function(rs){",
  "var hadController=!!navigator.serviceWorker.controller;",
  "return Promise.all(rs.map(function(r){return r.unregister();}));",
  "})",
  ".then(function(){",
  "if(typeof caches!=='undefined'&&caches.keys){",
  "return Promise.all(caches.keys().map(function(k){return caches.delete(k);}));",
  "}",
  "})",
  ".then(function(){",
  "if(hadController&&!sessionStorage.getItem('sw-cleaned')){",
  "sessionStorage.setItem('sw-cleaned','1');",
  "location.reload();",
  "}",
  "})",
  ".catch(function(){});",
  "}",
].join("");

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
            page).

            This block hard-uninstalls any previously installed SW so existing
            browsers self-heal without a manual DevTools cleanup. It:
              1. unregisters every registration,
              2. wipes the CacheStorage the SW may have populated (so stale
                 /api/* and RSC entries can't be re-served),
              3. reloads ONCE if a SW was actually controlling this load,
                 because an unregistered SW keeps controlling the current
                 page until the next navigation. The sessionStorage flag
                 guarantees we never loop. Users who never had the SW have no
                 controller, so they are never reloaded. */}
        <script dangerouslySetInnerHTML={{ __html: SW_SELF_HEAL_SCRIPT }} />
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
