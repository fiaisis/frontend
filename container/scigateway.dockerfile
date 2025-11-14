FROM harbor.stfc.ac.uk/datagateway/scigateway@sha256:a807d647dfbf183c848bab177b4ae8e503ac7cb784ab717848b6c01b0de6c2a9
ENV AUTH_URL /auth
ENV AUTH_PROVIDER jwt

WORKDIR /usr/local/apache2/htdocs
COPY --chown=www-data:www-data settings.json ./settings.json
COPY --chown=www-data:www-data default.json ./res/default.json
COPY --chown=www-data:www-data images ./res/images
#COPY --chown=www-data:www-data index.html ./index.html
COPY --chown=www-data:www-data favicon.ico ./favicon.ico
