FROM node:16.14-alpine AS base

ARG VERSION=1.03
ENV VERSION=${VERSION}

ENV API_PORT=8008
ENV MONGO_DB_URL=mongodb+srv://user:password@host/db-name

# bash: /bin/bash
# curl: /usr/bin/curl
RUN apk update && apk add --no-cache curl bash

RUN npm install -g npm@8.5.1 
RUN npm install -g @nftoolkit/agenda-rest@${VERSION}

EXPOSE ${API_PORT}

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
            CMD curl -s -f localhost:${API_PORT}/health || exit 1

CMD agenda-rest --port ${API_PORT} --dburi ${MONGO_DB_URL}

FROM base AS mongo-atlas-whitelist

ENV SERVICE_NAME='scheduler'

ENV MONGO_ATLAS_API_PK=''
ENV MONGO_ATLAS_API_SK=''
ENV MONGO_ATLAS_API_PROJECT_ID=''

# used for whitelisting script
RUN apk update && apk add --no-cache jq

COPY ./docker/scripts/mongo-atlas-whitelist-entrypoint.sh /tmp/entrypoint.sh

ENTRYPOINT [ "/bin/bash", "/tmp/entrypoint.sh" ]
# NOTE: must re-define the CMD because entrypoint is "overridden" (relative to default docker-entrypoint.sh)
CMD agenda-rest --port ${API_PORT} --dburi ${MONGO_DB_URL}
