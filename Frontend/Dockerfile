FROM node:20-alpine AS build
WORKDIR /app
ARG API_URL=http://localhost:5000
ARG BUILD_PUBLIC_VALUE_1=
ARG BUILD_PUBLIC_VALUE_2=

ENV VITE_API_URL=$API_URL
ENV VITE_TURNSTILE_SITE_KEY=$BUILD_PUBLIC_VALUE_1
ENV VITE_GOOGLE_CLIENT_ID=$BUILD_PUBLIC_VALUE_2

COPY package*.json ./
RUN npm ci
COPY . .
RUN printf "VITE_API_URL=%s\nVITE_TURNSTILE_SITE_KEY=%s\nVITE_GOOGLE_CLIENT_ID=%s\n" "$VITE_API_URL" "$VITE_TURNSTILE_SITE_KEY" "$VITE_GOOGLE_CLIENT_ID" > .env.production.local \
    && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
