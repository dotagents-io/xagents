import { promises as fs } from "fs";
import { dirname, join, relative, resolve, sep } from "path";

export interface SyncResult {
  agentsFound: number;
  filesCreated: number;
  filesUpdated: number;
  createdPaths: string[];
  updatedPaths: string[];
  failedPaths: Array<{ path: string; reason: string }>;
  issues: string[];
}

export async function syncAgentsWithConfigFiles(
  rootDir: string,
  configFilenames: string[],
  nocheck: boolean = false
): Promise<SyncResult> {
  const result: SyncResult = {
    agentsFound: 0,
    filesCreated: 0,
    filesUpdated: 0,
    createdPaths: [],
    updatedPaths: [],
    failedPaths: [],
    issues: [],
  };

  try {
    const { files: allAgentsMdFiles, errors: scanErrors } =
      await getAllAgentsMdFiles(rootDir);
    result.issues.push(...scanErrors);

    // Split into .agents/ paths and other paths
    const agentsPathFiles: string[] = [];
    const otherAgentsMdFiles: string[] = [];

    for (const file of allAgentsMdFiles) {
      const normalized = resolve(file);
      if (normalized.includes(sep + ".agents" + sep)) {
        agentsPathFiles.push(file);
      } else {
        otherAgentsMdFiles.push(file);
      }
    }

    result.agentsFound = allAgentsMdFiles.length;

    // Process regular AGENTS.md files first
    for (const agentsPath of otherAgentsMdFiles) {
      const dirPath = dirname(agentsPath);
      for (const configFilename of configFilenames) {
        const configPath = join(dirPath, configFilename);
        const relPath = `./${relative(rootDir, configPath)}`;
        try {
          const { created, updated } = await ensureReference(
            configPath,
            "@AGENTS.md",
            rootDir,
            nocheck
          );
          if (created) {
            result.filesCreated++;
            result.createdPaths.push(relPath);
          }
          if (updated) {
            result.filesUpdated++;
            result.updatedPaths.push(relPath);
          }
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          result.failedPaths.push({ path: relPath, reason });
        }
      }
    }

    // Process .agents/AGENTS.md files (last, so references stack in config files)
    // Group by parent directory (the directory containing .agents/)
    const agentsByParent: Map<string, string[]> = new Map();

    for (const agentsPath of agentsPathFiles) {
      const relPath = relative(rootDir, agentsPath);
      const parts = relPath.split(sep);
      let agentsIndex = -1;

      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === ".agents") {
          agentsIndex = i;
          break;
        }
      }

      if (agentsIndex === -1) continue;

      const parentPath = join(rootDir, ...parts.slice(0, agentsIndex));
      const referencePath = parts.slice(agentsIndex).join("/");

      if (!agentsByParent.has(parentPath)) {
        agentsByParent.set(parentPath, []);
      }
      agentsByParent.get(parentPath)!.push(referencePath);
    }

    // Write config files with .agents/ references
    for (const [parentPath, references] of agentsByParent) {
      for (const configFilename of configFilenames) {
        const configPath = join(parentPath, configFilename);
        const relPath = `./${relative(rootDir, configPath)}`;
        for (const reference of references) {
          try {
            const { created, updated } = await ensureReference(
              configPath,
              `@${reference}`,
              rootDir,
              nocheck
            );
            if (created) {
              result.filesCreated++;
              result.createdPaths.push(relPath);
            }
            if (updated) {
              result.filesUpdated++;
              result.updatedPaths.push(relPath);
            }
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            result.failedPaths.push({ path: relPath, reason });
          }
        }
      }
    }
  } catch (err) {
    result.issues.push(
      `Failed to scan directory: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return result;
}

async function ensureReference(
  filePath: string,
  reference: string,
  rootDir: string,
  nocheck: boolean = false
): Promise<{ created: boolean; updated: boolean }> {
  if (!isPathUnderRoot(filePath, rootDir)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  if (!nocheck) {
    const hasRef = await hasReference(filePath, reference);
    if (hasRef) {
      return { created: false, updated: false };
    }
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
  const exists = await fileExists(filePath);
  if (!exists) {
    return false;
  }

  const content = await fs.readFile(filePath, "utf-8");
  return content.toLowerCase().includes(reference.toLowerCase());
}

async function addReference(filePath: string, reference: string): Promise<void> {
  const exists = await fileExists(filePath);

  if (!exists) {
    await fs.writeFile(filePath, `${reference}\n`, "utf-8");
  } else {
    await fs.appendFile(filePath, `\n${reference}\n`, "utf-8");
  }
}

async function getAllAgentsMdFiles(
  rootDir: string
): Promise<{ files: string[]; errors: string[] }> {
  const results: string[] = [];
  const errors: string[] = [];

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip symlinks
        if (entry.isSymbolicLink()) {
          continue;
        }

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
        } else if (entry.name === "AGENTS.md") {
          results.push(fullPath);
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err);
      errors.push(`Failed to read directory ${dir}: ${msg}`);
    }
  }

  await walk(rootDir);
  return { files: results.sort(), errors };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

function isPathUnderRoot(filePath: string, rootDir: string): boolean {
  const normalizedRoot = resolve(rootDir);
  const normalizedPath = resolve(filePath);
  return normalizedPath.startsWith(normalizedRoot + sep) || normalizedPath === normalizedRoot;
}
