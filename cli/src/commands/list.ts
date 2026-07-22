import chalk from "chalk";
import ora from "ora";
import { apiGet, ApiError } from "../api.js";

interface PromptSummary {
  id: string;
  name: string;
  version: number;
  updatedAt: string;
  description?: string;
}

export async function list(): Promise<void> {
  const spinner = ora("Fetching prompts...").start();

  try {
    const prompts = await apiGet<PromptSummary[]>("/api/prompts");

    spinner.stop();

    if (!prompts || prompts.length === 0) {
      console.log(chalk.yellow("No prompts found on the server."));
      console.log(
        chalk.dim("  Create one by pushing a .prompt.md file: ") +
          chalk.cyan("promptlab push <file>")
      );
      return;
    }

    console.log(chalk.bold(`\nPrompts on PromptLab (${prompts.length})\n`));

    // Table header
    console.log(
      chalk.dim("  ") +
        chalk.bold("NAME".padEnd(30)) +
        chalk.bold("VERSION".padEnd(10)) +
        chalk.bold("UPDATED")
    );
    console.log(chalk.dim("  " + "─".repeat(65)));

    for (const p of prompts) {
      const name = p.name.padEnd(30);
      const version = `v${p.version}`.padEnd(10);
      const updated = p.updatedAt
        ? formatRelativeTime(p.updatedAt).padEnd(24)
        : "-".padEnd(24);

      console.log(`  ${chalk.cyan(name)}${version}${chalk.dim(updated)}`);

      if (p.description) {
        console.log(chalk.dim(`    ${p.description}`));
      }
    }

    console.log();
    console.log(
      chalk.dim("  Pull a prompt: ") +
        chalk.cyan("promptlab pull <name>") +
        chalk.dim("    Diff a prompt: ") +
        chalk.cyan("promptlab diff <name>")
    );

  } catch (err) {
    spinner.fail(chalk.red("Failed to fetch prompts"));

    if (err instanceof ApiError) {
      console.error(chalk.red(`  HTTP ${err.status} on ${err.path}`));
      if (err.status === 401) {
        console.error(
          chalk.yellow("  Hint: Authentication required. Set PROMPTLAB_TOKEN to authenticate.")
        );
      }
    } else {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`  ${message}`));
    }
    process.exit(1);
  }
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return date.toLocaleDateString("zh-CN");
  }
  if (diffDay > 0) {
    return `${diffDay}d ago`;
  }
  if (diffHour > 0) {
    return `${diffHour}h ago`;
  }
  if (diffMin > 0) {
    return `${diffMin}m ago`;
  }
  return "just now";
}
