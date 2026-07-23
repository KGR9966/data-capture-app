// Deep-link intent handler for Data Capture.
// Routes incoming `datacapture://...` links to the corresponding in-app route.

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial?: boolean;
}): string {
  if (path.startsWith("/checklist") || path.startsWith("/open-list")) {
    return path;
  }
  return path;
}
