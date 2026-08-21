# Chaty Reader · GPT Edition

**AI Memory Decoder** para exportaciones de conversaciones de ChatGPT.

Chaty Reader convierte los JSON difíciles de leer de una exportación en chats
claros, ordenados, buscables y navegables. Funciona completamente en el
dispositivo: no necesita cuenta, API, GPU ni conexión a internet.

> **Chaty ordena los recuerdos. Tú decides cuáles tienen corazón.**

## Descargar

### [⬇ Descargar Chaty Reader para Windows](https://github.com/Samira-Tyr/Chaty-Reader/releases/latest/download/Chaty-Reader-Windows.zip)

La descarga incluye la aplicación compilada y el instalador local. No requiere
cuenta, API ni conexión a internet para funcionar.

## Qué hace

- Abre uno o varios archivos `conversations*.json` de una exportación.
- Detecta, une y elimina duplicados entre fragmentos.
- Reconstruye la rama activa de cada conversación.
- Ordena y filtra los chats por fecha.
- Busca títulos, frases, fechas y modelos registrados.
- Muestra el modelo asociado a cada respuesta cuando la exportación incluye
  `metadata.model_slug`.
- Permite copiar mensajes o conversaciones y guardarlas como `.txt`.
- Ofrece los temas Azul profundo, Marfil y Steampunk.
- Mantiene todo el procesamiento dentro del navegador local.

## Privacidad por diseño

Los archivos se leen mediante la API local de archivos del navegador y se
procesan en un *Web Worker*. Chaty Reader no contiene telemetría, analítica,
peticiones de red ni código de servidor. Su política de seguridad de contenido
bloquea explícitamente las conexiones salientes (`connect-src 'none'`).

La aplicación solo conserva en `localStorage` el tema visual elegido. El nombre
del archivo y las conversaciones permanecen en memoria mientras la ventana está
abierta y no se copian a la carpeta de instalación.

## Instalación en Windows

1. Descarga el paquete ZIP de una versión publicada.
2. Extráelo completamente.
3. Ejecuta `INSTALAR-AQUI.cmd`.
4. Abre **Chaty Reader** desde el escritorio o el menú Inicio.

No requiere permisos de administrador. Necesita Windows 10 u 11 y Microsoft
Edge, utilizado únicamente como motor de la ventana local.

## Desarrollo

Requisitos: Node.js 20 o posterior.

```bash
cd fuente
npm ci
npm test
npm run build
```

La compilación genera desde cero los recursos autocontenidos de `app/assets/`.
Para una comprobación completa:

```bash
npm run check
```

Los recursos compilados no se guardan en el repositorio. Cuando cambia la
versión de `fuente/package.json`, el flujo de publicación ejecuta las pruebas y
adjunta automáticamente el ZIP instalable de Windows a una nueva versión de
GitHub.

## Estructura

```text
app/                aplicación local compilada
fuente/src/         adaptador, modelo común, worker e interfaz
fuente/tests/       pruebas de formato, búsqueda, paquete y arranque
interno/            instalador y desinstalador de Windows
ARQUITECTURA.md      contrato interno y flujo de datos
```

## Alcance de esta edición

Este repositorio corresponde exclusivamente a **Chaty Reader · GPT Edition**.
No se incorporarán formatos de Claude, Gemini o Grok en esta edición. Otras
plataformas, si se desarrollan, tendrán ediciones y adaptadores separados para
evitar acoplamientos y conservar la sencillez.

La aplicación utiliza únicamente los datos presentes en la exportación. No
adivina modelos ausentes, no resume conversaciones y no clasifica recuerdos.
Los adjuntos que no contienen texto legible se representan como marcadores.

## Autoría

Proyecto concebido y dirigido por **Samira Tyr**, creado en colaboración con
**S.A. Verbo**.

Chaty Reader es un proyecto independiente y no está afiliado, patrocinado ni
respaldado por OpenAI. ChatGPT es una marca de su respectivo titular.

## Licencia

Chaty Reader se publica bajo la licencia
[GNU General Public License v3.0](LICENSE). Puedes usarlo, estudiarlo,
modificarlo y redistribuirlo bajo sus condiciones. Las versiones derivadas que
se distribuyan deben conservar la misma libertad y ofrecer su código fuente.
