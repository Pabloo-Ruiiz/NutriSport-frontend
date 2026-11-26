# syntax=docker/dockerfile:1

# ---------- Etapa 1: build de Angular ----------
FROM node:22-alpine AS build
WORKDIR /app

# Instala dependencias primero para aprovechar la caché de capas
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:prod

# ---------- Etapa 2: servidor estático + proxy inverso ----------
FROM nginx:alpine

# URL del backend a la que nginx reenvía /api/. La imagen oficial de nginx
# aplica envsubst a /etc/nginx/templates/*.template al arrancar y deja el
# resultado en /etc/nginx/conf.d/.
ENV BACKEND_URL=http://nutrisport-backend:8080

# Eliminamos la configuración por defecto para que solo quede la nuestra
RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/nutrisport/browser /usr/share/nginx/html

EXPOSE 80
