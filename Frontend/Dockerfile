FROM node:20-alpine AS build
WORKDIR /app
ARG BUILD_MODE=production

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:types && npx react-router build --mode $BUILD_MODE

FROM nginx:alpine
COPY --from=build /app/build/client /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
