import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import chalk from "chalk";
import { getConfigPath, readConfig } from "../api.js";

export async function login(url: string): Promise<void> {
  // Validate that the URL looks reasonable
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  const config = { ...readConfig(), url: normalized };
  const configPath = getConfigPath();

  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

  console.log(chalk.green("✓") + ` PromptLab service URL set to ${chalk.cyan(normalized)}`);
  console.log(chalk.dim(`  Config saved to ${configPath}`));
}
