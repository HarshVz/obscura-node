# obscura-node

> Node.js wrapper for [Obscura](https://github.com/h4ckf0r0day/obscura) — the Rust-powered headless browser built for AI agents and web scraping. Drop-in replacement for headless Chrome with Puppeteer & Playwright. Includes a one-shot `ObscuraFetch` API for lightning-fast page fetching.

[![npm version](https://img.shields.io/npm/v/obscura-node)](https://www.npmjs.com/package/obscura-node)
[![GitHub](https://img.shields.io/github/stars/HarshVz/obscura-node?label=obscura-node)](https://github.com/HarshVz/obscura-node)
[![Obscura engine](https://img.shields.io/github/stars/h4ckf0r0day/obscura?label=Obscura%20engine&color=blueviolet)](https://github.com/h4ckf0r0day/obscura)
[![License](https://img.shields.io/badge/license-ISC-blue)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-linux%20%7C%20macOS%20%7C%20windows-lightgrey)](https://github.com/HarshVz/obscura-node)

---

## What is Obscura?

[Obscura](https://github.com/h4ckf0r0day/obscura) is an open-source headless browser engine **written from scratch in Rust** — not a fork or fork of Chromium. It runs real JavaScript via V8 (`deno_core`), builds a live DOM from parsed HTML, and exposes the **Chrome DevTools Protocol (CDP)** over WebSocket. This means it works as a **drop-in replacement** for headless Chrome with **Puppeteer** and **Playwright** — but at a fraction of the resource cost.

**obscura-node** gives you two ways to use Obscura:

- **`loadObscura()`** — spawns `obscura serve`, returns a CDP WebSocket endpoint for use with Puppeteer, Playwright, or any CDP client.
- **`ObscuraFetch()`** — one-shot `obscura fetch` call. Fetches a URL, renders the page (JS, DOM), and returns the output as a string. No server setup, no WebSocket, no cleanup.

> **💡 obscura-node is a Node.js wrapper around [Obscura](https://github.com/h4ckf0r0day/obscura)** — the incredible Rust headless browser built by [@h4ckf0r0day](https://github.com/h4ckf0r0day). All credit for the browser engine, stealth, benchmarks, and CDP implementation goes to the original author. This package just makes it easy to use from Node.js.

---

## Why Obscura over Headless Chrome?

| Metric | Obscura | Headless Chrome | Advantage |
|--------|---------|-----------------|-----------|
| **Memory per instance** | ~30 MB | 200+ MB | **6-10x less** |
| **Binary size** | ~70 MB | 300+ MB | **4x smaller** |
| **Page load (static)** | ~51 ms | ~500 ms | **10x faster** |
| **Page load (dynamic)** | ~85 ms | ~800 ms | **9x faster** |
| **Startup time** | Instant (~50 ms) | ~2 seconds | **40x faster** |
| **Anti-detection** | Built-in (`--stealth`) | None | ✅ |
| **Tracker blocking** | 3,520 domains | None | ✅ |
| **SSRF protection** | Built-in | None | ✅ |
| **DOM → Markdown** | Native CDP method | None | ✅ |
| **Puppeteer / Playwright** | ✅ Full CDP | ✅ | Identical |
| **Single binary** | ✅ Yes | ❌ Needs Chrome | ✅ |

### Head-to-head benchmark (from obscura-benchmark)

**Framework pages (cold start):**

| Page | Obscura | Headless Chrome | Advantage |
|------|---------|-----------------|-----------|
| React | **88 ms, 30 MB** | 1,097 ms, 185 MB | **12x faster, 6x less memory** |
| Preact | **59 ms, 29 MB** | 1,032 ms, 186 MB | **18x faster, 6x less memory** |
| Vue | **97 ms, 32 MB** | 1,144 ms, 184 MB | **12x faster, 6x less memory** |

**Concurrent throughput (8 workers):**

| Engine | Throughput | Peak memory |
|--------|-----------|-------------|
| Obscura | **21 pg/s** | **132 MB** |
| Headless Chrome | 2.8 pg/s | 7.1 GB |

**Real-world corpus (24 public sites):**

| Metric | Obscura | Headless Chrome |
|--------|---------|-----------------|
| Render success | 91.7% | 91.7% |
| Median latency | 2.0 s | 1.5 s |
| Median peak RSS | **35.6 MB** | 191.8 MB |

> Source: [obscura-benchmark](https://github.com/h4ckf0r0day/obscura-benchmark) — conformance, obstacle course, vs-Chrome, and real-world corpus benchmarks.

**Key takeaway:** Independent benchmarks confirm Obscura uses **~30 MB memory** (vs Chrome's 200-300 MB), has **dramatically lower variance** (σ 16ms vs Chrome's 76ms on HN), and delivers **identical rendering results** on real pages.

---

## Features

- **Two APIs** — `loadObscura()` for CDP-based multi-page sessions (Puppeteer/Playwright), `ObscuraFetch()` for one-shot page fetching
- **One-shot `ObscuraFetch`** — fetch any URL and get rendered output (HTML, text, markdown, links, assets) in a single call. Significantly faster than spinning up a full CDP server
- **Zero dependencies** — single Rust binary, no Chrome/Node.js runtime required
- **Automatic download** — installs the right binary for your platform (Linux x64, macOS ARM/x64, Windows x64)
- **CDP WebSocket endpoint** — use with Puppeteer, Playwright, or any CDP client
- **Stealth mode** — pass `stealth: true` for anti-fingerprinting + tracker blocking
- **Flexible port/host** — auto-find free port or specify one
- **Graceful shutdown** — proper SIGTERM → SIGKILL cleanup
- **Custom args** — pass extra flags to the Obscura binary
- **Configurable timeout** — control how long to wait for startup

---

## Installation

```bash
npm install obscura-node
```

The Obscura binary downloads automatically on the first `loadObscura()` or `ObscuraFetch()` call if not present.

---

## Quick Start

### One-shot fetch (v1.1.0+)

```ts
import { ObscuraFetch } from "obscura-node";

const html = await ObscuraFetch("https://example.com");
console.log(html);

// Get text content instead
const text = await ObscuraFetch("https://example.com", { dump: "text" });
console.log(text);
```

### CDP server (Puppeteer / Playwright)

```ts
import loadObscura from "obscura-node";

const browser = await loadObscura();

console.log(browser.endpoint);    // http://127.0.0.1:58291
console.log(browser.wsEndpoint);  // ws://127.0.0.1:58291/...

// Use with Puppeteer:
import puppeteer from "puppeteer";
const browser = await puppeteer.connect({
  browserWSEndpoint: obscura.wsEndpoint,
});
const page = await browser.newPage();
await page.goto("https://example.com");
console.log(await page.title());
await browser.close();

// Cleanup
await obscura.close();
```

---

## API Reference

### `ObscuraFetch(url, options?)` — v1.1.0+

One-shot fetch. Spawns `obscura fetch <url> --dump <format>`, renders the page with full V8 JavaScript, and returns the output. No persistent server, no WebSocket, no cleanup needed.

```ts
import { ObscuraFetch } from "obscura-node";

const result = await ObscuraFetch("https://example.com", {
  dump: "markdown",
  stealth: true,
  timeout: 15,
});
```

#### Options (`FetchOptions`)

| Property | Type | Default | CLI flag | Description |
|----------|------|---------|----------|-------------|
| `dump` | `"html" \| "text" \| "markdown" \| "links" \| "assets" \| "original"` | `"html"` | `--dump` | Output format |
| `selector` | `string` | — | `--selector` | CSS selector to extract specific elements |
| `wait` | `number` | `5` | `--wait` | Seconds to wait before capturing |
| `timeout` | `number` | `30` | `--timeout` | Total timeout in seconds |
| `waitUntil` | `"domcontentloaded" \| "load" \| "networkidle2" \| "networkidle0"` | `"load"` | `--wait-until` | When to consider navigation complete |
| `userAgent` | `string` | — | `--user-agent` | Custom user agent |
| `proxy` | `string` | — | `--proxy` | HTTP or SOCKS5 proxy URL |
| `stealth` | `boolean` | `false` | `--stealth` | Enable anti-fingerprinting + tracker blocking |
| `eval` | `string` | — | `--eval` | JavaScript expression to evaluate in the page |
| `output` | `string` | — | `--output` | Write output to a file instead of stdout |
| `quiet` | `boolean` | `false` | `--quiet` | Suppress info logs |
| `verbose` | `boolean` | `false` | `--verbose` | Enable debug logging |

#### Dump formats

| Format | Description |
|--------|-------------|
| `html` | Rendered HTML after JavaScript execution |
| `text` | Plain text with navigation/header/footer stripped |
| `markdown` | Clean Markdown via native DOM-to-Markdown conversion (`LP.getMarkdown`) |
| `links` | List of all links on the page |
| `assets` | Inventory of page sub-resources |
| `original` | Raw unmodified source |

---

### `loadObscura(options?)`

Starts a persistent CDP server (`obscura serve`) for multi-page sessions with Puppeteer, Playwright, or any CDP-compatible client.

#### Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `host` | `string` | `"127.0.0.1"` | Bind address for the CDP server |
| `port` | `number` | Auto (free port) | CDP WebSocket port |
| `stealth` | `boolean` | `false` | Enable anti-detection + tracker blocking |
| `startupTimeoutMs` | `number` | `10000` | Timeout for binary startup |
| `extraArgs` | `string[]` | `[]` | Additional CLI flags passed to `obscura serve` |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `endpoint` | `string` | HTTP URL (e.g. `http://127.0.0.1:9222`) |
| `wsEndpoint` | `string` | WebSocket CDP URL (e.g. `ws://127.0.0.1:9222/...`) |
| `close` | `() => Promise<void>` | Kills the Obscura process |

---

## Advanced Usage

### With Puppeteer

```ts
import loadObscura from "obscura-node";
import puppeteer from "puppeteer";

const obscura = await loadObscura({ stealth: true });
const browser = await puppeteer.connect({ browserWSEndpoint: obscura.wsEndpoint });
const page = await browser.newPage();

await page.goto("https://example.com");
const title = await page.title();
console.log(title);

await browser.close();
await obscura.close();
```

### With Playwright

```ts
import loadObscura from "obscura-node";
import { chromium } from "playwright";

const obscura = await loadObscura();
const browser = await chromium.connectOverCDP(obscura.endpoint);
const page = await browser.newPage();

await page.goto("https://example.com");
console.log(await page.title());

await browser.close();
await obscura.close();
```

### Stealth mode

```ts
const browser = await loadObscura({
  stealth: true,  // anti-fingerprinting + blocks 3,520 tracker domains
});
```

Equivalent to `obscura serve --stealth`. Enables per-session fingerprint randomization (GPU, screen, canvas, audio, battery), `navigator.webdriver = undefined`, native function masking, and TLS ClientHello randomization.

### Custom host and port

```ts
const browser = await loadObscura({
  host: "0.0.0.0",  // listen on all interfaces
  port: 9222,        // fixed port
});
```

### Extra CLI arguments

```ts
const browser = await loadObscura({
  stealth: true,
  extraArgs: [
    "--proxy", "socks5://127.0.0.1:9050",
    "--user-agent", "Mozilla/5.0 ...",
    "--workers", "4",
  ],
});
```

See the [Obscura CLI reference](https://github.com/h4ckf0r0day/obscura/wiki/CLI-reference) for all available flags.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OBSCURA_RELEASE_TAG` | `v0.1.8` | GitHub release tag for the Obscura binary |
| `OBSCURA_DOWNLOAD_BASE_URL` | `https://github.com/h4ckf0r0day/obscura/releases/download` | Override download URL |
| `NODE_OBSCURA_SKIP_DOWNLOAD` | — | Set to `"1"` to skip binary download |

---

## Platform Support

| OS | Architecture | Supported |
|----|-------------|-----------|
| Linux | x64 | ✅ |
| macOS | ARM64 (Apple Silicon) | ✅ |
| macOS | x64 (Intel) | ✅ |
| Windows | x64 | ✅ |

---

## Use Cases

- **AI agents** — give agents a lightweight, stealth-capable browser for web research and interaction
- **Web scraping** — extract data at scale with 10x less memory than headless Chrome
- **Automated testing** — run Puppeteer/Playwright tests with faster startup and lower resource usage
- **MCP servers** — Obscura ships a built-in MCP server for AI agent tools (`obscura mcp`)
- **CI/CD pipelines** — single binary, no Chrome install needed, Docker-friendly (distroless image ~57 MB)

---

## How it works

```
obscura-node (npm package)
       │
       ├── src/utils/install.ts  →  Downloads Obscura binary from GitHub releases
       │                            Extracts to src/binaries/<platform>/obscura
       │
       ├── ObscuraFetch(url, opts)
       │     └──  spawns `obscura fetch <url> --dump <format> ...`
       │          Captures stdout  →  returns rendered content as string
       │
       └── loadObscura(opts)
             └──  spawns `obscura serve --port <port>`
                  Polls CDP /json/version until ready
                  Returns { endpoint, wsEndpoint, close }
```

---

## Related

- [Obscura (Rust engine)](https://github.com/h4ckf0r0day/obscura) — the core headless browser
- [obscura-benchmark](https://github.com/h4ckf0r0day/obscura-benchmark) — official benchmarks
- [Puppeteer](https://pptr.dev) — CDP browser automation library
- [Playwright](https://playwright.dev) — cross-browser automation framework

---

## License

ISC

---

## Credits

[Obscura](https://github.com/h4ckf0r0day/obscura) was created by [@h4ckf0r0day](https://github.com/h4ckf0r0day). This Node.js wrapper is maintained separately but relies entirely on the original Obscura binary. If you find this useful, please also [star the original repo](https://github.com/h4ckf0r0day/obscura).
