# Contribuir a Chaty Reader

Gracias por querer mejorar Chaty Reader.

## Alcance

Este repositorio está sellado como **GPT Edition**. Son bienvenidas las
correcciones de errores, mejoras de accesibilidad, rendimiento, documentación y
compatibilidad con exportaciones de ChatGPT. Los adaptadores de otras
plataformas deben vivir en ediciones separadas.

No incluyas exportaciones reales, conversaciones privadas, identificadores de
cuenta ni otros datos personales en incidencias, pruebas o solicitudes de
cambio. Crea muestras mínimas y ficticias que reproduzcan la estructura.

## Flujo de trabajo

1. Describe primero el problema o la mejora propuesta.
2. Mantén cada cambio pequeño y centrado.
3. Añade o actualiza pruebas cuando cambie el comportamiento.
4. Ejecuta `npm run check` dentro de `fuente/`.
5. Explica qué cambió y cómo se verificó.

## Principios que no deben romperse

- Procesamiento completamente local.
- Cero telemetría y cero conexiones salientes.
- Ninguna API ni servicio obligatorio.
- Ninguna clasificación, resumen o inferencia automática sobre los recuerdos.
- La interfaz solo consume el modelo común; el JSON original pertenece al
  adaptador.
