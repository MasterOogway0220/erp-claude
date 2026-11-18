/**
 * True when an error means "a code file of this page could not be loaded",
 * which after a deploy means the tab is running the previous build.
 * Covers webpack/Turbopack chunk errors and the Chrome, Safari and Firefox
 * wordings for a failed dynamic import.
 */
export function isStaleBuildError(error: { name?: string; message?: string }): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i
      .test(error.message ?? "")
  );
}
