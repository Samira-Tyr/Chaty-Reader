import { imageBasename, imageIdFromFilename, isImageFilename } from "../model/images.js";

export function isLocalImageFile(file) {
  return isImageFilename(file.name) || (/\.dat$/i.test(file.name) && !!imageIdFromFilename(file.name));
}

export function mergeSelectedFiles(current, incoming) {
  const files = new Map(current.map((file) => [selectionKey(file), file]));
  for (const file of incoming) files.set(selectionKey(file), file);
  return Array.from(files.values());
}

export function buildLocalImageIndex(files, conversations) {
  const byId = new Map();
  const byName = new Map();
  const nameOwners = new Map();

  for (const file of files) {
    const id = imageIdFromFilename(file.name);
    if (id) {
      if (!byId.has(id)) byId.set(id, file);
    } else {
      const name = nameKey(file.name);
      byName.set(name, byName.has(name) ? null : file);
    }
  }

  if (byName.size) {
    for (const conversation of conversations) {
      for (const message of conversation.messages) {
        for (const image of message.images ?? []) {
          const name = nameKey(image.name);
          if (!byName.has(name)) continue;
          const owner = image.id || image;
          const previous = nameOwners.get(name);
          nameOwners.set(name, previous === undefined || previous === owner ? owner : null);
        }
      }
    }
  }

  return { byId, byName, nameOwners };
}

export function findLocalImage(index, image) {
  const exact = index.byId.get(image.id);
  if (exact) return exact;
  const name = nameKey(image.name);
  if (index.nameOwners.get(name) !== (image.id || image)) return null;
  return index.byName.get(name) || null;
}

export function countImageLinks(index, conversations) {
  let total = 0;
  let located = 0;
  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      for (const image of message.images ?? []) {
        total++;
        if (findLocalImage(index, image)) located++;
      }
    }
  }
  return { total, located };
}

export async function localImageBlob(file) {
  const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const mime = imageMime(head);
  return mime ? file.slice(0, file.size, mime) : null;
}

function imageMime(head) {
  const ascii = String.fromCharCode(...head);
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (ascii.startsWith("\x89PNG\r\n\x1a\n")) return "image/png";
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) return "image/gif";
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image/webp";
  if (ascii.slice(4, 8) === "ftyp" && /avif|avis/.test(ascii.slice(8))) return "image/avif";
  if (ascii.startsWith("BM")) return "image/bmp";
  if (ascii.startsWith("\x00\x00\x01\x00")) return "image/x-icon";
  return null;
}

function nameKey(value) {
  return imageBasename(value).normalize("NFC").toLowerCase();
}

function selectionKey(file) {
  return JSON.stringify([file.webkitRelativePath || file.name, file.size, file.lastModified]);
}
