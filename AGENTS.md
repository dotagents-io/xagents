# xagents Technical Specifications

This file documents the technical constraints and design decisions for the `xagents` project.

## Core Responsibility

`xagents` performs one focused task:

- Read **all** `AGENTS.md` files from the project
- For each `AGENTS.md` file, verify that a configuration file exists at the same location
- Configuration files must contain the literal string `@AGENTS.md` somewhere within their content
- If a configuration file is missing or does not contain the reference, create it or append the reference

### Special Case: `.agents/AGENTS.md` at Any Level

When `AGENTS.md` is located in a `.agents/` directory:

- Do **not** create config files inside `.agents/`
- Instead, create config files in the parent directory (the one containing `.agents/`)
- Reference points to the `.agents/` path from that parent
- This allows `.agents/` directories to remain purely for spec storage
- Each parent config file maintains awareness of all its `.agents/` specifications

**Examples:**

**Example 1: Root `.agents/` only**
```
.agents/AGENTS.md
.agents/context/AGENTS.md
```
→ Creates `CLAUDE.md` (root) with:
```
@.agents/AGENTS.md
@.agents/context/AGENTS.md
```

**Example 2: Regular AGENTS.md + root `.agents/`**
```
AGENTS.md
.agents/AGENTS.md
```
→ Creates `CLAUDE.md` (root) with:
```
@AGENTS.md
@.agents/AGENTS.md
```
(Regular references added first, `.agents/` references added last)

**Example 3: Nested `.agents/` at multiple levels**
```
AGENTS.md
.agents/AGENTS.md
repo1/.agents/AGENTS.md
repo1/.agents/context/AGENTS.md
```
→ Creates:
- `CLAUDE.md` (root):
  ```
  @AGENTS.md
  @.agents/AGENTS.md
  ```
- `repo1/CLAUDE.md`:
  ```
  @.agents/AGENTS.md
  @.agents/context/AGENTS.md
  ```

## Design Constraints

### Simplicity

The codebase is intentionally simple and transparent:

- No complex dependency trees
- No abstraction layers beyond necessity
- Clear, readable code path from CLI to file operations
- Every file write operation is logged and can be audited

### File Operations

All file operations must be:

1. **Non-destructive** — Never overwrite existing content
2. **Transparent** — Only add the `@AGENTS.md` reference when necessary
3. **Idempotent** — Running the tool twice produces the same result
4. **Safe** — Graceful error handling with clear error messages

Writing code is reviewed with extra care to prevent accidental data loss.

### Filename Configuration

- **Default behavior**: Syncs with `CLAUDE.md`
- **Custom filenames**: Supported via `--filenames=FILE1,FILE2` flag
- **Validation**: Filenames must be alphanumeric + hyphens, underscores, periods only
- **Parsing**: Simple split by comma and trim (no complex parsing)

### Directory Scanning

- Recursively scans from the provided root directory (defaults to `cwd`)
- Skips common build/dependency directories: `.git`, `node_modules`, `.next`, `dist`, `build`
- Handles read errors gracefully (warns but continues)
- Results are sorted alphabetically for consistency

### File Reference Format

- Reference string is literal: `@AGENTS.md`
- Placement: Appended as a new line if the file already exists
- No special formatting or comments around the reference
- Human-readable format that works in any text-based config

### Reference Matching Philosophy

xagents uses **substring matching** (case-insensitive) when checking if a reference already exists:

**Design principle:** False positives are acceptable; false negatives are not.

- **False positive example:** File contains `@AGENTS.md.bak` → treated as containing `@AGENTS.md` → reference not appended again
- **Avoids false negatives:** File contains `_@AGENTS.md_` (Markdown italics) or `[@AGENTS.md]` (link) → correctly found, no duplicate

This simple approach prevents duplicating references in various formatting contexts while accepting that some non-exact matches may prevent appending in edge cases.

For codebases where substring matching causes issues, use the `--nocheck` flag to skip the reference check entirely (always appends).

### Symlinks

xagents separates **discovery paths** (virtual) from **safety checks** (real), enabling shared `.agents/` folders via symlink while preventing writes to locations outside the root:

**Discovery:** Uses naive path construction without resolving symlinks.
- If `/project/.agents/AGENTS.md` is found (whether `.agents` is a symlink or not), the config file is derived as `/project/CLAUDE.md`
- Symlinks in the discovery path determine the target location, not their real destinations

**Safety:** Before any read or write operation, resolves real paths and validates they are within root.
- If a file exists, its real path must be within root
- If a file doesn't exist yet, its parent directory's real path must be within root
- Rejects files/directories that resolve outside the root, preventing writes to shared or global locations

**Use case:** Developers can safely symlink shared `.agents/` directories into projects. Syncing happens project-locally without touching the shared source.

**Future:** A flag could allow writing to symlink targets (e.g., `--follow-symlinks`), but the default prioritizes preventing accidental writes to shared locations.

## CLI Interface

```
xagents [--filenames=FILE1,FILE2,...]
```

- No subcommands
- No interactive mode
- Reports simple summary: files found, created, updated, and any errors
- Exits with code 0 on success, 1 on error

## Output

The tool logs:

- Number of `AGENTS.md` files found
- Number of config files created
- Number of config files updated
- Any errors encountered during processing

Errors are printed to stderr and cause a non-zero exit code.

## Integration Context

`xagents` is designed to work alongside:

- **[xmcp](https://github.com/dotagents-io/xmcp)** — Syncs `.agents/mcp.json` with tool-specific MCP configuration locations
- **Manual config management** — Developers can maintain these files themselves if preferred
- **Git workflows** — Can be run pre-commit or post-merge to keep configurations in sync

Changes to the mapping or behavior of this tool should be reflected in the `.gitignore` recommendations in the README and communicated to users.

## Future Considerations

This tool is intentionally minimal. Potential future enhancements should:

- Maintain the single responsibility principle
- Not add significant dependencies
- Remain simple enough for developers to audit and understand
- Prioritize safety over convenience
