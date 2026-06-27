# Changelog

## [1.1.0] — 2026-06-27

### Added
- **`ObscuraFetch(url, options?)`** — one-shot page fetch API. Calls `obscura fetch <url> --dump <format>` directly, bypassing the CDP server for faster single-page retrieval. Supports HTML, text, markdown, links, and assets output formats.
- **`FetchOptions`** type with full TypeScript declarations (`DumpOptions`, `waitUntilOptions`, etc.)
- **Exported types** — `ObscuraFetch` is re-exported from the package entry point alongside `loadObscura`
- **`postinstall` script** — automatically downloads the Obscura binary after `npm install`

## [1.0.0] — 2026-06-27

### Added
- **`loadObscura(options?)`** — spawns `obscura serve` as a child process and returns a CDP WebSocket endpoint
- **Automatic binary download** — fetches the correct Obscura binary for Linux x64, macOS ARM/x64, and Windows x64
- **Stealth mode** — pass `stealth: true` for anti-fingerprinting and tracker blocking
- **Platform detection** — `getPlatformKey()` and `getBinaryPath()` for cross-platform binary resolution
- **Graceful shutdown** — SIGTERM with 3s timeout, then SIGKILL fallback
- **Environment variable support** — `OBSCURA_RELEASE_TAG`, `OBSCURA_DOWNLOAD_BASE_URL`, `NODE_OBSCURA_SKIP_DOWNLOAD`
- **TypeScript** — full type declarations, strict mode, ESM
