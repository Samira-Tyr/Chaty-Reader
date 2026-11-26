import { useEffect, useState } from "react";
import { findLocalImage, localImageBlob } from "./local-images.js";

export function MessageImages({ images, index }) {
  return (
    <div className="message-images">
      {images.map((image, position) => (
        <MessageImage
          key={image.id || position}
          image={image}
          file={findLocalImage(index, image)}
        />
      ))}
    </div>
  );
}

function MessageImage({ image, file }) {
  const [preview, setPreview] = useState(null);
  const [failedUrl, setFailedUrl] = useState(null);

  useEffect(() => {
    if (!file) return;
    let disposed = false;
    let url = null;

    async function preparePreview() {
      try {
        const blob = await localImageBlob(file);
        if (disposed) return;
        if (blob) url = URL.createObjectURL(blob);
        setPreview({ file, url });
      } catch {
        if (!disposed) setPreview({ file, url: null });
      }
    }

    preparePreview();
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  const name = image.name || "Imagen del mensaje";
  const current = preview?.file === file ? preview : null;

  if (!file || !current?.url || current.url === failedUrl) {
    const status = !file ? "Archivo de imagen no localizado" : current ? "No se pudo abrir la imagen" : "Cargando imagen…";
    return (
      <div className="message-image-status">
        <span>{status}</span>
        {image.name && <small>{image.name}</small>}
      </div>
    );
  }

  return (
    <img
      className="message-picture"
      src={current.url}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(current.url)}
    />
  );
}
