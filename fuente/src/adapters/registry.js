import { chatGptAdapter } from "./chatgpt.js";

// Añadir una plataforma consiste en importar aquí un nuevo adaptador que cumpla
// detect(raw), extract(raw) y normalize(conversation, index).
export const adapters = [chatGptAdapter];

export function detectAdapter(raw) {
  return adapters
    .map((adapter) => ({ adapter, score: adapter.detect(raw) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)[0]?.adapter || null;
}

export function adapterLabel(id) {
  return adapters.find((adapter) => adapter.id === id)?.label || id;
}
