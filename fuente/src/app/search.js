import { modelsFromMessages, normalizeForSearch } from "../model/schema.js";

export function searchConversations(
  conversations,
  rawQuery,
  sortOrder,
  from,
  to,
  modelFilter = "",
) {
  const query = normalizeForSearch(rawQuery);
  const fromBoundary = dateBoundary(from);
  const toBoundary = dateBoundary(to, true);
  const sorted = [...conversations]
    .filter((conversation) =>
      modelFilter ? conversationModels(conversation).some((model) => model.id === modelFilter) : true,
    )
    .sort((left, right) => {
      const delta = conversationTimestamp(left) - conversationTimestamp(right);
      return sortOrder === "oldest" ? delta : -delta;
    });

  if (!query) {
    return sorted
      .filter((conversation) => inDateRange(conversationTimestamp(conversation), fromBoundary, toBoundary))
      .map((conversation) => ({
        ...conversation,
        matchCount: 0,
        matchIds: [],
        firstMatchId: null,
        matchTime: null,
        snippet: conversation.messages.at(-1)?.text.slice(0, 150) || "",
      }));
  }

  const words = query.split(/\s+/).filter(Boolean);
  const exactExists = sorted.some((conversation) => {
    if (conversationTitleSearch(conversation).includes(query)) return true;
    return conversation.messages.some(
      (message) =>
        (!modelFilter || message.model?.id === modelFilter) &&
        messageSearchText(message).includes(query),
    );
  });

  return sorted
    .map((conversation) => {
      const titleText = conversationTitleSearch(conversation);
      const titleMatches = exactExists
        ? titleText.includes(query)
        : words.every((word) => titleText.includes(word));
      const matches = conversation.messages.filter((message) => {
        if (modelFilter && message.model?.id !== modelFilter) return false;
        if (!inDateRange(message.createdAt, fromBoundary, toBoundary)) return false;
        const haystack = messageSearchText(message);
        return exactExists
          ? haystack.includes(query)
          : words.every((word) => haystack.includes(word));
      });
      const firstMatch = matches[0] || null;

      if (!firstMatch && (!titleMatches || from || to)) return null;
      return {
        ...conversation,
        exactMatch: exactExists,
        matchCount: matches.length || 1,
        matchIds: matches.map((message) => message.id),
        firstMatchId: firstMatch?.id || null,
        matchTime: firstMatch?.createdAt || conversation.createdAt || null,
        snippet: firstMatch
          ? excerpt(firstMatch.text, rawQuery)
          : "Coincidencia en el título o la fecha del chat",
      };
    })
    .filter(Boolean);
}

export function messageSearchText(message) {
  return normalizeForSearch(
    `${message.text}\n${searchableDate(message.createdAt)}\n${message.model?.id || ""}\n${message.model?.label || ""}`,
  );
}

function conversationTitleSearch(conversation) {
  const models = conversationModels(conversation)
    .flatMap((model) => [model.id, model.label])
    .join("\n");
  return normalizeForSearch(`${conversation.title}\n${searchableDate(conversation.createdAt)}\n${models}`);
}

function conversationModels(conversation) {
  return Array.isArray(conversation?.models)
    ? conversation.models
    : modelsFromMessages(conversation?.messages || []);
}

function searchableDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  return [
    date.toISOString(),
    date.toLocaleDateString("es-ES"),
    date.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" }),
  ].join(" ");
}

function dateBoundary(value, endOfDay = false) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return (
    new Date(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ).getTime() / 1000
  );
}

function inDateRange(timestamp, from, to) {
  const value = timestamp || 0;
  if (from !== null && (!value || value < from)) return false;
  if (to !== null && (!value || value > to)) return false;
  return true;
}

function conversationTimestamp(conversation) {
  return conversation?.createdAt || conversation?.updatedAt || 0;
}

function excerpt(text, query) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!query) return compact.slice(0, 150);
  const normalized = normalizeForSearch(compact);
  const foundAt = normalized.indexOf(normalizeForSearch(query));
  const start = Math.max(0, foundAt < 0 ? 0 : foundAt - 64);
  const prefix = start > 0 ? "…" : "";
  const suffix = start + 170 < compact.length ? "…" : "";
  return `${prefix}${compact.slice(start, start + 170)}${suffix}`;
}
