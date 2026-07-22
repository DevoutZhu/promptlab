import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";

const CONFIG_PATH = join(homedir(), ".promptlabrc");

interface Config {
  url?: string;
  token?: string;
}

export function readConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    return {};
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getBaseUrl(): string {
  const config = readConfig();
  const url = config.url || process.env.PROMPTLAB_URL;
  if (!url) {
    console.error(
      chalk.red("Error: PromptLab service URL is not set.") +
        "\n  Run " +
        chalk.cyan("promptlab login <url>") +
        " to configure it."
    );
    process.exit(1);
  }
  return url.replace(/\/+$/, "");
}

export function getToken(): string | undefined {
  const config = readConfig();
  return config.token || process.env.PROMPTLAB_TOKEN;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const baseUrl = getBaseUrl();
  const token = getToken();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
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
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new ApiError(response.status, detail, path);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    detail: string,
    public path: string
  ) {
    super(`API request failed: ${status} on ${path}${detail ? ` — ${detail}` : ""}`);
    this.name = "ApiError";
  }
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
