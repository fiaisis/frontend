ENV AUTH_URL /auth
ENV AUTH_PROVIDER jwt
FROM harbor.stfc.ac.uk/datagateway/scigateway:v4.1.0@sha256:a8c2de9c741d811bb2af7c1483120a37af36957f167ceaba82696ea14d41f7d0

WORKDIR /usr/local/apache2/htdocs

USER root

# Keep the browser title aligned with FIA branding
RUN sed -i -e 's/<title>SciGateway<\/title>/<title>FIA<\/title>/' index.html

USER www-data

COPY --chown=www-data:www-data settings.json ./settings.json
COPY --chown=www-data:www-data default.json ./res/default.json
COPY --chown=www-data:www-data images ./res/images
COPY --chown=www-data:www-data favicon.ico ./favicon.ico

