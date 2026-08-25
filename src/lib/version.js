// Stamped when this build is packaged. Exposed publicly at /api/version so
// "is the latest code actually live?" is a question you can answer by
// loading a URL, instead of comparing screenshots or reading fly logs.
//
// Bumped with each release; it is not derived from git at runtime because
// the Docker build does not carry the .git directory.
export const APP_VERSION = {
  commit: "a1ba785",
  built: "2026-08-25T08:46Z",
  summary: "Merge fork: video embeds, photo zoom, version endpoint",
};
