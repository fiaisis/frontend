# Stage 1: Build
FROM node:lts-alpine3.21 as build

WORKDIR /app

ENV VITE_FIA_REST_API_URL="/api"
ENV VITE_FIA_DATA_VIEWER_URL="/data-viewer"
ENV VITE_PLUGIN_URL="/f-i-a"
ENV VITE_FIA_PLOTTING_REST_API_URL="/plottingapi"

COPY . .

RUN yarn install --frozen-lockfile
RUN yarn build

# Stage 2: Serve

FROM nginx:stable-alpine3.21-slim

COPY --from=build /app/build /usr/share/nginx/html
COPY ./container/healthz /usr/share/nginx/html/healthz

ENV VITE_FIA_REST_API_URL="/api"
ENV VITE_FIA_PLOTTING_REST_API_URL="/plottingapi"


EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
