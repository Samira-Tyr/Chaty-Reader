import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

test("la aplicación compilada arranca y muestra la pantalla local", async () => {
  const html = await readFile(new URL("../../app/index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../../app/assets/chaty-reader.js", import.meta.url), "utf8");
  const dom = new JSDOM(html, {
    url: "https://chaty.local/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });

  dom.window.URL.createObjectURL = () => "blob:chaty-worker";
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.Worker = class LocalWorkerStub {
    postMessage() {}
    terminate() {}
  };

  dom.window.eval(script);
  await new Promise((resolve) => dom.window.setTimeout(resolve, 20));

  const text = dom.window.document.body.textContent;
  assert.match(text, /Chaty Reader/);
  assert.match(text, /Tú decides cuáles tienen corazón/);
  assert.equal(dom.window.document.querySelectorAll(".theme-control option").length, 3);
  assert.ok(dom.window.document.querySelector('input[type="file"][multiple]'));

  dom.window.close();
});

test("la interfaz recibe el modelo común y presenta un chat", async () => {
  const html = await readFile(new URL("../../app/index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../../app/assets/chaty-reader.js", import.meta.url), "utf8");
  const dom = new JSDOM(html, {
    url: "https://chaty.local/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });

  dom.window.URL.createObjectURL = () => "blob:chaty-worker";
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.Worker = class LocalWorkerStub {
    postMessage() {
      dom.window.setTimeout(() => {
        this.onmessage?.({
          data: {
            ok: true,
            document: {
              schemaVersion: 1,
              platforms: ["chatgpt"],
              conversations: [
                {
                  id: "chatgpt:demo",
                  platform: "chatgpt",
                  title: "Recuerdo de prueba",
                  createdAt: 1785830400,
                  updatedAt: 1785830400,
                  models: [
                    {
                      id: "gpt-5-1-thinking",
                      label: "GPT-5.1 Thinking",
                      source: "export",
                    },
                  ],
                  modelCoverage: { identified: 1, total: 1 },
                  messages: [
                    {
                      id: "demo-message",
                      role: "assistant",
                      authorLabel: "ChatGPT",
                      text: "Un mensaje legible",
                      createdAt: 1785830400,
                      contentType: "text",
                      model: {
                        id: "gpt-5-1-thinking",
                        label: "GPT-5.1 Thinking",
                        source: "export",
                      },
                    },
                  ],
                },
              ],
            },
          },
        });
      }, 0);
    }
    terminate() {}
  };

  dom.window.eval(script);
  await new Promise((resolve) => dom.window.setTimeout(resolve, 20));

  const input = dom.window.document.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [{ name: "conversations.json" }],
  });
  input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await new Promise((resolve) => dom.window.setTimeout(resolve, 30));

  const text = dom.window.document.body.textContent;
  assert.match(text, /Recuerdo de prueba/);
  assert.match(text, /Un mensaje legible/);
  assert.match(text, /ChatGPT/);
  assert.match(text, /GPT-5\.1 Thinking/);
  assert.match(text, /1\/1 respuestas identificadas/);
  assert.match(text, /Copiar chat/);
  assert.equal(dom.window.document.querySelectorAll(".filter-model option").length, 2);

  dom.window.close();
});
