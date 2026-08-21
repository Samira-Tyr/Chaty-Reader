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
