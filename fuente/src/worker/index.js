import { detectAdapter } from "../adapters/registry.js";
import { INTERNAL_SCHEMA_VERSION } from "../model/schema.js";

if (typeof self !== "undefined") self.onmessage = async (event) => {
  try {
    self.postMessage({ ok: true, document: await parseConversationFiles(event.data.files) });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "No pude leer los archivos.",
    });
  }
};

export async function parseConversationFiles(incomingFiles) {
  const files = Array.from(incomingFiles || []);
  if (!files.length) throw new Error("No recibí ningún archivo de conversaciones.");

  const unique = new Map();
  const detectedPlatforms = new Set();

  for (const file of files) {
    let raw;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      throw new Error(`${file.name} no es un archivo JSON válido.`);
    }

    const adapter = detectAdapter(raw);
    if (!adapter) {
      throw new Error(
        `${file.name} no coincide con ninguna exportación compatible. ` +
          "Esta versión reconoce exportaciones de ChatGPT.",
      );
    }

    detectedPlatforms.add(adapter.id);
    const source = adapter.extract(raw);
    source.forEach((conversation, index) => {
      const normalized = adapter.normalize(conversation, index);
      if (!normalized.messages.length) return;
      unique.set(normalized.id, normalized);
    });
  }

  const conversations = Array.from(unique.values()).sort(
    (left, right) => conversationTimestamp(right) - conversationTimestamp(left),
  );

  return {
    schemaVersion: INTERNAL_SCHEMA_VERSION,
    platforms: Array.from(detectedPlatforms),
    conversations,
  };
}

function conversationTimestamp(conversation) {
  return conversation?.createdAt || conversation?.updatedAt || 0;
}
