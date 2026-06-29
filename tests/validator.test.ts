import { describe, it, expect } from "vitest";
import { validateFilenames } from "../src/validator.js";

describe("validateFilenames", () => {
  describe("when the filename list is empty", () => {
    it("throws with a message referencing the default", () => {
      expect(() => validateFilenames([])).toThrow(/at least one filename required/);
    });
  });

  describe("when a filename contains invalid characters", () => {
    it("throws on a forward slash (no path separators allowed)", () => {
      expect(() => validateFilenames(["sub/CLAUDE.md"])).toThrow(/invalid filename/);
    });

    it("throws on a space", () => {
      expect(() => validateFilenames(["CLAUDE .md"])).toThrow(/invalid filename/);
    });

    it("throws on an @ symbol", () => {
      expect(() => validateFilenames(["@CLAUDE.md"])).toThrow(/invalid filename/);
    });
  });

  describe("when all filenames are valid", () => {
    it("accepts a single standard config filename", () => {
      expect(() => validateFilenames(["CLAUDE.md"])).not.toThrow();
    });

    it("accepts multiple filenames at once", () => {
      expect(() => validateFilenames(["CLAUDE.md", "GEMINI.md"])).not.toThrow();
    });

    it("accepts filenames with hyphens, underscores, and periods", () => {
      expect(() => validateFilenames(["my-config_file.v2.md"])).not.toThrow();
    });
  });
});
