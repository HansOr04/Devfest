# Muro de "mi primer proyecto" · DevFest

Una experiencia para 4000 personas al mismo tiempo. Cada asistente responde cinco
preguntas sobre su primer proyecto, a lo largo del evento, y cada respuesta enciende
un cuadro dentro de la palabra **DEVFEST** en la pantalla grande.

```
apps/web        Frontend (Vite + React + Tailwind). Mobile-first. Rutas: /  /muro  /admin
apps/api        API (Fastify + WebSocket + Postgres)
packages/shared Tipos, estaciones, lenguajes, datos por año y el algoritmo del mosaico
deploy/         Dockerfiles y Caddyfile
```

## Cómo funciona

- **Una fila por persona.** Al abrir la web el teléfono recibe un token anónimo y un número
  de commit (`seq`). No hay login. El token vive en `localStorage`.
- **Cinco estaciones.** Lenguaje, año, qué construiste, qué salió mal, un consejo. Se abren
  desde `/admin` cuando el presentador lo indique. Quien llega tarde puede completar las anteriores.
- **El mosaico.** La palabra se dibuja con una fuente de píxeles de 5x7. Cada píxel es una
  celda base (107 en total). Según cuánta gente hay, cada celda se subdivide en `k×k` huecos
  (`k` de 1 a 8), así la palabra siempre está completa en gris y el porcentaje encendido se mantiene alto:

  | Personas | k | Capacidad |
  |---|---|---|
  | hasta 107 | 1 | 107 |
  | hasta 428 | 2 | 428 |
  | hasta 963 | 3 | 963 |
  | hasta 1712 | 4 | 1712 |
  | hasta 2675 | 5 | 2675 |
  | hasta 3852 | 6 | 3852 |
  | hasta 5243 | 7 | 5243 |
  | hasta 6848 | 8 | 6848 |

  El orden de llenado sigue el trazo de la palabra con algo de ruido. El algoritmo vive en
  `packages/shared/src/wall.ts` y es el mismo en el teléfono, la pantalla y la API.
- **Snapshot agregado.** La API reconstruye el estado del muro como máximo cada 2 segundos
  (solo si algo cambió) y envía el mismo JSON pre-serializado a todas las pantallas por WebSocket.
  Si el WebSocket cae, el cliente hace polling a `/api/wall`. 4000 envíos en un minuto producen
  unas 30 reconstrucciones, no 4000.
- **Rate limit por token, no por IP.** Todo el auditorio comparte la IP del wifi.
- **Nostalgia.** La interfaz cambia de época según el año que la persona eligió
  (Windows 98, XP, editor oscuro, VS Code), muestra un dato del año y una animación de
  "compilando" al guardar.
- **La sala, después de cada respuesta.** Como las estaciones se abren de a una, todo el
  auditorio está en la misma pregunta. La tarjeta que aparece al guardar solo muestra datos
  que ya existen en ese momento:

  | Estación | Qué muestra |
  |---|---|
  | Lenguaje | Dato curioso del lenguaje y ranking de lo más elegido hasta ahora |
  | Año | Dato del año y el rango de generaciones presentes en la sala |
  | Texto (3, 4 y 5) | La respuesta de otra persona **a esa misma pregunta** |

  Nunca se cita una respuesta de una estación que todavía no se abrió, porque nadie puede
  haberla escrito.

## Bienvenida y caché

El evento dura unas ocho horas y la gente cierra el navegador entre estación y estación, así
que el teléfono guarda lo suyo y el servidor deja de ser indispensable para pintar la pantalla.

- **Bienvenida.** Tres pantallas cortas la primera vez que alguien abre la web (qué es, cómo
  funciona, qué pasa con sus respuestas). Se marca como vista en `localStorage` y no vuelve a
  salir. Se puede saltar.
- **Caché local** en [apps/web/src/lib/storage.ts](apps/web/src/lib/storage.ts): el participante
  y el último snapshot del muro, con versión y vencimiento a las 36 horas. La app pinta desde ahí
  al instante y refresca cuando la red responde. Si el wifi se cae, la persona sigue viendo su
  commit y el muro tal como estaba. El snapshot completo de 600 personas ocupa 21 kB.
- **Service worker** ([apps/web/public/sw.js](apps/web/public/sw.js)), solo en producción.
  Los assets con hash, los stickers y el logo se sirven desde caché; el HTML va a la red primero
  con 3.5 s de tiempo límite y cae al shell guardado. La API y el WebSocket nunca se cachean ahí.
  Al desplegar hay que subir `CACHE_VERSION` para que los teléfonos suelten el shell viejo.
- **Caddy** marca `/assets/*`, `/stickers/*` y `/brand/*` como inmutables por un año, y deja
  `index.html` y `sw.js` con `no-cache`.

