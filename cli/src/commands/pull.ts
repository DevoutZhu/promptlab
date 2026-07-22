import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { apiGet, ApiError } from "../api.js";

interface PullResponse {
  id: string;
  name: string;
  content: string;
  version: number;
  updatedAt: string;
}

export async function pull(name: string, options?: { output?: string }): Promise<void> {
  const spinner = ora(`Pulling prompt "${chalk.cyan(name)}"...`).start();

  try {
    const prompt = await apiGet<PullResponse>(`/api/prompts/${encodeURIComponent(name)}`);

    const filename = options?.output || `${name}.prompt.md`;
    const outputPath = resolve(filename);

    // Warn if file already exists
    if (existsSync(outputPath)) {
      spinner.warn(chalk.yellow(`File already exists, will be overwritten: ${filename}`));
      spinner.start(`Pulling prompt "${chalk.cyan(name)}"...`);
    }

    writeFileSync(outputPath, prompt.content, "utf-8");

    spinner.succeed(
      chalk.green(`Pulled "${prompt.name}" (v${prompt.version})`) +
        chalk.dim(` -> ${filename}`)
    );

    if (prompt.updatedAt) {
      console.log(chalk.dim(`  Last updated: ${prompt.updatedAt}`));
    }
  } catch (err) {
    spinner.fail(chalk.red("Pull failed"));

    if (err instanceof ApiError) {
      if (err.status === 404) {
        console.error(
          chalk.red(`  Prompt "${name}" not found.`) +
            "\n  Use " +
            chalk.cyan("promptlab list") +
            " to see available prompts."
        );
      } else {
        console.error(chalk.red(`  HTTP ${err.status} on ${err.path}`));
      }
    } else {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`  ${message}`));
    }
    process.exit(1);
  }
}
