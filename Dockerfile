# syntax=docker/dockerfile:1

# ---- build -----------------------------------------------------------------
# Generate the JavaScript bundle inside Docker; dist/ does not need committing.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY main.js ./
RUN npm run build

# ---- serve -----------------------------------------------------------------
FROM nginx:1.30-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
COPY index.html style.css mydesk.png ./
COPY assets ./assets
COPY --from=build /app/dist ./dist

EXPOSE 80
