import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, relative, basename } from "node:path";
import { cwd } from "node:process";
import { readdirSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { apiGet, ApiError, readConfig } from "../api.js";

interface PromptSummary {
  id: string;
  name: string;
  version: number;
  updatedAt: string;
}

interface PromptStatus {
  name: string;
  localFile: string;
  localExists: boolean;
  localSize: number;
  localModified: string;
  remoteVersion: number | null;
  remoteUpdated: string | null;
  synced: boolean;
  error?: string;
}

function findPromptFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  try {
    const entries = readdirSync(dir);
    return entries
      .filter((f) => f.endsWith(".prompt.md"))
      .map((f) => resolve(dir, f));
  } catch {
    return [];
  }
}

export async function status(): Promise<void> {
  const config = readConfig();
  if (!config.url) {
    console.error(
      chalk.red("Error: PromptLab service URL is not set.") +
        "\n  Run " +
        chalk.cyan("promptlab login <url>") +
        " to configure it."
    );
    process.exit(1);
  }

  const promptFiles = findPromptFiles(cwd());
  const names = promptFiles.map((f) => basename(f, ".prompt.md"));

  const spinner = ora("Checking status...").start();

  // Fetch remote prompt list
  let remoteList: PromptSummary[] = [];
  try {
    remoteList = await apiGet<PromptSummary[]>("/api/prompts");
  } catch {
    spinner.warn("Could not connect to PromptLab server. Showing local status only.");
    remoteList = [];
  }

  const remoteMap = new Map<string, PromptSummary>();
  for (const p of remoteList) {
    remoteMap.set(p.name, p);
  }

  spinner.stop();

  // Collect statuses for all local .prompt.md files
  const statuses: PromptStatus[] = [];

  for (const file of promptFiles) {
    const name = basename(file, ".prompt.md");
    const stats = statSync(file);
    const remote = remoteMap.get(name);

    statuses.push({
      name,
      localFile: relative(cwd(), file),
      localExists: true,
      localSize: stats.size,
      localModified: stats.mtime.toISOString(),
      remoteVersion: remote ? remote.version : null,
      remoteUpdated: remote ? remote.updatedAt : null,
      synced: remote !== undefined,
    });
  }

  // Also show remote-only prompts (pulled but no local file)
  for (const [name, remote] of remoteMap) {
    if (!names.includes(name)) {
      statuses.push({
        name,
        localFile: "(not pulled)",
        localExists: false,
        localSize: 0,
        localModified: "-",
        remoteVersion: remote.version,
        remoteUpdated: remote.updatedAt,
        synced: false,
      });
    }
  }

  if (statuses.length === 0) {
    console.log(chalk.yellow("No .prompt.md files found in the current directory."));
    console.log(
      chalk.dim("  Run ") +
        chalk.cyan("promptlab pull <name>") +
        chalk.dim(" to get started, or ") +
        chalk.cyan("promptlab list") +
        chalk.dim(" to see available prompts.")
    );
    return;
  }

  // Print status table
  console.log(chalk.bold("\nPrompt Status"));
  console.log(chalk.dim("─".repeat(70)));

  for (const s of statuses) {
    const icon = s.localExists ? (s.synced ? chalk.green("●") : chalk.yellow("●")) : chalk.red("○");
    const statusLabel = s.localExists
      ? s.synced
        ? "tracked"
        : "local only"
      : "remote only";
    const statusColor = s.localExists ? (s.synced ? chalk.green : chalk.yellow) : chalk.red;

    console.log(`  ${icon} ${chalk.bold(s.name)} ${statusColor(`[${statusLabel}]`)}`);
    console.log(chalk.dim(`    Local:  ${s.localFile} (${formatBytes(s.localSize)})`));
    if (s.remoteVersion !== null) {
      console.log(chalk.dim(`    Remote: v${s.remoteVersion} — ${s.remoteUpdated}`));
    }
    if (!s.localExists && s.remoteVersion !== null) {
      console.log(chalk.yellow(`    Hint:  Run promptlab pull ${s.name} to download`));
    }
    if (s.localExists && !s.synced) {
      console.log(chalk.yellow(`    Hint:  Run promptlab push ${s.localFile} to upload`));
    }
    console.log();
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
