# xagents

Keep `AGENTS.md` files in sync with your coding tool configuration files.

## Purpose

`xagents` is part of the [dotagents initiative](https://github.com/dotagents-io/dotagents) to make AI coding tool configuration interoperable across your project. This tool ensures that every `AGENTS.md` file in your repository has a corresponding configuration file (like `CLAUDE.md`) that references it.

Only use this tool for coding tools that do **not** already pick up `AGENTS.md` natively. Check https://dotagents.io for the current support matrix.

## How It Works

`xagents` scans your project for `AGENTS.md` files and verifies that each one has a companion configuration file for your AI coding tool that includes it. By design, all writes are restricted to locations within your project root, preventing unintended changes to shared or global locations.

## Installation

[![npm version](https://img.shields.io/npm/v/@dotagents-io/xagents.svg)](https://www.npmjs.com/package/@dotagents-io/xagents) 
[![npm downloads](https://img.shields.io/npm/dm/@dotagents-io/xagents.svg)](https://www.npmjs.com/package/@dotagents-io/xagents) [![license](https://img.shields.io/npm/l/@dotagents-io/xagents.svg)](https://github.com/dotagents-io/xagents/blob/main/LICENSE)

Install globally:

```bash
# Use as: xagents
npm install -g @dotagents-io/xagents
```

Or run with `npx`:

```bash
# Use as: npx @dotagents-io/xagents
npx @dotagents-io/xagents
```

## Usage

### Basic Usage

```bash
xagents
```

Scans from the current directory and syncs all `AGENTS.md` files with `CLAUDE.md` files.

### Custom Config Filenames

```bash
xagents --filenames=CLAUDE.md,GEMINI.md
```

Syncs `AGENTS.md` files with multiple config files. Separate filenames with commas.

### Skip Reference Check

```bash
xagents --nocheck
```

By default, xagents checks if a reference already exists before appending, using case-insensitive substring matching. Use `--nocheck` to skip this check and always append. This is useful if substring matching causes false positives in your setup.

## Integration

### npm Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "dotagents": "npm run dotagents:xagents && npm run dotagents:xmcp",
    "dotagents:xagents": "xagents",
    "dotagents:xmcp": "xmcp"
  }
}
```

Run both tools:

```bash
npm run dotagents
```

### Git Hooks with Husky

For teams that checkout changes, add `xagents` to your post-merge hook so configs stay in sync automatically:

```bash
echo "npm run dotagents" >> .husky/post-merge
echo "npm run dotagents" >> .husky/pre-commit
```

Without a hook, run `npm run dotagents` manually after pulling.

## .gitignore Recommendations

If you're generating config files with this tool and not creating them manually, add them to `.gitignore`:

```
# Generated config files (manage with xagents)
CLAUDE.md
GEMINI.md
```

Verify that ignoring these files doesn't interfere with your coding tool of choice.

## Filename Validation

Filenames must contain only alphanumeric characters, hyphens, underscores, and periods.

## Other Workarounds

- **[xmcp](https://github.com/dotagents-io/xmcp)** — Syncs `.agents/mcp.json` with each coding tool's native MCP configuration locations

## Contribution

Found a bug or have a suggestion? [Open an issue](https://github.com/dotagents-io/xagents/issues).

To contribute, see the main [dotagents repository](https://github.com/dotagents-io/dotagents).

---

## Disclaimer

`xagents` is a community-driven tool maintained by an individual developer. It is **not affiliated** with any vendor, software company, or open-source project, including Anthropic, GitHub, or any AI coding tool provider. This tool is **not for profit** and holds no ownership over the specification, mechanics, or concepts behind dotagents.

## Support

If this tool saves you time or improves your workflow, consider supporting the project:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/B0B8QM0LH)
