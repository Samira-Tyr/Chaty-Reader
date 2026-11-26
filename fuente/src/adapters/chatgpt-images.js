import {
  ASSET_NAMES_FILE,
  GENERATED_IMAGES_FILE,
  imageAssetId,
  imageBasename,
  isImageFilename,
} from "../model/images.js";
import { normalizedMessage } from "../model/schema.js";

export function isImagePart(part) {
  if (!part || typeof part !== "object") return false;
  return Boolean(
    part.content_type === "image_asset_pointer" ||
    part.image_asset_pointer ||
    part.image_url ||
    (part.asset_pointer && (!part.content_type || isImageMime(part.mime_type))),
  );
}

export function messageImages(message, assetNames) {
  const images = [];
  const byId = new Map();
  const content = message.content;
  collectParts(isImagePart(content) ? [content] : content?.parts ?? content?.text ?? content?.content);

  const attachments = message.metadata?.attachments;
  if (Array.isArray(attachments)) {
    for (const attachment of attachments) {
      const id = imageAssetId(attachment?.id ?? attachment?.file_id ?? attachment?.asset_pointer);
      const name = imageBasename(attachment?.name ?? attachment?.file_name);
      if (byId.has(id) || isImageMime(attachment?.mime_type ?? attachment?.mimeType) || isImageFilename(name)) {
        addImage(id, name);
      }
    }
  }
  return images;

  function collectParts(parts) {
    if (!Array.isArray(parts)) return;
    for (const part of parts) {
      if (isImagePart(part)) {
        const pointer = part.asset_pointer ?? part.image_asset_pointer;
        const id = imageAssetId(pointer?.asset_pointer ?? pointer ?? part.file_id ?? part.image_url);
        addImage(id, imageBasename(part.name ?? part.file_name));
      } else if (part && typeof part === "object") {
        collectParts(part.parts ?? part.children ?? part.text ?? part.content);
      }
    }
  }

  function addImage(id, name) {
    const existing = id && byId.get(id);
    if (existing) {
      if (name) existing.name = name;
      return;
    }
    const image = { id, name: name || assetNames?.get(id) || "" };
    images.push(image);
    if (id) byId.set(id, image);
  }
}

export async function readChatGptImageMetadata(files) {
  const assetNames = new Map();
  const generatedByConversation = new Map();

  for (const file of files) {
    const filename = file.name.toLowerCase();
    if (filename !== ASSET_NAMES_FILE && filename !== GENERATED_IMAGES_FILE) continue;
    let raw;
    try {
      raw = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
    } catch {
      throw new Error(`No pude leer el índice de imágenes ${file.name}.`);
    }

    if (filename === ASSET_NAMES_FILE && raw && !Array.isArray(raw) && typeof raw === "object") {
      for (const [key, value] of Object.entries(raw)) {
        const id = imageAssetId(key);
        const name = imageBasename(value);
        if (id && name) assetNames.set(id, name);
      }
    }
    if (filename === GENERATED_IMAGES_FILE && Array.isArray(raw)) {
      for (const record of raw) {
        if (!record?.image_gen_generation_id) continue;
        const conversationId = record.origination_thread_id || record.initiating_conversation_id;
        const id = imageAssetId(record.file_id);
        if (typeof conversationId !== "string" || !conversationId || !id) continue;
        const name = imageBasename(record.file_name || record.normalized_name);
        const timestamp = Date.parse(record.created_at || record.record_creation_time || record.file_upload_time);
        const image = {
          id,
          name,
          messageId: record.origination_message_id,
          createdAt: Number.isFinite(timestamp) ? timestamp / 1000 : null,
        };
        const records = generatedByConversation.get(conversationId) ?? [];
        if (!records.length) generatedByConversation.set(conversationId, records);
        records.push(image);
      }
    }
  }
  return { assetNames, generatedByConversation };
}

export function addGeneratedImages(messages, records, assetNames) {
  if (!records?.length) return messages;
  const byMessage = new Map(messages.map((message) => [message.id, message]));
  const knownImageIds = new Set(messages.flatMap((message) => (message.images ?? []).map((image) => image.id)));
  const generatedMessages = [];

  for (const record of records) {
    if (knownImageIds.has(record.id)) continue;
    knownImageIds.add(record.id);
    const image = { id: record.id, name: record.name || assetNames?.get(record.id) || "" };
    const origin = byMessage.get(record.messageId);
    if (origin) {
      (origin.images ??= []).push(image);
    } else {
      generatedMessages.push(normalizedMessage({
        id: `imagen-generada:${record.id}`,
        role: "image",
        authorLabel: "Imagen generada",
        text: "",
        createdAt: record.createdAt,
        contentType: "image",
        images: [image],
      }));
    }
  }

  if (!generatedMessages.length) return messages;
  generatedMessages.sort((left, right) => (left.createdAt ?? Infinity) - (right.createdAt ?? Infinity));
  const timeline = [];
  let index = 0;
  for (const message of messages) {
    while (message.createdAt !== null && index < generatedMessages.length &&
      (generatedMessages[index].createdAt ?? Infinity) <= message.createdAt) {
      timeline.push(generatedMessages[index++]);
    }
    timeline.push(message);
  }
  return timeline.concat(generatedMessages.slice(index));
}

function isImageMime(value) {
  return typeof value === "string" && /^image\//i.test(value);
}
