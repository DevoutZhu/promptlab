import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";
const CONFIG_PATH = join(homedir(), ".promptlabrc");
export function readConfig() {
    if (!existsSync(CONFIG_PATH)) {
        return {};
    }
    try {
        const raw = readFileSync(CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
export function getBaseUrl() {
    const config = readConfig();
    const url = config.url || process.env.PROMPTLAB_URL;
    if (!url) {
        console.error(chalk.red("Error: PromptLab service URL is not set.") +
            "\n  Run " +
            chalk.cyan("promptlab login <url>") +
            " to configure it.");
        process.exit(1);
    }
    return url.replace(/\/+$/, "");
}
export function getToken() {
    const config = readConfig();
    return config.token || process.env.PROMPTLAB_TOKEN;
}
async function request(method, path, body) {
    const baseUrl = getBaseUrl();
    const token = getToken();
    const url = `${baseUrl}${path}`;
    const headers = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
        let detail = "";
        try {
            const errBody = await response.json();
            detail = errBody.message || errBody.error || JSON.stringify(errBody);
        }
        catch {
            detail = await response.text().catch(() => "");
        }
        throw new ApiError(response.status, detail, path);
    }
    if (response.status === 204) {
        return undefined;
    }
    return response.json();
}
export class ApiError extends Error {
    status;
    path;
    constructor(status, detail, path) {
        super(`API request failed: ${status} on ${path}${detail ? ` — ${detail}` : ""}`);
        this.status = status;
        this.path = path;
        this.name = "ApiError";
    }
}
export function apiPost(path, body) {
    return request("POST", path, body);
}
export function apiGet(path) {
    return request("GET", path);
}
export function getConfigPath() {
    return CONFIG_PATH;
}
//# sourceMappingURL=api.js.map