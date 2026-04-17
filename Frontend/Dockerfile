FROM node:20-alpine AS build
WORKDIR /app
ARG API_URL=http://localhost:5000
ARG BUILD_PUBLIC_VALUE_1=
ARG BUILD_PUBLIC_VALUE_2=
COPY package*.json ./
RUN npm install --include=optional
COPY . .
RUN VITE_API_URL="$API_URL" VITE_TURNSTILE_SITE_KEY="$BUILD_PUBLIC_VALUE_1" VITE_GOOGLE_CLIENT_ID="$BUILD_PUBLIC_VALUE_2" npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
