# Vendored unicode-font-resolver data

Self-hosted subset of [lojjic/unicode-font-resolver@v1.0.1](https://github.com/lojjic/unicode-font-resolver)
(originally served from cdn.jsdelivr.net, which the app CSP `connect-src 'self'` blocks).

Structure mirrors the upstream `packages/data` root so troika-three-text's resolver can use it via
`configureTextBuilder({ unicodeFontsURL })` — see `src/components/Office3D/officeFonts.ts`.

Contents: only the codepoint-index buckets, font-meta files and woff fonts actually rendered by the
/office 3D scene (latin + emoji-3/6/9, sans-serif normal 400).

Licenses:
- `font-files/**` — Google Fonts binaries under SIL Open Font License 1.1
- `codepoint-index/**`, `font-meta/**` — unicode-font-resolver (MIT)

To add coverage for new glyphs (e.g. a new agent emoji), download the missing
`codepoint-index/planeN/*-**.json` bucket, then the `font-meta/<script>.json` and
`font-files/<script>/sans-serif.normal.400.woff` it references, from
`https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data/`.
