# Stage 1: Build
FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81 AS build

WORKDIR /app

ENV VITE_FIA_REST_API_URL="/api"
ENV VITE_FIA_DATA_VIEWER_URL="/data-viewer"
ENV VITE_PLUGIN_URL="/f-i-a"
ENV VITE_FIA_PLOTTING_API_URL="/plottingapi"


COPY . .

RUN yarn install --immutable
RUN yarn build

# Stage 2: Serve

FROM nginx:stable-alpine3.17-slim@sha256:0a8c5686d40beca3cf231e223668cf77c91344d731e7d6d34984e91a938e10f6

COPY --from=build /app/build /usr/share/nginx/html
COPY ./container/healthz /usr/share/nginx/html/healthz

ENV VITE_FIA_REST_API_URL="/api"

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
