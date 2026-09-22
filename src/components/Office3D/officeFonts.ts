import { configureTextBuilder } from "troika-three-text";

// Self-hosted copy of the unicode-font-resolver dataset lives in public/unicode-font-resolver/
// (codepoint-index buckets, font-meta and woff files vendored from
// lojjic/unicode-font-resolver@v1.0.1). The default CDN (cdn.jsdelivr.net) is blocked by the
// app's CSP connect-src 'self', which made all /office 3D text fall back to a degraded font.
// Must run before the first troika font request (imported at the Office3D module root).
// ponytail: only the buckets/scripts actually rendered are vendored; if new glyphs
// (e.g. a new agent emoji) 404, add the missing bucket + font-meta + woff from the CDN.
if (typeof window !== "undefined") {
  configureTextBuilder({
    unicodeFontsURL: new URL("/unicode-font-resolver", window.location.origin).href,
  });
}
