# Stage 1: Build
FROM node:lts-alpine3.19@sha256:ec0c413b1d84f3f7f67ec986ba885930c57b5318d2eb3abc6960ee05d4f2eb28 as build

WORKDIR /app

ENV VITE_FIA_REST_API_URL="/api"
ENV VITE_FIA_DATA_VIEWER_URL="/data-viewer"
ENV VITE_PLUGIN_URL="/f-i-a"
ENV VITE_FIA_PLOTTING_API_URL="/plottingapi"
ENV VITE_FIA_PLOTTING_API_URL_FOR_H5="https://dev.reduce.isis.cclrc.ac.uk/plottingapi"

COPY . .

RUN yarn install --frozen-lockfile
RUN yarn build

# Stage 2: Serve

FROM nginx:stable-alpine3.17-slim@sha256:0a8c5686d40beca3cf231e223668cf77c91344d731e7d6d34984e91a938e10f6

COPY --from=build /app/build /usr/share/nginx/html
COPY ./container/healthz /usr/share/nginx/html/healthz

ENV VITE_FIA_REST_API_URL="/api"

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]