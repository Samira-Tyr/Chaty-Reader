# Arquitectura de Chaty Reader

Chaty Reader separa el formato de cada plataforma de la interfaz. La carpeta
`app/` contiene la versión portátil compilada; `fuente/` contiene el proyecto
mantenible.

## Flujo de datos

1. La interfaz entrega al *worker* local los JSON seleccionados.
2. El registro pregunta a cada adaptador si reconoce el contenido.
3. El adaptador transforma el formato original al modelo común.
4. El *worker* une fragmentos, elimina duplicados y ordena las conversaciones.
5. La interfaz solo recibe el modelo común y realiza búsqueda, filtros y copia.

Ninguna fase usa red ni conserva el contenido después de cerrar la ventana.

## Modelo interno común (v2)

Una conversación normalizada contiene:

- `id`: identificador estable con prefijo de plataforma.
- `platform`: identificador del adaptador.
- `title`: título legible.
- `createdAt` y `updatedAt`: marcas Unix en segundos o `null`.
- `messages`: mensajes de la rama activa.
- `models`: modelos distintos declarados por los mensajes.
- `modelCoverage`: número de respuestas con modelo identificado y total de
  respuestas del asistente.

Cada mensaje contiene:

- `id`, `role` y `authorLabel`.
- `text` seleccionable.
- `createdAt`.
- `contentType`.
- `model`: objeto opcional con `id`, `label` y `source`.
- `images`: referencias opcionales con el identificador y nombre del archivo.

El adaptador lee los punteros de imagen, los adjuntos y los índices
`conversation_asset_file_names.json` y `library_files.json`. Vincula las
imágenes generadas al mensaje de origen si aparece en el chat. Si el mensaje
no figura en la exportación, coloca la imagen en el chat en la fecha registrada.
La interfaz enlaza las referencias con los archivos locales seleccionados.

## Mantener el adaptador GPT

El adaptador implementa `id`, `label`, `detect(raw)`, `extract(raw)` y
`normalize(conversation, index)`. Cada variante real de una exportación debe
cubrirse con una muestra mínima ficticia y una prueba en `fuente/tests/`.

La interfaz no debe recibir campos específicos como `mapping`, `current_node`
o `create_time`: pertenecen únicamente al adaptador de ChatGPT. De la misma
forma, `metadata.model_slug` se transforma en el campo común `message.model`.

Esta edición está sellada para ChatGPT. Los formatos de otras plataformas no se
registran aquí; deben vivir en ediciones separadas que reutilicen el contrato
común sin convertir esta interfaz en un registro universal de exportaciones.

## Filtros de GPT-6

`fuente/src/model/models.js` reúne las versiones de GPT-6 en un filtro de
familia y reconoce GPT-6.2 Sol y Astra por separado, con sus variantes de Work.
Cada mensaje conserva el identificador registrado en la exportación.

## Compilar

Con Node.js instalado:

```text
cd fuente
npm install
npm test
npm run build
```

La compilación produce `app/assets/chaty-reader.js`,
`app/assets/chaty-reader.css` y copia el logotipo. El *worker* se integra como
un Blob local para que la aplicación siga funcionando desde `file://`.
