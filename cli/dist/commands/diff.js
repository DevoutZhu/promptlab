import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { cwd } from "node:process";
import chalk from "chalk";
import ora from "ora";
import { apiGet, ApiError } from "../api.js";
function computeDiff(local, remote) {
    const localLines = local.split("\n");
    const remoteLines = remote.split("\n");
    // Simple line-level diff using LCS
    const m = localLines.length;
    const n = remoteLines.length;
    // Build LCS table
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (localLines[i - 1] === remoteLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            }
            else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    const lcsLength = dp[m][n];
    const added = n - lcsLength;
    const removed = m - lcsLength;
    return { added, removed };
}
function printUnifiedDiff(local, remote, localLabel, remoteLabel) {
    const localLines = local.split("\n");
    const remoteLines = remote.split("\n");
    // Show a simple side-by-side-ish diff
    const maxLen = Math.max(localLines.length, remoteLines.length);
    // Compute LCS to align lines
    const m = localLines.length;
    const n = remoteLines.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (localLines[i - 1] === remoteLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            }
            else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    // Backtrack to build a unified diff
    const hunks = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && localLines[i - 1] === remoteLines[j - 1]) {
            hunks.unshift({ kind: "same", line: localLines[i - 1] });
            i--;
            j--;
        }
        else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            hunks.unshift({ kind: "add", remoteIdx: j - 1, line: remoteLines[j - 1] });
            j--;
        }
        else if (i > 0) {
            hunks.unshift({ kind: "remove", localIdx: i - 1, line: localLines[i - 1] });
            i--;
        }
    }
    // Print with context (3 lines around changes)
    const contextSize = 3;
    const visible = new Set();
    for (let k = 0; k < hunks.length; k++) {
        if (hunks[k].kind !== "same") {
            for (let c = Math.max(0, k - contextSize); c < Math.min(hunks.length, k + contextSize + 1); c++) {
                visible.add(c);
            }
        }
    }
    console.log(chalk.bold(`\n--- ${localLabel}`));
    console.log(chalk.bold(`+++ ${remoteLabel}`));
    let lastPrinted = -2;
    for (let k = 0; k < hunks.length; k++) {
        if (!visible.has(k)) {
            continue;
        }
        if (k - lastPrinted > 1 && lastPrinted >= 0) {
            console.log(chalk.dim("  ..."));
        }
        lastPrinted = k;
        const hunk = hunks[k];
        switch (hunk.kind) {
            case "same":
                console.log(chalk.dim(`  ${hunk.line}`));
                break;
            case "add":
                console.log(chalk.green(`+ ${hunk.line}`));
                break;
            case "remove":
                console.log(chalk.red(`- ${hunk.line}`));
                break;
        }
    }
    console.log();
}
export async function diff(name) {
    const localFile = resolve(`${name}.prompt.md`);
    // Check for local file
    if (!existsSync(localFile)) {
        console.error(chalk.red(`Error: Local file not found: ${relative(cwd(), localFile)}`) +
            "\n  A local .prompt.md file is needed to diff against remote." +
            "\n  Run " +
            chalk.cyan(`promptlab pull ${name}`) +
            " to fetch it first.");
        process.exit(1);
    }
    const localContent = readFileSync(localFile, "utf-8");
    const spinner = ora(`Fetching remote version of "${chalk.cyan(name)}"...`).start();
    try {
        const remote = await apiGet(`/api/prompts/${encodeURIComponent(name)}`);
        spinner.stop();
        const diffStats = computeDiff(localContent, remote.content);
        if (diffStats.added === 0 && diffStats.removed === 0) {
            console.log(chalk.green("✓") + " Local and remote are identical.");
            console.log(chalk.dim(`  Remote version: ${remote.version}, updated: ${remote.updatedAt}`));
            return;
        }
        console.log(chalk.yellow(`${diffStats.removed} line(s) removed, ${diffStats.added} line(s) added.`));
        console.log(chalk.dim(`  Remote version: ${remote.version}, updated: ${remote.updatedAt}`));
        printUnifiedDiff(localContent, remote.content, `local (${relative(cwd(), localFile)})`, `remote (${name} v${remote.version})`);
    }
    catch (err) {
        spinner.fail(chalk.red("Diff failed"));
        if (err instanceof ApiError) {
            if (err.status === 404) {
                console.error(chalk.red(`  Prompt "${name}" does not exist on the server.`) +
                    "\n  Use " +
                    chalk.cyan("promptlab list") +
                    " to see available prompts, or push it first with " +
                    chalk.cyan("promptlab push") +
                    ".");
            }
            else {
                console.error(chalk.red(`  HTTP ${err.status} on ${err.path}`));
            }
        }
        else {
            const message = err instanceof Error ? err.message : String(err);
            console.error(chalk.red(`  ${message}`));
        }
        process.exit(1);
    }
}
//# sourceMappingURL=diff.js.map