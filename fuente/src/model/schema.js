export const INTERNAL_SCHEMA_VERSION = 2;

export const SUPPORTED_ROLES = new Set(["user", "assistant"]);

export function normalizedConversation({
  id,
  platform,
  title,
  createdAt = null,
  updatedAt = null,
  messages = [],
}) {
  const models = modelsFromMessages(messages);
  const assistantMessages = messages.filter((message) => message.role === "assistant");
  return {
    id: String(id),
    platform,
    title: String(title || "Conversación sin título"),
    createdAt: finiteTimestamp(createdAt),
    updatedAt: finiteTimestamp(updatedAt),
    messages,
    models,
    modelCoverage: {
      identified: assistantMessages.filter((message) => message.model).length,
      total: assistantMessages.length,
    },
  };
}

export function normalizedMessage({
  id,
  role,
  authorLabel,
  text,
  createdAt = null,
  contentType = "text",
  model = null,
}) {
  return {
    id: String(id),
    role,
    authorLabel: String(authorLabel || role),
    text: String(text || "").trim(),
    createdAt: finiteTimestamp(createdAt),
    contentType: String(contentType || "text"),
    model: normalizedModel(model),
  };
}

export function normalizedModel(model) {
  if (!model || typeof model !== "object") return null;
  const id = String(model.id || "").trim();
  if (!id) return null;
  return {
    id,
    label: String(model.label || id).trim() || id,
    source: String(model.source || "export"),
  };
}

export function modelsFromMessages(messages = []) {
  const unique = new Map();
  for (const message of messages) {
    const model = normalizedModel(message?.model);
    if (model && !unique.has(model.id)) unique.set(model.id, model);
  }
  return Array.from(unique.values());
}

export function finiteTimestamp(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeForSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}
