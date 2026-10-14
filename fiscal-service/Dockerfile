# Retain the exact PHP and NFePHP runtime currently published; no dependency refresh.
ARG FISCAL_RUNTIME_IMAGE=us-central1-docker.pkg.dev/ana-guimaraes/cloud-run-source-deploy/ana-guimaraes-fiscal-service@sha256:d3d18e8d8888840bed150eb7b8ca2b00c8e55705112119f6cf3231d4b41e3395
FROM ${FISCAL_RUNTIME_IMAGE}
WORKDIR /var/www/html
RUN docker-php-ext-install bcmath
COPY public /var/www/html/public
COPY src /var/www/html/src
COPY config /var/www/html/config
COPY tests /var/www/html/tests
RUN find public src tests -name '*.php' -exec php -l {} \; \
  && php tests/PayloadValidatorTest.php \
  && php tests/FreightXmlTest.php
