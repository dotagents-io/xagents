# xagents Technical Specifications

This file documents the technical constraints and design decisions for the `xagents` project.

## Core Responsibility

`xagents` performs one focused task:

- Read **all** `AGENTS.md` files from the project
- For each `AGENTS.md` file, verify that a configuration file exists at the same location
- Configuration files must contain the literal string `@AGENTS.md` somewhere within their content
- If a configuration file is missing or does not contain the reference, create it or append the reference

### Special Case: `.agents/AGENTS.md`

When `AGENTS.md` is located at `.agents/AGENTS.md` (project root level):

- Do **not** create `.agents/CLAUDE.md` (or other config files)
- Instead, append reference to root-level `CLAUDE.md` (e.g., `/CLAUDE.md`, not `/.agents/CLAUDE.md`)
- This allows the `.agents/` directory to remain purely for spec storage
- Root config files maintain awareness of all `.agents/` specifications

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
