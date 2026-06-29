import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { syncAgentsWithConfigFiles } from "../src/core.js";
import { TestDir } from "./helpers.js";

let td: TestDir;

beforeEach(async () => { td = await TestDir.create(); });
afterEach(async () => { await td.cleanup(); });

describe("syncAgentsWithConfigFiles", () => {
  describe("regular AGENTS.md", () => {
    describe("when the config file does not exist yet", () => {
      it("creates the config file", async () => {
        await td.write("AGENTS.md");
        await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(await td.exists("CLAUDE.md")).toBe(true);
      });

      it("writes @AGENTS.md as the sole content of the new file", async () => {
        await td.write("AGENTS.md");
        await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(await td.read("CLAUDE.md")).toBe("@AGENTS.md\n");
      });

      it("reports the new file in createdPaths", async () => {
        await td.write("AGENTS.md");
        const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(result.createdPaths).toHaveLength(1);
        expect(result.createdPaths[0]).toMatch(/CLAUDE\.md$/);
      });
    });

    describe("when the config file exists but lacks the reference", () => {
      it("appends @AGENTS.md to the existing file", async () => {
        await td.write("AGENTS.md");
        await td.write("CLAUDE.md", "# Existing content\n");
        await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(await td.read("CLAUDE.md")).toContain("@AGENTS.md");
      });

      it("preserves the existing content", async () => {
        await td.write("AGENTS.md");
        await td.write("CLAUDE.md", "# Existing content\n");
        await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(await td.read("CLAUDE.md")).toContain("# Existing content");
      });

      it("reports the file in updatedPaths", async () => {
        await td.write("AGENTS.md");
        await td.write("CLAUDE.md", "# Existing content\n");
        const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(result.updatedPaths).toHaveLength(1);
      });
    });

    describe("when the config file already contains the reference", () => {
      it("does not modify the file", async () => {
        await td.write("AGENTS.md");
        await td.write("CLAUDE.md", "@AGENTS.md\n");
        const before = await td.read("CLAUDE.md");
        await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(await td.read("CLAUDE.md")).toBe(before);
      });

      it("reports no created or updated paths", async () => {
        await td.write("AGENTS.md");
        await td.write("CLAUDE.md", "@AGENTS.md\n");
        const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(result.createdPaths).toHaveLength(0);
        expect(result.updatedPaths).toHaveLength(0);
      });
    });

    describe("when the reference exists in a different casing", () => {
      it("treats it as already present and makes no changes", async () => {
        await td.write("AGENTS.md");
        await td.write("CLAUDE.md", "@agents.md\n");
        const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(result.createdPaths).toHaveLength(0);
        expect(result.updatedPaths).toHaveLength(0);
      });
    });
  });

  describe(".agents/ AGENTS.md", () => {
    describe("config file placement", () => {
      it("creates the config at the parent directory, not inside .agents/", async () => {
        await td.write(".agents/AGENTS.md");
        await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(await td.exists("CLAUDE.md")).toBe(true);
        expect(await td.exists(".agents/CLAUDE.md")).toBe(false);
      });

      it("uses @.agents/AGENTS.md as the reference", async () => {
        await td.write(".agents/AGENTS.md");
        await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(await td.read("CLAUDE.md")).toContain("@.agents/AGENTS.md");
      });
    });

    describe("multiple .agents/ files under the same parent", () => {
      it("stacks all references into the same config file", async () => {
        await td.write(".agents/AGENTS.md");
        await td.write(".agents/context/AGENTS.md");
        await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        const content = await td.read("CLAUDE.md");
        expect(content).toContain("@.agents/AGENTS.md");
        expect(content).toContain("@.agents/context/AGENTS.md");
      });

      it("writes references in shallow-to-deep order", async () => {
        await td.write(".agents/AGENTS.md");
        await td.write(".agents/context/AGENTS.md");
        await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        const content = await td.read("CLAUDE.md");
        expect(content.indexOf("@.agents/AGENTS.md")).toBeLessThan(
          content.indexOf("@.agents/context/AGENTS.md")
        );
      });
    });

    describe(".agents/ located in a subdirectory", () => {
      it("creates the config at the subdirectory level", async () => {
        await td.write("sub/.agents/AGENTS.md");
        await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(await td.exists("sub/CLAUDE.md")).toBe(true);
      });

      it("does not create a config at the project root", async () => {
        await td.write("sub/.agents/AGENTS.md");
        await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
        expect(await td.exists("CLAUDE.md")).toBe(false);
      });
    });
  });

  describe("directory scanning", () => {
    it("agentsFound reflects all discovered AGENTS.md files", async () => {
      await td.write("AGENTS.md");
      await td.write("sub/AGENTS.md");
      await td.write(".agents/AGENTS.md");
      const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
      expect(result.agentsFound).toBe(3);
    });

    it("skips node_modules", async () => {
      await td.write("node_modules/AGENTS.md");
      const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
      expect(result.agentsFound).toBe(0);
    });

    it("skips .git", async () => {
      await td.write(".git/AGENTS.md");
      const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
      expect(result.agentsFound).toBe(0);
    });

    it("skips dist", async () => {
      await td.write("dist/AGENTS.md");
      const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
      expect(result.agentsFound).toBe(0);
    });

    it("skips build", async () => {
      await td.write("build/AGENTS.md");
      const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
      expect(result.agentsFound).toBe(0);
    });

    it("skips .next", async () => {
      await td.write(".next/AGENTS.md");
      const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
      expect(result.agentsFound).toBe(0);
    });

    it("processes shallower AGENTS.md files before deeper ones", async () => {
      await td.write("AGENTS.md");
      await td.write("sub/AGENTS.md");
      const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
      const rootIdx = result.createdPaths.findIndex((p) => !p.includes("sub"));
      const subIdx = result.createdPaths.findIndex((p) => p.includes("sub"));
      expect(rootIdx).toBeLessThan(subIdx);
    });
  });

  describe("appended file format", () => {
    it("new file contains only the reference line", async () => {
      await td.write("AGENTS.md");
      await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
      expect(await td.read("CLAUDE.md")).toBe("@AGENTS.md\n");
    });

    it("no blank line is added before the reference when file ends with a newline", async () => {
      await td.write("AGENTS.md");
      await td.write("CLAUDE.md", "existing\n");
      await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
      expect(await td.read("CLAUDE.md")).not.toContain("\n\n");
    });

    it("a separating newline is added before the reference when file has no trailing newline", async () => {
      await td.write("AGENTS.md");
      await td.write("CLAUDE.md", "existing");
      await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"]);
      expect(await td.read("CLAUDE.md")).toContain("\n@AGENTS.md\n");
    });
  });

  describe("multiple config filenames", () => {
    it("creates all specified config files for each AGENTS.md found", async () => {
      await td.write("AGENTS.md");
      const result = await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md", "GEMINI.md"]);
      expect(result.createdPaths).toHaveLength(2);
      expect(await td.exists("CLAUDE.md")).toBe(true);
      expect(await td.exists("GEMINI.md")).toBe(true);
    });
  });

  describe("--nocheck flag", () => {
    it("appends the reference unconditionally, even when already present", async () => {
      await td.write("AGENTS.md");
      await td.write("CLAUDE.md", "@AGENTS.md\n");
      await syncAgentsWithConfigFiles(td.path, ["CLAUDE.md"], true);
      const content = await td.read("CLAUDE.md");
      expect(content.match(/@AGENTS\.md/g)).toHaveLength(2);
    });
  });
});
