import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { parseConversationFiles } from "../src/worker/index.js";

async function waitForUi(dom, predicate) {
  const deadline = Date.now() + 1500;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, "La interfaz no terminó de cargar");
    await new Promise((resolve) => dom.window.setTimeout(resolve, 10));
  }
}

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
  dom.window.HTMLElement.prototype.scrollTo = () => {};
  let activeWorker = null;
  dom.window.Worker = class LocalWorkerStub {
    constructor() {
      activeWorker = this;
    }
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
                    { id: "gpt-6-astra-wm", label: "GPT-6 Astra Wm", source: "export" },
                  ],
                  modelCoverage: { identified: 2, total: 2 },
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
                    {
                      id: "astra-message",
                      role: "assistant",
                      authorLabel: "ChatGPT",
                      text: "Otra respuesta de prueba",
                      createdAt: 1792314000,
                      contentType: "text",
                      model: { id: "gpt-6-astra-wm", label: "GPT-6 Astra Wm", source: "export" },
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
  await waitForUi(dom, () => typeof activeWorker?.onmessage === "function");

  const input = dom.window.document.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [{ name: "conversations.json" }],
  });
  input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await waitForUi(dom, () => dom.window.document.body.textContent.includes("Recuerdo de prueba"));

  const text = dom.window.document.body.textContent;
  assert.match(text, /Recuerdo de prueba/);
  assert.match(text, /Un mensaje legible/);
  assert.match(text, /ChatGPT/);
  assert.match(text, /GPT-5\.1 Thinking/);
  assert.match(text, /GPT-6 Astra/);
  assert.match(text, /2\/2 respuestas identificadas/);
  assert.match(text, /Copiar chat/);
  assert.equal(dom.window.document.querySelectorAll(".filter-model option").length, 6);
  const modelSelect = dom.window.document.querySelector(".filter-model select");
  assert.ok(modelSelect.querySelector('option[value="family:gpt-6"]'));
  for (const name of ["Sol", "Astra"]) {
    const option = modelSelect.querySelector(`option[value="variant:gpt-6.2-${name.toLowerCase()}"]`);
    assert.equal(option.textContent, `GPT-6.2 ${name} · sin registros`);
    assert.equal(option.disabled, true);
  }
  modelSelect.value = "family:gpt-6";
  modelSelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await new Promise((resolve) => dom.window.setTimeout(resolve, 20));
  assert.equal(dom.window.document.querySelector(".filter-model select").value, "family:gpt-6");

  dom.window.close();
});

test("una carpeta de exportación muestra cada foto en su chat y conserva la referencia si falta", async () => {
  const inlineId = `file_${"a".repeat(32)}`;
  const generatedId = `file_${"b".repeat(32)}`;
  const missingId = `file_${"c".repeat(32)}`;
  const raw = [
    {
      id: "main", title: "Mismo título", create_time: 30,
      messages: [{
        id: "anchor", author: { role: "user" }, create_time: 30,
        content: { parts: ["Mi foto", { content_type: "image_asset_pointer", asset_pointer: `sediment://${inlineId}` }] },
      }],
    },
    {
      id: "secondary", title: "Mismo título", create_time: 10,
      messages: [{
        id: "missing", author: { role: "user" }, create_time: 10,
        content: { parts: [{ content_type: "image_asset_pointer", asset_pointer: `sediment://${missingId}` }] },
        metadata: { attachments: [{ id: missingId, mime_type: "image/png", name: "Falta.png" }] },
      }],
    },
  ];
  const generated = [{
    file_id: generatedId, file_name: "Generada.png", image_gen_generation_id: "generation",
    origination_thread_id: "main", origination_message_id: "absent", created_at: "1970-01-01T00:00:31Z",
  }];
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP8sAAAAASUVORK5CYII=", "base64");
  const files = [
    new File([JSON.stringify(raw)], "conversations-000.json"),
    new File([JSON.stringify(generated)], "library_files.json"),
    new File([JSON.stringify({ [`${inlineId}.dat`]: "Adjunta.png" })], "conversation_asset_file_names.json"),
    new File(["{}"], "user.json"),
    new File([png], `${inlineId}.dat`),
    new File([png], `${generatedId}.dat`),
  ];
  const html = await readFile(new URL("../../app/index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../../app/assets/chaty-reader.js", import.meta.url), "utf8");
  const dom = new JSDOM(html, {
    url: "https://chaty.local/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  try {
    let activeWorker;
    let blobCount = 0;
    const released = [];
    dom.window.URL.createObjectURL = () => `blob:chaty-${++blobCount}`;
    dom.window.URL.revokeObjectURL = (url) => released.push(url);
    dom.window.HTMLElement.prototype.scrollTo = () => {};
    dom.window.Worker = class LocalWorkerStub {
      constructor() { activeWorker = this; }
      async postMessage({ files: conversations, imageMetadata }) {
        const document = await parseConversationFiles(conversations, imageMetadata);
        this.onmessage({ data: { ok: true, document } });
      }
      terminate() {}
    };
    dom.window.eval(script);
    await waitForUi(dom, () => typeof activeWorker?.onmessage === "function");

    const input = dom.window.document.querySelector('input[webkitdirectory]');
    Object.defineProperty(input, "files", { value: files });
    input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    const pictures = () => Array.from(dom.window.document.querySelectorAll(".message-picture"));
    await waitForUi(dom, () => pictures().length === 2);

    assert.equal(dom.window.document.querySelector("#message-anchor img").alt, "Adjunta.png");
    assert.equal(pictures()[1].alt, "Generada.png");
    const firstUrls = pictures().map((picture) => picture.getAttribute("src"));

    dom.window.document.querySelectorAll(".conversation-list button")[1].click();
    await waitForUi(dom, () => dom.window.document.querySelector("#message-missing"));
    assert.equal(pictures().length, 0);
    assert.match(dom.window.document.querySelector("#message-missing").textContent, /Archivo de imagen no localizado.*Falta\.png/);
    await waitForUi(dom, () => firstUrls.every((url) => released.includes(url)));

    const jsonInput = dom.window.document.querySelector('input[accept="application/json,.json"]');
    Object.defineProperty(jsonInput, "files", { value: [files[0]] });
    jsonInput.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await waitForUi(dom, () => dom.window.document.querySelector("#message-anchor .message-image-status"));
    dom.window.document.querySelectorAll(".conversation-list button")[1].click();
    await waitForUi(dom, () => dom.window.document.querySelector("#message-missing"));

    const mediaInput = dom.window.document.querySelector('input[aria-label="Carpeta para vincular imágenes"]');
    const otherExport = new File([JSON.stringify([{ ...raw[0], id: "other", title: "Otra exportación" }])], "conversations-001.json");
    Object.defineProperty(mediaInput, "files", { value: [otherExport, ...files.slice(1)] });
    mediaInput.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await waitForUi(dom, () => dom.window.document.querySelector(".image-source").textContent.includes("2 de 3 localizadas"));
    assert.ok(dom.window.document.querySelector("#message-missing"));
    assert.equal(dom.window.document.querySelectorAll(".conversation-list button").length, 2);
    assert.doesNotMatch(dom.window.document.querySelector(".sidebar").textContent, /Otra exportación/);

    dom.window.document.querySelectorAll(".conversation-list button")[0].click();
    await waitForUi(dom, () => pictures().length === 2);
    assert.deepEqual(pictures().map(picture => picture.alt), ["Adjunta.png", "Generada.png"]);
  } finally {
    dom.window.close();
  }
});
