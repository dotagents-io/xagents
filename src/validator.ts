export function validateFilenames(filenames: string[]): void {
  if (filenames.length === 0) {
    console.error(`Error: at least one filename required (default: CLAUDE.md)`);
    process.exit(1);
  }

  const validNameRegex = /^[a-zA-Z0-9._-]+$/;

  for (const filename of filenames) {
    if (!filename || filename.trim().length === 0) {
      console.error(`Error: filename cannot be empty`);
      process.exit(1);
    }

    if (!validNameRegex.test(filename)) {
      console.error(
        `Error: invalid filename "${filename}". Filenames must contain only alphanumeric characters, hyphens, underscores, and periods.`
      );
      process.exit(1);
    }
  }
}
