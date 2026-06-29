import { promises as fs } from "fs";
import { dirname, join, relative } from "path";

export interface SyncResult {
  agentsFound: number;
  filesCreated: number;
  filesUpdated: number;
  createdPaths: string[];
  updatedPaths: string[];
  errors: string[];
}

export async function syncAgentsWithConfigFiles(
  rootDir: string,
  configFilenames: string[]
): Promise<SyncResult> {
  const result: SyncResult = {
    agentsFound: 0,
    filesCreated: 0,
    filesUpdated: 0,
    createdPaths: [],
    updatedPaths: [],
    errors: [],
  };

  try {
    // Check for .agents/AGENTS.md (special case)
    const agentsDirPath = join(rootDir, ".agents", "AGENTS.md");
    const hasAgentsDirFile = await fileExists(agentsDirPath);

    if (hasAgentsDirFile) {
      result.agentsFound++;
      for (const configFilename of configFilenames) {
        const configPath = join(rootDir, configFilename);
        try {
          const { created, updated } = await ensureReference(
            configPath,
            "@.agents/AGENTS.md"
          );
          if (created) {
            result.filesCreated++;
            result.createdPaths.push(`./${configFilename}`);
          }
          if (updated) {
            result.filesUpdated++;
            result.updatedPaths.push(`./${configFilename}`);
          }
        } catch (err) {
          result.errors.push(
            `Failed to process ${configPath}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    // Process all other AGENTS.md files (excluding .agents/AGENTS.md)
    const otherAgentsMdFiles = await getAllAgentsMdFilesExcluding(
      rootDir,
      agentsDirPath
    );
    result.agentsFound += otherAgentsMdFiles.length;

    for (const agentsPath of otherAgentsMdFiles) {
      const dirPath = dirname(agentsPath);
      for (const configFilename of configFilenames) {
        const configPath = join(dirPath, configFilename);
        try {
          const { created, updated } = await ensureReference(
            configPath,
            "@AGENTS.md"
          );
          const relPath = `./${relative(rootDir, configPath)}`;
          if (created) {
            result.filesCreated++;
            result.createdPaths.push(relPath);
          }
          if (updated) {
            result.filesUpdated++;
            result.updatedPaths.push(relPath);
          }
        } catch (err) {
          result.errors.push(
            `Failed to process ${configPath}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  } catch (err) {
    result.errors.push(
      `Failed to scan directory: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return result;
}

async function ensureReference(
  filePath: string,
  reference: string
): Promise<{ created: boolean; updated: boolean }> {
  const hasRef = await hasReference(filePath, reference);
  if (hasRef) {
    return { created: false, updated: false };
  }

  const exists = await fileExists(filePath);
  if (!exists) {
    await addReference(filePath, reference);
    return { created: true, updated: false };
  }

  await addReference(filePath, reference);
  return { created: false, updated: true };
}

async function hasReference(
  filePath: string,
  reference: string
): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content.toLowerCase().includes(reference.toLowerCase());
  } catch {
    return false;
  }
}

async function addReference(filePath: string, reference: string): Promise<void> {
  const exists = await fileExists(filePath);

  if (!exists) {
    await fs.writeFile(filePath, `${reference}\n`, "utf-8");
  } else {
    await fs.appendFile(filePath, `\n${reference}\n`, "utf-8");
  }
}

async function getAllAgentsMdFilesExcluding(
  rootDir: string,
  excludePath: string
): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip common non-relevant directories
        if (
          entry.isDirectory() &&
          [".git", "node_modules", ".next", "dist", "build"].includes(
            entry.name
          )
        ) {
          continue;
        }

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name === "AGENTS.md" && fullPath !== excludePath) {
          results.push(fullPath);
        }
      }
    } catch (err) {
      console.error(`Warning: could not read ${dir}`);
    }
  }

  await walk(rootDir);
  return results.sort();
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
