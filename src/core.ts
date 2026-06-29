import { promises as fs } from "fs";
import { dirname, join, relative, sep } from "path";
import { discoverAgentsMdFiles } from "./discovery.js";

export interface SyncResult {
  agentsFound: number;
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
    createdPaths: [],
    updatedPaths: [],
    failedPaths: [],
    issues: [],
  };

  try {
    const { files: allAgentsMdFiles, errors: scanErrors } =
      await discoverAgentsMdFiles(rootDir);
    result.issues.push(...scanErrors);

    const agentsPathFiles: string[] = [];
    const otherAgentsMdFiles: string[] = [];

    for (const file of allAgentsMdFiles) {
      if (file.includes(sep + ".agents" + sep)) {
        agentsPathFiles.push(file);
      } else {
        otherAgentsMdFiles.push(file);
      }
    }

    result.agentsFound = allAgentsMdFiles.length;

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
          if (created) result.createdPaths.push(relPath);
          if (updated) result.updatedPaths.push(relPath);
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          result.failedPaths.push({ path: relPath, reason });
        }
      }
    }

    // Group .agents/AGENTS.md files by their parent directory
    const agentsByParent: Map<string, string[]> = new Map();

    for (const agentsPath of agentsPathFiles) {
      const relPath = relative(rootDir, agentsPath);
      const parts = relPath.split(sep);
      const agentsIndex = parts.indexOf(".agents");

      if (agentsIndex === -1) continue;

      const parentPath = join(rootDir, ...parts.slice(0, agentsIndex));
      const referencePath = parts.slice(agentsIndex).join("/");

      if (!agentsByParent.has(parentPath)) {
        agentsByParent.set(parentPath, []);
      }
      agentsByParent.get(parentPath)!.push(referencePath);
    }

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
            if (created) result.createdPaths.push(relPath);
            if (updated) result.updatedPaths.push(relPath);
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
  if (!(await isPathUnderRoot(filePath, rootDir))) {
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
    await fs.writeFile(filePath, `${reference}\n`, "utf-8");
    return { created: true, updated: false };
  }

  await appendReference(filePath, reference);
  return { created: false, updated: true };
}

async function hasReference(filePath: string, reference: string): Promise<boolean> {
  const exists = await fileExists(filePath);
  if (!exists) return false;
  const content = await fs.readFile(filePath, "utf-8");
  return content.toLowerCase().includes(reference.toLowerCase());
}

async function appendReference(filePath: string, reference: string): Promise<void> {
  const fh = await fs.open(filePath, "a+");
  try {
    const { size } = await fh.stat();
    let prefix = "\n";
    if (size > 0) {
      const buf = Buffer.alloc(1);
      await fh.read(buf, 0, 1, size - 1);
      if (buf[0] === 0x0a) prefix = "";
    }
    await fh.appendFile(`${prefix}${reference}\n`);
  } finally {
    await fh.close();
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}

async function isPathUnderRoot(filePath: string, rootDir: string): Promise<boolean> {
  try {
    const normalizedRoot = await fs.realpath(rootDir);
    const prefix = normalizedRoot.endsWith(sep) ? normalizedRoot : normalizedRoot + sep;

    const exists = await fileExists(filePath);
    if (exists) {
      const realPath = await fs.realpath(filePath);
      return realPath.startsWith(prefix) || realPath === normalizedRoot;
    }

    const realDir = await fs.realpath(dirname(filePath));
    return realDir.startsWith(prefix) || realDir === normalizedRoot;
  } catch {
    return false;
  }
}
