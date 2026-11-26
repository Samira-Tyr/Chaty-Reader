import test from "node:test";
import assert from "node:assert/strict";
import { chatGptAdapter } from "../src/adapters/chatgpt.js";
import { searchConversations } from "../src/app/search.js";
import { GPT6_FAMILY_FILTER, modelFilterOptions } from "../src/model/models.js";

const slugs = [
  "gpt-6-astra",
  "gpt-6-astra-wm",
  "gpt-6-sol",
  "gpt-6-luna",
  "gpt-6.1-sol",
  "gpt-6-1-sol-wm",
  "gpt-6-pro",
  "gpt-6-astra-2026-09-01",
  "gpt-6-new-variant",
  "gpt-5-6-sol",
  "gpt-60-sol",
  "experimental-next",
];

function exportedConversation(id, modelSlugs) {
  return chatGptAdapter.normalize({
    id,
    title: "Registro de prueba",
    create_time: 1792314000,
    messages: modelSlugs.map((slug, index) => ({
      id: `${id}:${index}`,
      author: { role: "assistant" },
      create_time: 1792314000 + index,
      content: { parts: ["Respuesta de prueba"] },
      metadata: { model_slug: slug },
    })),
  });
}

const conversations = slugs.map((slug) => exportedConversation(slug, [slug]));
const allGpt6 = slugs.slice(0, 9);
const searchIds = (query, filter = "") => searchConversations(
  conversations, query, "oldest", "", "", filter,
).map((conversation) => conversation.models[0].id);

test("lee Astra, Sol, Luna, GPT-6.1 y variantes Work sin alterar el identificador", () => {
  assert.deepEqual(conversations.map((conversation) => conversation.models[0].id), slugs);
  assert.equal(conversations[4].models[0].label, "GPT-6.1 Sol");
  assert.equal(conversations[5].models[0].label, "GPT-6.1 Sol Wm");
  assert.equal(conversations.at(-1).models[0].label, "experimental-next");
});

test("encuentra Astra por su nombre, incluidas las respuestas GPT-6 Pro", () => {
  assert.deepEqual(searchIds("Astra"), [
    "gpt-6-astra", "gpt-6-astra-wm", "gpt-6-pro", "gpt-6-astra-2026-09-01",
  ]);
  assert.equal(conversations[6].models[0].id, "gpt-6-pro");
  assert.equal(conversations[6].models[0].label, "GPT-6 Pro");
});

test("busca la familia con o sin espacio y reconoce ambas escrituras de 6.1", () => {
  for (const query of ["GPT 6", "GPT6", "familia 6"]) {
    assert.deepEqual(searchIds(query), allGpt6, query);
  }
  assert.deepEqual(searchIds("GPT 6.1"), ["gpt-6.1-sol", "gpt-6-1-sol-wm"]);
  assert.deepEqual(searchIds("Luna"), ["gpt-6-luna"]);
});

test("el filtro de familia incluye variantes nuevas y excluye GPT-5 y GPT-60", () => {
  assert.deepEqual(searchIds("", GPT6_FAMILY_FILTER), allGpt6);
  assert.deepEqual(searchIds("Sol", GPT6_FAMILY_FILTER), [
    "gpt-6-sol", "gpt-6.1-sol", "gpt-6-1-sol-wm",
  ]);
  assert.deepEqual(searchIds("", "experimental-next"), ["experimental-next"]);
});

test("el filtro de familia respeta el modelo de cada respuesta en chats mixtos", () => {
  const mixed = exportedConversation("mixed", ["gpt-6-astra", "gpt-5-6-sol"]);
  mixed.messages[0].text = "Recuerdo nuevo";
  mixed.messages[1].text = "Recuerdo anterior";
  const results = searchConversations([mixed], "recuerdo", "newest", "", "", GPT6_FAMILY_FILTER);
  assert.deepEqual(results[0].matchIds, ["mixed:0"]);
  assert.equal(searchConversations([mixed], "anterior", "newest", "", "", GPT6_FAMILY_FILTER).length, 0);
});

test("no atribuye GPT-6 a respuestas que solo tienen un modelo predeterminado", () => {
  const missing = chatGptAdapter.normalize({
    id: "missing",
    default_model_slug: "gpt-6-astra",
    messages: [{
      author: { role: "assistant" },
      content: { parts: ["Respuesta sin modelo registrado"] },
      metadata: { default_model_slug: "gpt-6-astra" },
    }],
  });
  assert.deepEqual(missing.models, []);
  assert.equal(searchConversations([missing], "", "newest", "", "", GPT6_FAMILY_FILTER).length, 0);
});

test("GPT-6.2 Sol y Astra se filtran por separado con sus identificadores de Work", () => {
  const mixed = exportedConversation("gpt62", [
    "gpt-6.2-sol", "gpt-6-2-sol-wm", "gpt-6-2-astra", "gpt-6.2-astra-wm",
    "gpt-6.2-thinking", "gpt-6.1-sol-wm", "gpt-6-astra-wm",
  ]);
  const get = (query, filter) => searchConversations([mixed], query, "newest", "", "", filter);
  const sol = "variant:gpt-6.2-sol";
  const astra = "variant:gpt-6.2-astra";

  assert.deepEqual(get("Respuesta de prueba", sol)[0].matchIds, ["gpt62:0", "gpt62:1"]);
  assert.deepEqual(get("Respuesta de prueba", astra)[0].matchIds, ["gpt62:2", "gpt62:3"]);
  assert.deepEqual(get("6.2 Astra", GPT6_FAMILY_FILTER)[0].matchIds, ["gpt62:2", "gpt62:3"]);
  assert.deepEqual(get("6.2 Sol", astra), []);

  const options = modelFilterOptions(mixed.models);
  assert.deepEqual(options.filter((option) => option.id.startsWith("variant:")).map(({ label, unavailable }) => [label, unavailable]), [
    ["GPT-6.2 Sol", false], ["GPT-6.2 Astra", false],
  ]);
  assert.equal(options.filter((option) => option.label === "GPT-6.2 Sol").length, 1);
  assert.ok(options.some((option) => option.id === "gpt-6.2-astra-wm"));
  assert.ok(options.some((option) => option.id === "gpt-6.2-thinking"));
});
