import test from "node:test";
import assert from "node:assert/strict";
import {
  activeMessages,
  chatGptAdapter,
  exportedModel,
  friendlyModelName,
  messageText,
} from "../src/adapters/chatgpt.js";
import { detectAdapter } from "../src/adapters/registry.js";
import { parseConversationFiles } from "../src/worker/index.js";

function node(id, parent, role, text, time, children = []) {
  return {
    id,
    parent,
    children,
    message: role
      ? {
          id: `message-${id}`,
          author: { role },
          create_time: time,
          content: { content_type: "text", parts: [text] },
        }
      : null,
  };
}

test("detecta una exportación de ChatGPT", () => {
  const raw = [{ id: "chat-1", mapping: {}, current_node: "last", create_time: 10 }];
  assert.equal(detectAdapter(raw)?.id, "chatgpt");
});

test("no confunde un JSON genérico con una exportación", () => {
  assert.equal(detectAdapter([{ title: "Inventario", items: [1, 2, 3] }]), null);
});

test("sigue solamente la rama activa de una conversación ramificada", () => {
  const conversation = {
    current_node: "assistant-b",
    mapping: {
      root: node("root", null, null, null, 0, ["user"]),
      user: node("user", "root", "user", "Pregunta", 1, ["assistant-a", "assistant-b"]),
      "assistant-a": node("assistant-a", "user", "assistant", "Respuesta descartada", 2),
      "assistant-b": node("assistant-b", "user", "assistant", "Respuesta activa", 3),
    },
  };

  assert.deepEqual(
    activeMessages(conversation).map((message) => message.text),
    ["Pregunta", "Respuesta activa"],
  );
});

test("descarta mensajes ocultos y roles internos", () => {
  const conversation = {
    messages: [
      { id: "system", author: { role: "system" }, content: { parts: ["interno"] } },
      {
        id: "hidden",
        author: { role: "assistant" },
        metadata: { is_visually_hidden_from_conversation: true },
        content: { parts: ["oculto"] },
      },
      { id: "user", author: { role: "user" }, content: { parts: ["visible"] } },
    ],
  };
  assert.deepEqual(activeMessages(conversation).map((message) => message.text), ["visible"]);
});

test("convierte partes enriquecidas e imágenes a texto legible", () => {
  const text = messageText({
    content: {
      parts: ["Hola", { text: "mundo" }, { asset_pointer: "file-service://image" }],
    },
  });
  assert.equal(text, "Hola\nmundo\n[Imagen]");
});

test("normaliza una conversación al contrato interno", () => {
  const normalized = chatGptAdapter.normalize(
    {
      id: "abc",
      title: "Prueba",
      create_time: 100,
      messages: [
        {
          id: "m1",
          author: { role: "user" },
          create_time: 101,
          content: { parts: ["Hola"] },
        },
      ],
    },
    0,
  );

  assert.equal(normalized.id, "chatgpt:abc");
  assert.equal(normalized.platform, "chatgpt");
  assert.equal(normalized.messages[0].authorLabel, "Tú");
  assert.equal(normalized.messages[0].createdAt, 101);
});

test("extrae model_slug por respuesta y lo resume en la conversación", () => {
  const normalized = chatGptAdapter.normalize({
    id: "models",
    title: "Modelos",
    messages: [
      {
        id: "user",
        author: { role: "user" },
        content: { parts: ["Hola"] },
        metadata: { default_model_slug: "gpt-4o" },
      },
      {
        id: "assistant",
        author: { role: "assistant" },
        content: { parts: ["Respuesta"] },
        metadata: { model_slug: "gpt-5-1-thinking" },
      },
    ],
  });

  assert.equal(normalized.messages[0].model, null);
  assert.deepEqual(normalized.messages[1].model, {
    id: "gpt-5-1-thinking",
    label: "GPT-5.1 Thinking",
    source: "export",
  });
  assert.deepEqual(normalized.models, [normalized.messages[1].model]);
  assert.deepEqual(normalized.modelCoverage, { identified: 1, total: 1 });
});

test("conserva el identificador original y crea una etiqueta legible", () => {
  assert.equal(friendlyModelName("gpt-4o"), "GPT-4o");
  assert.equal(friendlyModelName("gpt-5-2-thinking"), "GPT-5.2 Thinking");
  assert.equal(friendlyModelName("o3-mini"), "o3 Mini");
  assert.equal(exportedModel({ metadata: {} }), null);
});

test("une fragmentos, elimina duplicados y ordena por fecha", async () => {
  const firstVersion = {
    id: "duplicated",
    title: "Versión anterior",
    create_time: 100,
    messages: [
      { id: "a", author: { role: "user" }, create_time: 101, content: { parts: ["Uno"] } },
    ],
  };
  const lastVersion = {
    ...firstVersion,
    title: "Versión final",
    messages: [
      { id: "b", author: { role: "user" }, create_time: 102, content: { parts: ["Dos"] } },
    ],
  };
  const newest = {
    id: "newest",
    title: "Más reciente",
    create_time: 300,
    messages: [
      { id: "c", author: { role: "assistant" }, create_time: 301, content: { parts: ["Tres"] } },
    ],
  };
  const files = [
    { name: "conversations-000.json", text: async () => JSON.stringify([firstVersion, newest]) },
    { name: "conversations-001.json", text: async () => JSON.stringify([lastVersion]) },
  ];

  const document = await parseConversationFiles(files);
  assert.equal(document.schemaVersion, 2);
  assert.deepEqual(document.platforms, ["chatgpt"]);
  assert.deepEqual(document.conversations.map((conversation) => conversation.title), [
    "Más reciente",
    "Versión final",
  ]);
});