## Desarrollo

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d   # Postgres local
pnpm --filter @devfest/api dev                    # http://localhost:3010 (Postgres en 5442)
pnpm --filter @devfest/web dev                    # http://localhost:5180
pnpm --filter @devfest/api seed 350               # datos falsos para ensayar el muro
```

Abrir estaciones sin panel:

```bash
curl -X POST -H "x-admin-token: devfest-admin" http://localhost:3010/api/admin/stations/advance-to/year
```

## Despliegue en el VPS

Requisitos: Docker con el plugin compose, los puertos 80 y 443 libres, y un dominio
apuntando a la IP del VPS (Caddy saca el certificado de Let's Encrypt solo).

```bash
git clone <repo> && cd devfest
cp .env.example .env      # DOMAIN, POSTGRES_PASSWORD, ADMIN_TOKEN
docker compose up -d --build
```

Tarda unos minutos la primera vez. Después:

- Web: `https://DOMAIN` · Pantalla: `https://DOMAIN/muro` · Panel: `https://DOMAIN/admin`
- Estado: `docker compose ps` · Logs: `docker compose logs -f api`
- Backup: `docker compose exec db pg_dump -U devfest devfest > backup.sql`
- Export: botón "Exportar CSV" en el panel.

### Actualizar durante o después del evento

```bash
git pull && docker compose up -d --build
```

Los datos viven en el volumen `pgdata` y sobreviven a la reconstrucción. Sube
`CACHE_VERSION` en [apps/web/public/sw.js](apps/web/public/sw.js) cuando cambies el
frontend, o los teléfonos que ya entraron seguirán con el shell viejo.

### Si el service worker da problemas

Pon `VITE_DISABLE_SW=1` en el `.env` y reconstruye. Los teléfonos que ya lo tenían lo
desinstalan y borran sus cachés la próxima vez que abren la web.

### Lista de verificación antes del evento

1. `curl https://DOMAIN/api/health` responde `{"ok":true}`.
2. `/admin` pide token y entra con el del `.env`.
3. Abre la estación 1 desde el panel y comprueba que aparece en un teléfono real.
4. Deja `/muro` abierto en la pantalla grande y verifica que dice "en vivo".
5. Borra los datos de prueba antes de empezar:
   `docker compose exec db psql -U devfest -d devfest -c "truncate participants restart identity"`

### Capacidad

Un VPS de 2 vCPU / 4 GB aguanta este evento con holgura. La API es un solo proceso Node:
4000 WebSockets ociosos consumen unos 100 MB, y el pico realista de escritura
(4000 personas enviando en el mismo minuto) son ~70 req/s. Postgres tiene
`synchronous_commit=off` porque perder el último milisegundo de datos ante un corte de luz
es aceptable aquí y duplica el rendimiento de escritura.

Si necesitas más, levanta una segunda réplica de `api` detrás de Caddy: el snapshot se
reconstruye desde la base de datos cada 10 segundos aunque nadie lo marque sucio, así que
varias instancias convergen solas.

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/join` | Crea (o devuelve) el participante del token |
| GET | `/api/me` | Participante actual |
| GET | `/api/state` | Estaciones abiertas y conteo |
| PUT | `/api/answers/:station` | Guarda una respuesta `{ value }` |
| GET | `/api/wall` | Snapshot del muro |
| GET | `/api/cards/:seq` | Detalle de una tarjeta |
| GET | `/api/quotes` | Tarjetas aleatorias con texto |
| GET | `/api/stats` | Conteos por lenguaje y año |
| WS | `/ws` | Snapshot en vivo |
| POST | `/api/admin/stations/:id` | `{ open }` (header `x-admin-token`) |
| POST | `/api/admin/stations/advance-to/:id` | Abre hasta esa estación |
| POST | `/api/admin/cards/:seq/hide` | `{ hidden }` |
| GET | `/api/admin/export.csv` | Todo en CSV |

## Marca y recursos

La edición vive en [packages/shared/src/event.ts](packages/shared/src/event.ts): nombre, lema, fecha,
sede y capítulo. Cambiar ese archivo actualiza la web, la pantalla y el certificado.

Archivos opcionales que la app usa si existen y que ignora si no están:

| Ruta | Qué es |
|---|---|
| `apps/web/public/brand/gdg-quito.png` | Logo del capítulo en las cabeceras (fondo transparente, alto ~120 px) |
| `apps/web/public/stickers/*.png` | Arte de los stickers (cuadrado, fondo transparente, 512×512) |

Los nombres de los stickers están en [packages/shared/src/badges.ts](packages/shared/src/badges.ts):
`pionero`, `cdrom`, `stackoverflow`, `ia`, `destructor`, `juego`, `webmaster`, `autodidacta`,
`mentor`, `completo`. Si falta alguno, la tarjeta muestra un glifo en su lugar.

### Cómo agregar arte nuevo

El arte que sale del generador pesa más de 1 MB por imagen, demasiado para miles de teléfonos
en el wifi del evento. Deja los originales en `apps/web/assets/stickers-src/` (esa carpeta no
se versiona) y corre:

```bash
pnpm --filter @devfest/web stickers
```

Recorta el margen transparente, redimensiona a 320 px y escribe `nombre.webp` y `nombre.png`
en `public/stickers/`. Pasa de ~1.2 MB a ~30 kB por sticker. La app sirve el webp y deja el
png como respaldo.

## Certificado

Al completar las cinco estaciones la persona ve la palabra a pantalla completa y puede descargar
un PDF A4 horizontal con su nombre, su commit, sus respuestas y sus stickers. El nombre se pide
solo en ese momento y se guarda en el teléfono: nunca llega al servidor, así el muro sigue siendo
anónimo. jsPDF se carga bajo demanda, así que las personas que no piden el certificado no lo descargan.
