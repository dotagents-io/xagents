export function validateFilenames(filenames: string[]): void {
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
