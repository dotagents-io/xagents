import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join, sep } from "path";

export interface DiscoveryResult {
  files: string[];
  errors: string[];
}

export async function discoverAgentsMdFiles(rootDir: string): Promise<DiscoveryResult> {
  const result = (await discoverViaGit(rootDir)) ?? (await discoverViaFs(rootDir));

  result.files.sort((a, b) => {
    const depthA = a.split(sep).length;
    const depthB = b.split(sep).length;
    return depthA !== depthB ? depthA - depthB : a.localeCompare(b);
  });

  return result;
}

async function discoverViaGit(rootDir: string): Promise<DiscoveryResult | null> {
  return new Promise((resolve) => {
    const git = spawn(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      { cwd: rootDir, stdio: ["ignore", "pipe", "ignore"] }
    );

    const chunks: Buffer[] = [];
    git.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));

    git.on("close", (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      const files = Buffer.concat(chunks)
        .toString("utf-8")
        .split("\0")
        .filter((f) => f === "AGENTS.md" || f.endsWith("/AGENTS.md"))
        .map((f) => join(rootDir, f));
      resolve({ files, errors: [] });
    });

    git.on("error", () => resolve(null));
  });
}

const FS_SKIP_DIRS = new Set([".git", "node_modules", ".next", "dist", "build"]);

async function discoverViaFs(rootDir: string): Promise<DiscoveryResult> {
  const files: string[] = [];
  const errors: string[] = [];

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && FS_SKIP_DIRS.has(entry.name)) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name === "AGENTS.md") {
          files.push(fullPath);
        }
      }
    } catch (err) {
      errors.push(
        `Failed to read directory ${dir}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  await walk(rootDir);
  return { files, errors };
}
