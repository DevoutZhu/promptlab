import { readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { statSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { apiPost, ApiError } from "../api.js";

interface PushResponse {
  id: string;
  name: string;
  version: number;
}

export async function push(filePath: string): Promise<void> {
  const resolvedPath = resolve(filePath);

  if (!existsSync(resolvedPath)) {
    console.error(
      chalk.red(`Error: File not found: ${resolvedPath}`) +
        "\n  Make sure the file path is correct and the file exists."
    );
    process.exit(1);
  }

  const stats = statSync(resolvedPath);
  if (!stats.isFile()) {
    console.error(
      chalk.red(`Error: ${resolvedPath} is not a file.`) +
        "\n  Only regular .prompt.md files can be pushed."
    );
    process.exit(1);
  }

  const content = readFileSync(resolvedPath, "utf-8");
  const name = basename(resolvedPath, ".prompt.md").replace(/\.prompt$/, "") || basename(resolvedPath);

  if (!content.trim()) {
    console.warn(chalk.yellow("Warning: File is empty. Push anyway? (add content first)"));
  }

  const spinner = ora(`Pushing prompt "${chalk.cyan(name)}"...`).start();

  try {
    const result = await apiPost<PushResponse>("/api/prompts", {
      name,
      content,
      filename: basename(resolvedPath),
    });

    spinner.succeed(
      chalk.green(`Pushed "${result.name}" (v${result.version})`)
    );
    console.log(chalk.dim(`  ID: ${result.id}`));
  } catch (err) {
    spinner.fail(chalk.red("Push failed"));

    if (err instanceof ApiError) {
      console.error(
        chalk.red(`  HTTP ${err.status} on ${err.path}`) +
          (err.message ? `\n  ${err.message}` : "")
      );
      if (err.status === 401) {
        console.error(
          chalk.yellow("  Hint: Authentication failed. Set your token via") +
            chalk.cyan(" PROMPTLAB_TOKEN ") +
            chalk.yellow("environment variable.")
        );
      }
    } else {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`  ${message}`));
    }
    process.exit(1);
  }
}
