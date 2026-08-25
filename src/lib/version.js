// What is actually running, exposed publicly at /api/version so "is the
// latest code live?" is a question you answer by loading a URL instead of
// comparing screenshots or reading fly logs.
//
// Read from the environment at RUNTIME, stamped by the Docker build from
// --build-arg (see Dockerfile and the deploy command in README). It used to
// be a hand-edited constant, which drifted the moment anyone forgot to bump
// it — and a version endpoint that reports the wrong commit is worse than no
// version endpoint, because it is believed. `.git` is deliberately not in the
// image, so this cannot be derived at runtime any other way.
export const APP_VERSION = {
  commit: process.env.APP_COMMIT || "unknown",
  built: process.env.APP_BUILT || "unknown",
};
