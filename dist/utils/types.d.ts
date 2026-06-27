export type DumpOptions = "html" | "text" | "markdown" | "links" | "assets" | "original";
export type waitUntilOptions = "domcontentloaded" | "load" | "networkidle2" | "networkidle0";
export interface FetchOptions {
    dump?: DumpOptions;
    selector?: string;
    wait?: number;
    timeout?: number;
    waitUntil?: waitUntilOptions;
    userAgent?: string;
    proxy?: string;
    stealth?: boolean;
    eval?: string;
    output?: string;
    quiet?: boolean;
    verbose?: boolean;
    logs?: boolean;
}
//# sourceMappingURL=types.d.ts.map