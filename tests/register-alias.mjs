// Resolves the "@/..." alias that jsconfig.json gives the Next build, so the
// same modules can be imported by `node --test` with no bundler and no new
// dependency.
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const SRC = pathToFileURL(`${process.cwd()}/src/`);

registerHooks({
  resolve(specifier, context, next) {
    if (!specifier.startsWith("@/")) return next(specifier, context);
    const target = new URL(specifier.slice(2), SRC);
    const resolved = existsSync(target) ? target : new URL(`${target.pathname}.js`, SRC);
    return next(resolved.href, context);
  },
});
