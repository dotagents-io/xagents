import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { discoverAgentsMdFiles } from "../src/discovery.js";
import { TestDir } from "./helpers.js";

let td: TestDir;

beforeEach(async () => { td = await TestDir.create(); });
afterEach(async () => { await td.cleanup(); });

function git(args: string): void {
  execSync(`git ${args}`, { cwd: td.path, stdio: "ignore" });
}

function initRepo(): void {
  git("init");
  git("config user.email test@example.com");
  git("config user.name Test");
}

describe("discoverAgentsMdFiles", () => {
  describe("outside a git repository", () => {
    it("falls back to filesystem scan and finds AGENTS.md", async () => {
      await td.write("AGENTS.md");
      const { files } = await discoverAgentsMdFiles(td.path);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/AGENTS\.md$/);
    });

    it("does not include AGENTS.md inside node_modules", async () => {
      await td.write("AGENTS.md");
      await td.write("node_modules/pkg/AGENTS.md");
      const { files } = await discoverAgentsMdFiles(td.path);
      expect(files).toHaveLength(1);
    });
  });

  describe("inside a git repository", () => {
    it("finds a tracked AGENTS.md", async () => {
      initRepo();
      await td.write("AGENTS.md");
      git("add AGENTS.md");
      const { files } = await discoverAgentsMdFiles(td.path);
      expect(files).toHaveLength(1);
    });

    it("finds an untracked, non-ignored AGENTS.md", async () => {
      initRepo();
      await td.write("AGENTS.md");
      const { files } = await discoverAgentsMdFiles(td.path);
      expect(files).toHaveLength(1);
    });

    it("excludes AGENTS.md in a gitignored directory", async () => {
      initRepo();
      await td.write(".gitignore", "ignored/\n");
      await td.write("AGENTS.md");
      await td.write("ignored/AGENTS.md");
      const { files } = await discoverAgentsMdFiles(td.path);
      expect(files).toHaveLength(1);
      expect(files.some((f) => f.includes("ignored"))).toBe(false);
    });

    it("excludes an explicitly gitignored AGENTS.md file", async () => {
      initRepo();
      await td.write(".gitignore", "AGENTS.md\n");
      await td.write("AGENTS.md");
      await td.write("sub/AGENTS.md");
      const { files } = await discoverAgentsMdFiles(td.path);
      expect(files).toHaveLength(0);
    });

    it("returns files sorted shallow-to-deep", async () => {
      initRepo();
      await td.write("sub/deep/AGENTS.md");
      await td.write("sub/AGENTS.md");
      await td.write("AGENTS.md");
      const { files } = await discoverAgentsMdFiles(td.path);
      expect(files).toHaveLength(3);
      const depths = files.map((f) => f.split("/").length);
      expect(depths).toEqual([...depths].sort((a, b) => a - b));
    });

    it("reports no errors on a clean scan", async () => {
      initRepo();
      await td.write("AGENTS.md");
      const { errors } = await discoverAgentsMdFiles(td.path);
      expect(errors).toHaveLength(0);
    });
  });
});
