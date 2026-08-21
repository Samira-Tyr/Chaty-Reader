# Seguridad y privacidad

Chaty Reader procesa archivos que pueden contener conversaciones muy privadas.
Una vulnerabilidad que permita conexiones salientes, ejecución de contenido,
lectura de archivos no elegidos o persistencia inesperada debe tratarse como
prioritaria.

## Informar de una vulnerabilidad

No publiques conversaciones, exportaciones ni detalles explotables en una
incidencia abierta. Utiliza el canal privado de avisos de seguridad del
repositorio de GitHub cuando esté disponible.

Incluye una descripción mínima, la versión afectada, los pasos para reproducir
el problema con datos ficticios y el impacto observado.

## Límites de confianza

- Chaty Reader solo debe abrir archivos seleccionados expresamente.
- Los mensajes se presentan como texto; nunca se interpreta HTML de la
  conversación.
- La política CSP bloquea conexiones de red, objetos, formularios y recursos
  remotos.
- Los archivos originales no se modifican.
