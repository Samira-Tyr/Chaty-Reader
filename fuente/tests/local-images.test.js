import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalImageIndex, findLocalImage, localImageBlob } from "../src/app/local-images.js";

const firstId = "file_0123456789abcdef0123456789abcdef";
const secondId = "file_0123456789abcdef0123456789abcde0";

test("un identificador exacto prevalece sobre un nombre de imagen repetido", () => {
  const first = { id: firstId, name: "imagen.png" };
  const second = { id: secondId, name: "imagen.png" };
  const tagged = { name: `${firstId}.dat` };
  const generic = { name: "imagen.png" };
  const conversations = [{ messages: [{ images: [first] }] }, { messages: [{ images: [second] }] }];
  const index = buildLocalImageIndex([tagged, generic], conversations);
  assert.equal(findLocalImage(index, first), tagged);
  assert.equal(findLocalImage(index, second), null);
});

test("una copia con nombre inequívoco enlaza incluso sin el identificador en el nombre", () => {
  const image = { id: firstId, name: "Foto única.png" };
  const copy = { name: "FOTO ÚNICA.PNG" };
  const conversations = [{ messages: [{ images: [image] }] }];
  assert.equal(findLocalImage(buildLocalImageIndex([copy], conversations), image), copy);
  assert.equal(findLocalImage(buildLocalImageIndex([copy, { ...copy }], conversations), image), null);
});

test("lee el tipo real de los .dat y descarta archivos que no son imágenes", async () => {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const file = new File([signature], `${firstId}.dat`);
  assert.equal((await localImageBlob(file)).type, "image/png");
  assert.equal(await localImageBlob(new File(["%PDF"], `${secondId}.dat`)), null);
});
