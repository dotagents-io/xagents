# xagents

Keep `AGENTS.md` files in sync with your coding tool configuration files.

## Purpose

`xagents` is part of the [dotagents initiative](https://github.com/dotagents-io/dotagents) to make AI coding tool configuration interoperable across your project. This tool ensures that every `AGENTS.md` file in your repository has a corresponding configuration file (like `CLAUDE.md`) that references it.

## How It Works

`xagents` scans your project for `AGENTS.md` files and verifies that each one has a companion configuration file for your favorite AI Coding IDE that includes it.

You should **NOT** use this library with editors that already pick up `AGENTS.md` files natively. See `https://dotagents.io`.

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

For teams that checkout changes, add `xagents` to your pre-commit and post-merge hooks to keep configurations in sync:

```bash
npx husky add .husky/post-merge "npm run dotagents"
npx husky add .husky/post-checkout "npm run dotagents"
```

This ensures that developers who pull changes automatically sync any new `AGENTS.md` files with their config files. For local development without committing generated files, you can run `npm run dotagents` manually.

## .gitignore Recommendations

If you're generating config files with this tool and not creating them manually, add them to `.gitignore`:

```
# Generated config files (manage with xagents)
CLAUDE.md
GEMINI.md
```

If you maintain these files manually, do not ignore them. The tool is designed to be safe and will only add the `@AGENTS.md` reference if it's missing.

## Filename Validation

Filenames must contain only:
- Alphanumeric characters (a-z, A-Z, 0-9)
- Hyphens (`-`)
- Underscores (`_`)
- Periods (`.`)

The tool will exit gracefully if an invalid filename is provided.

## Other Workarounds

- **[xmcp](https://github.com/dotagents-io/xmcp)** — Syncs `.agents/mcp.json` with each coding tool's native MCP configuration locations

## Contribution

Found a bug or have a suggestion? [Open an issue](https://github.com/dotagents-io/xagents/issues).

To contribute, see the main [dotagents repository](https://github.com/dotagents-io/dotagents).

---

## Disclaimer

`xagents` is a community-driven initiative by developers, for developers. It is **not affiliated** with any vendor, software company, or open-source project, including Anthropic, GitHub, or any AI coding tool provider. This tool is **not for profit** and holds no ownership over the specification, mechanics, or concepts behind dotagents.

The goal of `xagents` is to improve developer ergonomics by making AI coding tool configuration more interoperable. We welcome feedback and contributions.

## Support

If this tool saves you time or improves your workflow, consider supporting the project:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/B0B8QM0LH)

Your support helps maintain this tool and the broader dotagents initiative.
