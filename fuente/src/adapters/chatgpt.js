import {
  normalizedConversation,
  normalizedMessage,
  SUPPORTED_ROLES,
} from "../model/schema.js";

export const chatGptAdapter = {
  id: "chatgpt",
  label: "ChatGPT",

  detect(raw) {
    const conversations = sourceConversations(raw);
    if (!conversations) return 0;
    if (!conversations.length) return Array.isArray(raw?.conversations) ? 0.4 : 0;

    const sample = conversations.find(Boolean) || {};
    const hasMapping = sample.mapping && typeof sample.mapping === "object";
    const hasDirectChatGptMessages = Array.isArray(sample.messages) && sample.messages.some(
      (message) => message?.author?.role && message?.content,
    );
    if (!hasMapping && !hasDirectChatGptMessages) return 0;

    let score = hasMapping ? 0.8 : 0.65;
    if ("current_node" in sample) score += 0.1;
    if ("create_time" in sample || "update_time" in sample) score += 0.1;
    return Math.min(score, 1);
  },

  extract(raw) {
    const source = sourceConversations(raw);
    if (!source) throw new Error("El JSON no contiene una lista de conversaciones de ChatGPT.");
    return source;
  },

  normalize(conversation, index = 0) {
    const messages = activeMessages(conversation || {});
    const sourceId = conversation?.id || conversation?.conversation_id || index;

    return normalizedConversation({
      id: `chatgpt:${sourceId}`,
      platform: this.id,
      title: conversation?.title || "Conversación sin título",
      createdAt: conversation?.create_time,
      updatedAt: conversation?.update_time,
      messages,
    });
  },
};

export function sourceConversations(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.conversations)) return raw.conversations;
  return null;
}

export function activeMessages(conversation) {
  const mapping = conversation?.mapping;
  if (!mapping || typeof mapping !== "object") {
    const direct = Array.isArray(conversation?.messages) ? conversation.messages : [];
    return direct
      .map((message, index) => visibleMessage({ id: index, message }))
      .filter(Boolean);
  }

  const reversed = [];
  const seen = new Set();
  let nodeId = conversation.current_node;

  if (!nodeId || !mapping[nodeId]) {
    const leaves = Object.values(mapping).filter(
      (node) => node && (!Array.isArray(node.children) || node.children.length === 0),
    );
    leaves.sort((left, right) => {
      const leftTime = left?.message?.create_time || 0;
      const rightTime = right?.message?.create_time || 0;
      return rightTime - leftTime;
    });
    nodeId = leaves[0]?.id;
  }

  while (nodeId && mapping[nodeId] && !seen.has(nodeId)) {
    seen.add(nodeId);
    const node = mapping[nodeId];
    const message = visibleMessage(node);
    if (message) reversed.push(message);
    nodeId = node.parent;
  }

  if (reversed.length) return reversed.reverse();

  return Object.values(mapping)
    .map(visibleMessage)
    .filter(Boolean)
    .sort((left, right) => (left.createdAt || 0) - (right.createdAt || 0));
}

export function visibleMessage(node) {
  const message = node?.message;
  if (!message) return null;
  if (message.metadata?.is_visually_hidden_from_conversation) return null;

  const role = message.author?.role || "unknown";
  if (!SUPPORTED_ROLES.has(role)) return null;

  const text = messageText(message);
  if (!text) return null;

  return normalizedMessage({
    id: message.id || node.id || "mensaje-sin-id",
    role,
    authorLabel: role === "user" ? "Tú" : "ChatGPT",
    text,
    createdAt: message.create_time,
    contentType: message.content?.content_type || "text",
    model: role === "assistant" ? exportedModel(message) : null,
  });
}

export function exportedModel(message) {
  const slug = message?.metadata?.model_slug;
  if (typeof slug !== "string" || !slug.trim()) return null;
  const id = slug.trim();
  return {
    id,
    label: friendlyModelName(id),
    source: "export",
  };
}

export function friendlyModelName(slug) {
  const id = String(slug || "").trim();
  if (!id) return "";

  const tokens = id.split("-").filter(Boolean);
  if (tokens[0]?.toLocaleLowerCase() === "gpt" && tokens[1]) {
    let version = tokens[1];
    let restStart = 2;
    if (/^\d+$/.test(version) && /^\d+$/.test(tokens[2] || "")) {
      version = `${version}.${tokens[2]}`;
      restStart = 3;
    }
    const suffix = tokens.slice(restStart).map(titleToken).join(" ");
    return `GPT-${version}${suffix ? ` ${suffix}` : ""}`;
  }

  if (/^o\d+$/i.test(tokens[0] || "")) {
    const suffix = tokens.slice(1).map(titleToken).join(" ");
    return `${tokens[0].toLocaleLowerCase()}${suffix ? ` ${suffix}` : ""}`;
  }

  return id;
}

export function messageText(message) {
  const content = message?.content;
  if (!content) return "";
  if (Array.isArray(content.parts)) return joinParts(content.parts);
  if (typeof content.text === "string") return content.text.trim();
  if (Array.isArray(content.text)) return joinParts(content.text);
  if (typeof content.content === "string") return content.content.trim();
  if (Array.isArray(content.content)) return joinParts(content.content);
  if (typeof content.transcript === "string") return content.transcript.trim();
  if (typeof content.result === "string") return content.result.trim();
  return "";
}

function joinParts(parts) {
  return parts.map(partToText).filter(Boolean).join("\n").trim();
}

function partToText(part) {
  if (typeof part === "string") return part;
  if (part == null) return "";
  if (typeof part === "number" || typeof part === "boolean") return String(part);
  if (typeof part.text === "string") return part.text;
  if (Array.isArray(part.text)) return joinParts(part.text);
  if (typeof part.content === "string") return part.content;
  if (Array.isArray(part.content)) return joinParts(part.content);
  if (typeof part.transcript === "string") return part.transcript;
  if (typeof part.caption === "string") return part.caption;
  if (Array.isArray(part.parts)) return joinParts(part.parts);
  if (Array.isArray(part.children)) return joinParts(part.children);
  if (part.asset_pointer || part.image_url) return "[Imagen]";
  return "";
}

function titleToken(token) {
  return token ? token[0].toLocaleUpperCase() + token.slice(1) : "";
}
