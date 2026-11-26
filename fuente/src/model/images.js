const MODERN_FILE_ID = "file_[0-9a-f]{32}";
const LEGACY_FILE_ID = "file-[a-z0-9]{16,64}";
const FILE_ID = new RegExp(`^(${MODERN_FILE_ID}|${LEGACY_FILE_ID})$`, "i");
const FILE_ID_PREFIX = new RegExp(`^(${MODERN_FILE_ID}|${LEGACY_FILE_ID})(?=$|[._-])`, "i");
const IMAGE_FILENAME = /\.(apng|avif|bmp|gif|ico|jpe?g|jfif|png|webp)$/i;

export const ASSET_NAMES_FILE = "conversation_asset_file_names.json";
export const GENERATED_IMAGES_FILE = "library_files.json";

export function isImageMetadataFile(file) {
  const name = file.name.toLowerCase();
  return name === ASSET_NAMES_FILE || name === GENERATED_IMAGES_FILE;
}

export function imageAssetId(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim().replace(/^(sediment|file-service):\/\//i, "").replace(/\.dat$/i, "");
  const match = FILE_ID.exec(candidate);
  if (!match) return null;
  return match[1].charAt(4) === "_" ? match[1].toLowerCase() : match[1];
}

export function imageIdFromFilename(name) {
  return imageAssetId(FILE_ID_PREFIX.exec(name)?.[1]);
}

export function imageBasename(value) {
  if (typeof value !== "string") return "";
  return value.split(/[/\\]/).at(-1).replace(/[\x00-\x1f\x7f]/g, "").trim();
}

export function isImageFilename(name) {
  return IMAGE_FILENAME.test(name);
}
