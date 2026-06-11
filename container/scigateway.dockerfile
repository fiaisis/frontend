FROM harbor.stfc.ac.uk/datagateway/scigateway:v4.1.1@sha256:f8072c9ea738a2e97d998d7b629d6998de949c15f18ccca0950f1388b2e7c71f

WORKDIR /usr/local/apache2/htdocs

USER root

# Keep the browser title aligned with FIA branding
RUN sed -i -e 's/<title>SciGateway<\/title>/<title>FIA<\/title>/' index.html

USER www-data

COPY --chown=www-data:www-data settings.json ./settings.json
COPY --chown=www-data:www-data default.json ./res/default.json
COPY --chown=www-data:www-data images ./res/images
COPY --chown=www-data:www-data favicon.ico ./favicon.ico

