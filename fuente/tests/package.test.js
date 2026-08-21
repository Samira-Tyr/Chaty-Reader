import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = fileURLToPath(new URL("../../app/", import.meta.url));

test("el HTML solo referencia recursos locales existentes", async () => {
  const html = await readFile(resolve(appDirectory, "index.html"), "utf8");
  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);

  assert.ok(references.length >= 3);
  for (const reference of references) {
    assert.ok(reference.startsWith("./"), `Referencia no local: ${reference}`);
    const relativePath = reference.replace(/^\.\//, "").split("?")[0];
    await access(resolve(appDirectory, relativePath));
  }
});

test("la política de contenido impide conexiones de red", async () => {
  const html = await readFile(resolve(appDirectory, "index.html"), "utf8");
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test("el paquete compilado no conserva recursos obsoletos", async () => {
  const assets = (await readdir(resolve(appDirectory, "assets"))).sort();
  assert.deepEqual(assets, ["chaty-logo.svg", "chaty-reader.css", "chaty-reader.js"]);
});

test("el paquete no conserva el nombre del archivo de conversaciones", async () => {
  const script = await readFile(resolve(appDirectory, "assets/chaty-reader.js"), "utf8");
  assert.doesNotMatch(script, /chaty-reader-last-file/);
});
