FROM harbor.stfc.ac.uk/datagateway/scigateway@sha256:b80383f50d4cddb9d6412f38eca97adc88c2611afa19753740028fcd9f03c5cd
ENV AUTH_URL /auth
ENV AUTH_PROVIDER jwt

WORKDIR /usr/local/apache2/htdocs

USER root
# Change the title
RUN sed -i -e 's/<title>SciGateway<\/title>/<title>FIA<\/title>/' index.html
USER www-data

COPY --chown=www-data:www-data settings.json ./settings.json
COPY --chown=www-data:www-data default.json ./res/default.json
COPY --chown=www-data:www-data images ./res/images
COPY --chown=www-data:www-data favicon.ico ./favicon.ico

