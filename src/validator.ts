export function validateFilenames(filenames: string[]): void {
  if (filenames.length === 0) {
    throw new Error("at least one filename required (default: CLAUDE.md)");
  }

  const validNameRegex = /^[a-zA-Z0-9._-]+$/;

  for (const filename of filenames) {
    if (!filename || filename.trim().length === 0) {
      throw new Error("filename cannot be empty");
    }

    if (!validNameRegex.test(filename)) {
      throw new Error(
        `invalid filename "${filename}". Filenames must contain only alphanumeric characters, hyphens, underscores, and periods.`
      );
    }
  }
}
