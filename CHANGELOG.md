# Historial de cambios

Todos los cambios relevantes de Chaty Reader se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto utiliza versionado semántico.

## [Sin publicar]

### Seguridad y mantenimiento

- Preparación del repositorio público y documentación de privacidad.
- Compilación limpia para impedir que permanezcan recursos obsoletos.
- Avisos legales de dependencias conservados en el paquete compilado.
- Eliminada la persistencia innecesaria del nombre del último archivo abierto.
- Publicación bajo la licencia GNU GPL v3.0.
- Generación automática del ZIP de Windows al publicar una etiqueta de versión.
- Enlace estable de descarga y publicación automática de la versión declarada.

## [0.4.2] - 2026-11-26

### Añadido

- Apertura de carpetas de exportación completas con sus imágenes.
- Imágenes adjuntas en el mensaje original e imágenes generadas en su chat.
- Vinculación de carpetas de imágenes tras la carga de los chats, con recuento de referencias localizadas.
- Filtro para la familia GPT-6 y filtros independientes para GPT-6.2 Sol y Astra,
  incluidas sus variantes de Work.

### Mejorado

- Se conserva el chat y la búsqueda al añadir imágenes después de abrir los JSON.
- Los filtros de GPT-6.2 indican cuándo el archivo abierto carece de registros de ese modelo.

## [0.3.0] - 2026-08-21

### Añadido

- Modelo registrado junto a cada respuesta cuando existe `model_slug`.
- Resumen y cobertura de modelos por conversación.
- Búsqueda y filtro por modelo.
- Inclusión del modelo al copiar o guardar una conversación.

## [0.2.0] - 2026-08-21

### Añadido

- Modelo conversacional interno común y adaptador independiente de ChatGPT.
- Unión de fragmentos y eliminación de chats duplicados.
- Búsqueda por texto y fechas, filtros cronológicos y carga por tramos.
- Temas Azul profundo, Marfil y Steampunk.
- Instalador local para Windows y bloqueo explícito de conexiones de red.
