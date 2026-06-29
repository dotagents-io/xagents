#!/usr/bin/env node

import { syncAgentsWithConfigFiles } from "./core.js";
import { validateFilenames } from "./validator.js";

const DEFAULT_FILENAMES = ["CLAUDE.md"];

async function main(): Promise<void> {
  try {
    let filenames = DEFAULT_FILENAMES;
    let nocheck = false;

    for (const arg of process.argv.slice(2)) {
      if (arg.startsWith("--filenames=")) {
        const value = arg.substring("--filenames=".length);
        filenames = value
          .split(",")
          .map((f) => f.trim())
          .filter((f) => f.length > 0);
      } else if (arg === "--nocheck") {
        nocheck = true;
        console.error("Warning: --nocheck skips duplicate detection and will append references even if already present");
      } else {
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
      }
    }

    validateFilenames(filenames);

    const result = await syncAgentsWithConfigFiles(
      process.cwd(),
      filenames,
      nocheck
    );

    if (result.createdPaths.length > 0) {
      console.log("Created:");
      result.createdPaths.forEach((path) => console.log(`  ${path}`));
    }

    if (result.updatedPaths.length > 0) {
      console.log("Updated:");
      result.updatedPaths.forEach((path) => console.log(`  ${path}`));
    }

    if (result.issues.length > 0) {
      console.error("Failed to read:");
      result.issues.forEach((issue) => console.error(`  - ${issue}`));
    }

    if (result.failedPaths.length > 0) {
      console.error("Failed to process:");
      result.failedPaths.forEach(({ path, reason }) => console.error(`  ${path}: ${reason}`));
    }

    console.log(`Found ${result.agentsFound} AGENTS.md file(s)`);

    if (result.issues.length > 0) {
      console.error(`Failed to read ${result.issues.length} locations`);
    }

    if (result.createdPaths.length > 0) {
      console.log(`Created ${result.createdPaths.length} new config file(s)`);
    }

    if (result.updatedPaths.length > 0) {
      console.log(`Updated ${result.updatedPaths.length} existing config file(s)`);
    }

    if (result.failedPaths.length > 0) {
      console.error(`Failed to process ${result.failedPaths.length} config file(s)`);
    }

    if (result.failedPaths.length > 0 || result.issues.length > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error(
      `Fatal error: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
}

main();
