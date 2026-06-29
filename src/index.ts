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
      }
    }

    validateFilenames(filenames);

    const result = await syncAgentsWithConfigFiles(
      process.cwd(),
      filenames,
      nocheck
    );

    console.log(`Found ${result.agentsFound} AGENTS.md file(s)`);

    if (result.createdPaths.length > 0) {
      console.log(`Created ${result.filesCreated} new config file(s):`);
      result.createdPaths.forEach((path) => console.log(`  ${path}`));
    } else if (result.filesCreated > 0) {
      console.log(`Created ${result.filesCreated} new config file(s)`);
    }

    if (result.updatedPaths.length > 0) {
      console.log(`Updated ${result.filesUpdated} existing config file(s):`);
      result.updatedPaths.forEach((path) => console.log(`  ${path}`));
    } else if (result.filesUpdated > 0) {
      console.log(`Updated ${result.filesUpdated} existing config file(s)`);
    }

    if (result.createdPaths.length === 0 && result.filesCreated === 0 && result.updatedPaths.length === 0 && result.filesUpdated === 0) {
      console.log("No changes needed");
    }

    if (result.warnings.length > 0) {
      console.warn("\nWarnings:");
      result.warnings.forEach((warn) => console.warn(`  - ${warn}`));
    }

    if (result.errors.length > 0) {
      console.error("\nErrors:");
      result.errors.forEach((err) => console.error(`  - ${err}`));
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
