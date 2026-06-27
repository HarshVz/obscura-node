import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { ChildProcess, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { install } from "./install.js";
import { Readable } from "stream";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export function getPlatformKey() {
    if (process.platform === "linux" && process.arch === "x64") {
        return "linux-x64";
    }
    if (process.platform === "darwin" && process.arch === "arm64") {
        return "darwin-arm64";
    }
    if (process.platform === "darwin" && process.arch === "x64") {
        return "darwin-x64";
    }
    if (process.platform === "win32" && process.arch === "x64") {
        return "win32-x64";
    }
    throw new Error(`Unsupported node-obscura platform: ${process.platform}/${process.arch}.`);
}
export async function getBinaryPath() {
    const fileName = getPlatformKey() === "win32-x64" ? "obscura.exe" : "obscura";
    const binaryPath = path.join(__dirname, "binaries", getPlatformKey(), fileName);
    if (!fs.existsSync(binaryPath)) {
        console.log(`Obscura binary not found at ${binaryPath}. Trying to Reinstall it!`);
        await install();
        // even after one install it doesnt exist then throw up
        if (!fs.existsSync(binaryPath)) {
            throw new Error(`Obscura binary not found at ${binaryPath}. Reinstall node-obscura so postinstall can fetch it.`);
        }
    }
    return binaryPath;
}
function logOutput(stream, prefix) {
    let buffer = "";
    stream.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";
        for (const line of lines) {
            if (line.trim()) {
                console.log(`${prefix} ${line}`);
            }
        }
    });
    stream.on("end", () => {
        if (buffer.trim()) {
            console.log(`${prefix} ${buffer.trim()}`);
        }
    });
}
function findOpenPort(host) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on("error", reject);
        server.listen(0, host, () => {
            const address = server.address();
            if (!address || typeof address === "string") {
                server.close(() => reject(new Error("Failed to allocate an Obscura port.")));
                return;
            }
            server.close((closeError) => {
                if (closeError) {
                    reject(closeError);
                    return;
                }
                resolve(address.port);
            });
        });
    });
}
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
            if (!response.statusCode || response.statusCode >= 400) {
                response.resume();
                reject(new Error(`Unexpected status ${response.statusCode || "unknown"} from ${url}`));
                return;
            }
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => {
                body += chunk;
            });
            response.on("end", () => {
                try {
                    resolve(JSON.parse(body));
                }
                catch (error) {
                    reject(error);
                }
            });
        });
        request.on("error", reject);
    });
}
async function waitForReady(endpoint, timeoutMs, child) {
    const startedAt = Date.now();
    const versionUrl = `${endpoint}/json/version`;
    while (Date.now() - startedAt < timeoutMs) {
        if (child.exitCode !== null) {
            throw new Error(`Obscura exited before becoming ready (exit code ${child.exitCode}).`);
        }
        try {
            const version = (await fetchJson(versionUrl));
            if (version && version.webSocketDebuggerUrl) {
                return version;
            }
        }
        catch {
            // Keep polling until timeout.
        }
        await wait(200);
    }
    throw new Error(`Timed out waiting for Obscura to become ready at ${versionUrl}.`);
}
async function stopChild(child) {
    if (child.exitCode !== null) {
        return;
    }
    child.kill("SIGTERM");
    const startedAt = Date.now();
    while (child.exitCode === null && Date.now() - startedAt < 3000) {
        await wait(100);
    }
    if (child.exitCode === null) {
        child.kill("SIGKILL");
    }
}
// example
// const obscura = await startObscura({
//   stealth: true,
//   startupTimeoutMs: 10000,
//   port: 9222,
// });
// export async function scrape(
//   urls: string | string[],
//   options: ScrapeOptions = {}
// ): Promise<string> {
//   const urlList = Array.isArray(urls) ? urls : [urls];
//   const args = ["scrape", ...urlList];
//   // Add flags only if they are provided
//   if (options.eval) args.push("--eval", options.eval);
//   if (options.verbose) args.push("--verbose");
//   if (options.concurrency !== undefined) args.push("--concurrency", String(options.concurrency));
//   if (options.format) args.push("--format", options.format);
//   if (options.timeout !== undefined) args.push("--timeout", String(options.timeout));
//   if (options.quiet) args.push("--quiet");
//   if (options.proxy) args.push("--proxy", options.proxy);
//   if (options.allowPrivateNetwork) args.push("--allow-private-network");
//   const binaryPath = await getBinaryPath();
//   const child = spawn(binaryPath, args, {
//     stdio: ["ignore", "pipe", "pipe"],
//   });
//   if (!child.stdout || !child.stderr) {
//     throw new Error("Failed to attach to Obscura stdout/stderr.");
//   }
//   return new Promise((resolve, reject) => {
//     let stdout = "";
//     let stderr = "";
//     child.stdout.on("data", (chunk) => {
//       stdout += chunk.toString();
//     });
//     child.stderr.on("data", (chunk) => {
//       stderr += chunk.toString();
//       if (options.logs) {
//         process.stderr.write(chunk);
//       }
//     });
//     child.on("error", reject);
//     child.on("close", (code) => {
//       if (code !== 0) {
//         return reject(new Error(stderr || `Exited with code ${code}`));
//       }
//       resolve(stdout);
//     });
//   });
// }
export async function fetch(url, options = {}) {
    let format = options.dump ?? "html";
    const args = ["fetch", url, "--dump", String(format)];
    if (options.stealth)
        args.push("--stealth");
    if (options.selector)
        args.push("--selector", options.selector);
    if (options.wait)
        args.push("--wait", String(options.wait));
    if (options.timeout)
        args.push("--timeout", String(options.timeout));
    if (options.waitUntil)
        args.push("--wait-until", options.waitUntil);
    if (options.userAgent)
        args.push("--user-agent", options.userAgent);
    if (options.proxy)
        args.push("--proxy", options.proxy);
    if (options.eval)
        args.push("--eval", options.eval);
    if (options.output)
        args.push("--output", options.output);
    if (options.quiet)
        args.push("--quiet");
    if (options.verbose)
        args.push("--verbose");
    const binaryPath = await getBinaryPath();
    const child = spawn(binaryPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
    });
    if (!child.stdout || !child.stderr) {
        throw new Error("Failed to attach to Obscura stdout/stderr.");
    }
    return new Promise((resolve, reject) => {
        const child = spawn(binaryPath, args);
        let stdout = "";
        let stderr = "";
        child.stdout?.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
            if (options.logs) {
                process.stderr.write(chunk);
            }
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code !== 0) {
                return reject(new Error(stderr || `Exited with code ${code}`));
            }
            resolve(stdout);
        });
    });
}
export async function loadObscura(options = {}) {
    const host = options.host || "127.0.0.1";
    const port = options.port || (await findOpenPort(host));
    const endpoint = `http://${host}:${port}`;
    const args = ["serve", "--port", String(port)];
    if (host !== "127.0.0.1") {
        args.push("--host", host);
    }
    if (options.stealth) {
        args.push("--stealth");
    }
    if (Array.isArray(options.extraArgs) && options.extraArgs.length > 0) {
        args.push(...options.extraArgs);
    }
    const binaryPath = await getBinaryPath();
    const child = spawn(binaryPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
    });
    if (!child.stdout || !child.stderr) {
        throw new Error("Failed to attach to Obscura stdout/stderr.");
    }
    // Log output
    // child.stdout.on("data", (chunk) =>
    //   console.log("[obscura]", chunk.toString().trim()),
    // );
    // child.stderr.on("data", (chunk) =>
    //   console.error("[obscura:stderr]", chunk.toString().trim()),
    // );
    if (options.logs) {
        logOutput(child.stdout, "[obscura]");
        logOutput(child.stderr, "[obscura:stderr]");
    }
    try {
        const version = await waitForReady(endpoint, options.startupTimeoutMs || 10000, child);
        // console.log("started");
        return {
            endpoint,
            wsEndpoint: version.webSocketDebuggerUrl,
            close: async () => stopChild(child),
        };
    }
    catch (error) {
        await stopChild(child);
        throw error;
    }
}
// await startObscura();
// console.log(getPlatformKey());
// https://github.com/h4ckf0r0day/obscura/releases/download/v0.1.8/obscura-x86_64-windows.zip
//# sourceMappingURL=start.js.map