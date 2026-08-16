# 001 · nginx sin privilegios, pero en el puerto 80

- **Fecha**: 2026-08-16 (la decisión es anterior; esto solo la saca del código)
- **Estado**: aceptada
- **Afecta a**: `Dockerfile`, los tres ficheros compose del proyecto **y el
  compose propio de cualquiera que ya tenga la aplicación instalada**

## Contexto

Este contenedor sí puede correr como usuario sin privilegios de principio a fin:
a diferencia del backend (ver `backend_fastapi/docs/adr/002-…`), no monta ningún
volumen, así que no hay datos ajenos cuya propiedad haya que ceder al actualizar.

La receta habitual para ello es cambiar a `nginx-unprivileged` y mover el
servicio al 8080. Y ahí está el problema: el puerto es parte del contrato
público. Cambiarlo obliga a tocar el `"${PORT}:80"` de los tres composes del
repo y, sobre todo, el de cualquiera que tenga el suyo propio — que se quedaría
sin frontend al actualizar, sin haber cambiado nada.

## Decisión

`USER nginx`, **manteniendo el puerto 80**.

Es viable porque Docker arranca los contenedores con
`net.ipv4.ip_unprivileged_port_start=0`, así que un usuario normal puede atar al
80. Si algún día se despliega en un runtime que no lo haga, nginx fallará al
arrancar con `permission denied` en el bind: ruidoso y evidente, no un fallo
silencioso.

Lo que se escribe en cada arranque, y por tanto hay que ceder: la caché de
nginx, el pid, sus logs, el `default.conf` que genera envsubst y el `env.js` con
la configuración del cliente.

`env.js` se **pre-crea** con `touch` para poder cedérselo suelto. Dar
`/usr/share/nginx/html` entero dejaría el sitio estático escribible por el
proceso que lo sirve, que es justo lo que no interesa; así el resto sigue siendo
de solo lectura.

## Alternativas descartadas

- **`nginx-unprivileged` en el 8080** — rompe el compose de todo usuario
  existente al actualizar. El coste recae sobre quien no pidió el cambio.
- **`chown -R` sobre `/usr/share/nginx/html`** — hace escribible el sitio
  estático desde el proceso que lo sirve. Convierte una escritura arbitraria en
  defacement persistente.
- **Seguir como root** — innecesario aquí, precisamente porque no hay volumen.

## Consecuencias

- La imagen depende de que el runtime permita atar al 80 sin privilegios. Docker
  lo hace por defecto; otros runtimes puede que no, y el fallo sería en el
  arranque.
- El contrato `"${PORT}:80"` queda congelado: cambiarlo es un breaking change
  para las instalaciones existentes, no un detalle interno.
