interface Config {
    url?: string;
    token?: string;
}
export declare function readConfig(): Config;
export declare function getBaseUrl(): string;
export declare function getToken(): string | undefined;
export declare class ApiError extends Error {
    status: number;
    path: string;
    constructor(status: number, detail: string, path: string);
}
export declare function apiPost<T>(path: string, body: unknown): Promise<T>;
export declare function apiGet<T>(path: string): Promise<T>;
export declare function getConfigPath(): string;
export {};
//# sourceMappingURL=api.d.ts.map