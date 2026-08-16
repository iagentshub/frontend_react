# Decisiones de arquitectura (ADR)

Por qué el código es como es. Un fichero por decisión, con fecha y estado.
Solo en español: es documentación interna de ingeniería, no de usuario.

Criterio y plantilla: los mismos que en
[`backend_fastapi/docs/adr/README.md`](../../../backend_fastapi/docs/adr/README.md).
Un bloque se mueve aquí cuando el porqué es transversal — afecta a la operación,
al despliegue o a más de un fichero; se queda en el código cuando solo explica
la línea que tiene debajo.

## Índice

| # | Decisión |
|---|---|
| [001](001-nginx-sin-privilegios-en-el-puerto-80.md) | nginx sin privilegios, pero en el puerto 80 |
