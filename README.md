# NutriSport-frontend
NutriSport AI es una aplicación web que ayuda a deportistas a planificar, registrar y analizar su alimentación teniendo en cuenta sus objetivos físicos, sus hábitos alimentarios y su actividad deportiva.

## Docker

La imagen compila la aplicación con Node 22 y la sirve con nginx, que además hace de proxy inverso de `/api/` hacia el backend. La app queda en **http://localhost:4200**, el mismo origen que el backend espera en `app.frontend-url`.

El frontend se une a la red `nutrisport-backend_default`, que crea el `docker-compose` del backend, así que **levanta antes el backend**.

```bash
# Construir y arrancar (backend en el contenedor nutrisport-backend)
docker compose up -d --build

# Ver logs
docker compose logs -f frontend

# Parar y eliminar el contenedor
docker compose down
```

### Backend ejecutado en el propio ordenador

Si el backend corre fuera de Docker (por ejemplo desde el IDE en el puerto 8080):

```bash
# Bash
BACKEND_URL=http://host.docker.internal:8080 docker compose up -d --build

# PowerShell
$env:BACKEND_URL="http://host.docker.internal:8080"; docker compose up -d --build
```

La red `nutrisport-backend_default` tiene que existir igualmente. Si no tienes el backend en Docker, créala una vez con `docker network create nutrisport-backend_default`.

### Sin docker compose

```bash
docker build -t nutrisport-frontend .
docker run -d --name nutrisport-frontend -p 4200:80 \
  -e BACKEND_URL=http://host.docker.internal:8080 \
  --add-host host.docker.internal:host-gateway \
  nutrisport-frontend
```

> nginx resuelve el host de `BACKEND_URL` al arrancar. Si no lo encuentra (backend parado o fuera de la red), el contenedor se detiene con `host not found in upstream`. Arranca el backend y vuelve a lanzar el frontend.
