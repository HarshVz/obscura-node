import type { FetchOptions } from "./types.js";
export declare function getPlatformKey(): "linux-x64" | "darwin-arm64" | "darwin-x64" | "win32-x64";
export declare function getBinaryPath(): Promise<string>;
export declare function fetch(url: string, options?: FetchOptions): Promise<string>;
export declare function loadObscura(options?: Record<string, any>): Promise<{
    endpoint: string;
    wsEndpoint: string;
    close: () => Promise<void>;
}>;
//# sourceMappingURL=start.d.ts.map