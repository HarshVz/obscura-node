import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { getPlatformKey } from "./start.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { execFileSync } from 'child_process';
import { Extract } from "unzipper";
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
const RELEASE_TAG = process.env.OBSCURA_RELEASE_TAG || "v0.1.8";
const DOWNLOAD_BASE_URL = process.env.OBSCURA_DOWNLOAD_BASE_URL ||
    "https://github.com/h4ckf0r0day/obscura/releases/download";
const SKIP_DOWNLOAD = process.env.NODE_OBSCURA_SKIP_DOWNLOAD === "1";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = __dirname;
const ASSET_BY_PLATFORM = {
    "linux-x64": "obscura-x86_64-linux.tar.gz",
    "darwin-arm64": "obscura-aarch64-macos.tar.gz",
    "darwin-x64": "obscura-x86_64-macos.tar.gz",
    "win32-x64": "obscura-x86_64-windows.zip",
};
async function extractTarGz(archive, dest) {
    execFileSync('tar', ['-xzf', archive, '-C', dest], { stdio: 'inherit' });
}
// For .zip (using unzipper which works cross-platform):
async function extractZip(archive, dest) {
    await pipeline(createReadStream(archive), Extract({ path: dest }));
}
function findBinary(dir) {
    const searchName = process.platform === "win32" ? "obscura.exe" : "obscura";
    const files = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
    for (const file of files) {
        if (file.isFile() && file.name === searchName) {
            return path.join(file.parentPath, file.name);
        }
    }
    throw new Error(`No ${searchName} found in ${dir}`);
}
function download(url, destination, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: {
                "User-Agent": "node-obscura",
            },
        }, (response) => {
            if (response.statusCode &&
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location) {
                response.resume();
                if (redirectCount >= 5) {
                    reject(new Error(`Too many redirects while downloading ${url}`));
                    return;
                }
                download(response.headers.location, destination, redirectCount + 1)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            if (!response.statusCode || response.statusCode >= 400) {
                response.resume();
                reject(new Error(`Failed to download ${url}: status ${response.statusCode || "unknown"}`));
                return;
            }
            const file = fs.createWriteStream(destination);
            response.pipe(file);
            file.on("finish", () => {
                file.close(resolve);
            });
            file.on("error", (error) => {
                file.close(() => reject(error));
            });
        });
        request.on("error", reject);
    });
}
export async function main() {
    if (SKIP_DOWNLOAD) {
        console.log("[node-obscura] Skipping binary download because NODE_OBSCURA_SKIP_DOWNLOAD=1");
        return;
    }
    const platformKey = getPlatformKey();
    if (!platformKey) {
        console.warn(`[node-obscura] Skipping download for unsupported platform ${process.platform}/${process.arch}.`);
        return;
    }
    const assetName = ASSET_BY_PLATFORM[platformKey];
    const targetDir = path.join(PACKAGE_ROOT, "binaries", platformKey);
    const binaryName = process.platform === "win32" ? "obscura.exe" : "obscura";
    const targetBinary = path.join(targetDir, binaryName);
    if (fs.existsSync(targetBinary)) {
        return;
    }
    fs.mkdirSync(targetDir, { recursive: true });
    const downloadUrl = `${DOWNLOAD_BASE_URL}/${RELEASE_TAG}/${assetName}`;
    const tempArchive = path.join(os.tmpdir(), `${assetName}-${Date.now()}`);
    const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "node-obscura-"));
    try {
        console.log(`[node-obscura] Downloading ${downloadUrl}`);
        await download(downloadUrl, tempArchive);
        // execFileSync("tar", ["-xzf", tempArchive, "-C", extractDir], {
        //   stdio: "inherit",
        // });
        if (assetName.endsWith(".zip")) {
            await extractZip(tempArchive, extractDir);
        }
        else if (assetName.endsWith(".tar.gz")) {
            extractTarGz(tempArchive, extractDir);
        }
        else {
            throw new Error(`Unsupported archive type: ${assetName}`);
        }
        const extractedBinary = findBinary(extractDir);
        if (!fs.existsSync(extractedBinary)) {
            throw new Error(`Extracted archive did not contain obscura at ${extractedBinary}`);
        }
        fs.copyFileSync(extractedBinary, targetBinary);
        fs.chmodSync(targetBinary, 0o755);
        console.log(`[node-obscura] Installed Obscura to ${targetBinary}`);
    }
    finally {
        fs.rmSync(extractDir, { recursive: true, force: true });
        fs.rmSync(tempArchive, { force: true });
    }
}
export async function install() {
    try {
        await main();
    }
    catch (error) {
        console.error("[node-obscura] Failed to install Obscura:", error);
        process.exit(1);
    }
}
//# sourceMappingURL=install.js.map