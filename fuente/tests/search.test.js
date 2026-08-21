import test from "node:test";
import assert from "node:assert/strict";
import { searchConversations } from "../src/app/search.js";

const at = (year, month, day, hour = 12) =>
  new Date(year, month - 1, day, hour).getTime() / 1000;

const conversations = [
  {
    id: "first",
    title: "Lobo y luna",
    createdAt: at(2026, 8, 1),
    updatedAt: at(2026, 8, 4),
    messages: [
      {
        id: "m1",
        text: "La media luna acompaña al lobo azul",
        createdAt: at(2026, 8, 4),
        model: { id: "gpt-5-1-thinking", label: "GPT-5.1 Thinking", source: "export" },
      },
      {
        id: "m2",
        text: "Un recuerdo con corazón",
        createdAt: at(2026, 8, 5),
        model: { id: "gpt-4o", label: "GPT-4o", source: "export" },
      },
    ],
  },
  {
    id: "second",
    title: "Otro chat",
    createdAt: at(2026, 7, 10),
    updatedAt: at(2026, 7, 10),
    messages: [{ id: "m3", text: "Texto distinto", createdAt: at(2026, 7, 10) }],
  },
];

test("encuentra una frase exacta y marca el mensaje", () => {
  const results = searchConversations(conversations, "media luna", "newest", "", "");
  assert.equal(results.length, 1);
  assert.equal(results[0].firstMatchId, "m1");
  assert.deepEqual(results[0].matchIds, ["m1"]);
});

test("si no existe la frase exacta, exige todas las palabras", () => {
  const results = searchConversations(conversations, "azul acompaña", "newest", "", "");
  assert.equal(results.length, 1);
  assert.equal(results[0].firstMatchId, "m1");
});

test("permite buscar una fecha escrita", () => {
  const results = searchConversations(conversations, "2026-08-04", "newest", "", "");
  assert.equal(results.length, 1);
  assert.equal(results[0].firstMatchId, "m1");
});

test("con búsqueda activa, el rango se aplica a la fecha exacta del mensaje", () => {
  const results = searchConversations(
    conversations,
    "lobo azul",
    "newest",
    "2026-08-04",
    "2026-08-04",
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].firstMatchId, "m1");
});

test("sin búsqueda, filtra y ordena por fecha de conversación", () => {
  const newest = searchConversations(conversations, "", "newest", "2026-08-01", "2026-08-31");
  assert.deepEqual(newest.map((conversation) => conversation.id), ["first"]);

  const oldest = searchConversations(conversations, "", "oldest", "", "");
  assert.deepEqual(oldest.map((conversation) => conversation.id), ["second", "first"]);
});

test("permite buscar por nombre o identificador de modelo", () => {
  const byLabel = searchConversations(conversations, "GPT-5.1 Thinking", "newest", "", "");
  assert.equal(byLabel[0].firstMatchId, "m1");

  const bySlug = searchConversations(conversations, "gpt-4o", "newest", "", "");
  assert.equal(bySlug[0].firstMatchId, "m2");
});

test("el filtro de modelo limita tanto chats como coincidencias", () => {
  const filtered = searchConversations(
    conversations,
    "lobo azul",
    "newest",
    "",
    "",
    "gpt-5-1-thinking",
  );
  assert.equal(filtered.length, 1);
  assert.deepEqual(filtered[0].matchIds, ["m1"]);

  const wrongModel = searchConversations(
    conversations,
    "recuerdo",
    "newest",
    "",
    "",
    "gpt-5-1-thinking",
  );
  assert.equal(wrongModel.length, 0);
});
