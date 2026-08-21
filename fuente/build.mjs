import { build } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(here, "../app/assets");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const workerBuild = await build({
  entryPoints: [resolve(here, "src/worker/index.js")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  write: false,
});

const workerSource = workerBuild.outputFiles[0].text;
const workerSourcePlugin = {
  name: "chaty-worker-source",
  setup(buildContext) {
    buildContext.onResolve({ filter: /^virtual:chaty-worker$/ }, () => ({
      path: "virtual:chaty-worker",
      namespace: "chaty-worker",
    }));
    buildContext.onLoad({ filter: /.*/, namespace: "chaty-worker" }, () => ({
      contents: `export default ${JSON.stringify(workerSource)};`,
      loader: "js",
    }));
  },
};

await build({
  entryPoints: [resolve(here, "src/main.jsx")],
  bundle: true,
  outfile: resolve(outputDirectory, "chaty-reader.js"),
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "eof",
  jsx: "automatic",
  plugins: [workerSourcePlugin],
});

await copyFile(
  resolve(here, "public/chaty-logo.svg"),
  resolve(outputDirectory, "chaty-logo.svg"),
);
await copyFile(
  resolve(here, "src/app/styles.css"),
  resolve(outputDirectory, "chaty-reader.css"),
);

console.log("Chaty Reader compilado en app/assets.");
