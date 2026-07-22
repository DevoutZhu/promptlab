#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { login } from "./commands/login.js";
import { push } from "./commands/push.js";
import { pull } from "./commands/pull.js";
import { diff } from "./commands/diff.js";
import { status } from "./commands/status.js";
import { list } from "./commands/list.js";

const program = new Command();

program
  .name("promptlab")
  .description("PromptLab CLI — manage prompts from the terminal")
  .version("0.1.0")
  .addHelpText(
    "after",
    `\n${chalk.dim("Examples:")}
  ${chalk.cyan("$ promptlab login https://promptlab.example.com")}  ${chalk.dim("— set the service URL")}
  ${chalk.cyan("$ promptlab push my-prompt.prompt.md")}              ${chalk.dim("— upload a prompt file")}
  ${chalk.cyan("$ promptlab pull my-prompt")}                        ${chalk.dim("— download a prompt")}
  ${chalk.cyan("$ promptlab status")}                                ${chalk.dim("— check project prompt status")}
  ${chalk.cyan("$ promptlab list")}                                  ${chalk.dim("— list all prompts")}
  ${chalk.cyan("$ promptlab diff my-prompt")}                        ${chalk.dim("— diff local vs remote")}
`
  );

program
  .command("login")
  .description("Set the PromptLab service URL")
  .argument("<url>", "PromptLab server URL (e.g. https://promptlab.example.com)")
  .action(async (url: string) => {
    try {
      await login(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

program
  .command("push")
  .description("Push a local .prompt.md file to the PromptLab platform")
  .argument("<file>", "Path to the .prompt.md file to push")
  .action(async (file: string) => {
    try {
      await push(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

program
  .command("pull")
  .description("Pull a prompt from the platform to a local .prompt.md file")
  .argument("<name>", "Name of the prompt to pull")
  .option("-o, --output <file>", "Output file path (default: <name>.prompt.md)")
  .action(async (name: string, options: { output?: string }) => {
    try {
      await pull(name, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

program
  .command("diff")
  .description("Show differences between local and remote version of a prompt")
  .argument("<name>", "Name of the prompt to diff")
  .action(async (name: string) => {
    try {
      await diff(name);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show status of .prompt.md files in the current directory")
  .action(async () => {
    try {
      await status();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List all prompts available on the PromptLab platform")
  .action(async () => {
    try {
      await list();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

// Show help if no command is given
program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
