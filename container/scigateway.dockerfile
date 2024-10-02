FROM harbor.stfc.ac.uk/datagateway/scigateway@sha256:3c160722053260cbf89b85a9b1a13356c007e05270086ef77769d2b8f6f8e6d2

ENV AUTH_URL /auth
ENV AUTH_PROVIDER jwt

WORKDIR /usr/local/apache2/htdocs
COPY --chown=www-data:www-data settings.json ./settings.json
COPY --chown=www-data:www-data default.json ./res/default.json
COPY --chown=www-data:www-data images ./res/images
COPY --chown=www-data:www-data index.html ./index.html
COPY --chown=www-data:www-data favicon.ico ./favicon.ico
