export const GPT6_FAMILY_FILTER = "family:gpt-6";

// Match both API versions (6.1) and export versions (6-1), without
// treating a snapshot date or GPT-60 as a GPT-6 version.
const GPT6_ID = /^gpt-6(?:(?:\.|-)(\d{1,2}))?(?=-|$)/i;
const GPT62_VARIANT = /^gpt-6[.-]2-(sol|astra)(?=-|$)/i;

const GPT62_FILTERS = [
  { id: "variant:gpt-6.2-sol", label: "GPT-6.2 Sol" },
  { id: "variant:gpt-6.2-astra", label: "GPT-6.2 Astra" },
];

export function isGpt6Model(model) {
  return GPT6_ID.test(String(model?.id || "").trim());
}

export function modelMatchesFilter(model, filter) {
  if (!filter) return true;
  if (filter === GPT6_FAMILY_FILTER) return isGpt6Model(model);
  if (filter.startsWith("variant:gpt-6.2-")) return gpt62FilterId(model?.id) === filter;
  return model?.id === filter;
}

export function modelFilterOptions(models) {
  const options = [];
  if (models.some(isGpt6Model)) {
    options.push({ id: GPT6_FAMILY_FILTER, label: "GPT-6 (toda la familia)" });
  }

  const coveredIds = new Set();
  for (const filter of GPT62_FILTERS) {
    const matches = models.filter((model) => modelMatchesFilter(model, filter.id));
    options.push({ ...filter, unavailable: !matches.length });
    for (const model of matches) {
      if (model.label.toLowerCase() === filter.label.toLowerCase()) coveredIds.add(model.id);
    }
  }

  return options.concat(models.filter((model) => !coveredIds.has(model.id)));
}

export function modelSearchTerms(model) {
  if (!model) return "";
  const id = String(model.id || "").trim();
  const label = String(model.label || id);
  const terms = [id, label];
  const match = id.match(GPT6_ID);
  if (!match) return terms.join("\n");

  const version = match[1] ? `6.${match[1]}` : "6";
  terms.push(
    "GPT-6 GPT 6 GPT6 familia 6",
    `GPT-${version} GPT ${version} GPT${version}`,
    label.replace(/^GPT-/i, "GPT "),
  );

  // ChatGPT's GPT-6 Pro is powered by Astra. This is a search alias;
  // keep the original exported id and label as the historical record.
  if (version === "6" && /^-pro(?:-|$)/i.test(id.slice(match[0].length))) {
    terms.push("Astra");
  }
  return terms.join("\n");
}

function gpt62FilterId(id) {
  const variant = GPT62_VARIANT.exec(String(id ?? "").trim())?.[1];
  return variant ? `variant:gpt-6.2-${variant.toLowerCase()}` : null;
}
