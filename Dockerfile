# syntax=docker/dockerfile:1
#
# Render deployment image. Render's native Node runtime cannot install system
# packages, and this app needs a real Chromium binary (13 PDF routes), so the
# service is deployed as a Docker image instead.
#
# Node 22 because Next 16 requires >= 20.9 and 22 is the current LTS.
FROM node:22-bookworm-slim

# Chromium is for src/lib/pdf/render-pdf.ts, which renders invoices, packing
# lists, MTC certificates, dispatch dossiers and PO PDFs. The @sparticuz build
# in package.json is an AWS Lambda-only artefact and will not run here, so we
# install Debian's chromium and set CHROMIUM_EXECUTABLE_PATH — branch 1 of that
# file's browser resolution order, which exists precisely for this case.
#
# dumb-init runs as PID 1 to reap orphaned chrome processes. On Vercel a lambda
# was discarded after each request so leaked children died with it; this
# container lives for weeks, and a render that throws before browser.close()
# would otherwise accumulate zombies until the instance runs out of memory.
#
# The fonts are not optional: without them Chromium renders the rupee sign and
# any non-Latin text as tofu boxes, silently, on documents that go to clients.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      dumb-init \
      ca-certificates \
      fonts-liberation \
      fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Dependencies in their own layer so a source-only change does not reinstall.
# NODE_ENV is deliberately NOT set to production yet: typescript, tailwindcss
# and babel-plugin-react-compiler are devDependencies that `next build` needs,
# and npm ci would skip them.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so
# they have to exist during `next build` — setting them only at runtime leaves
# `undefined` compiled into the JavaScript. Render translates a service's
# environment variables into Docker build args automatically; these ARG lines
# are what makes them visible to the build.
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_OTP_ENABLED
ARG NEXT_PUBLIC_PRODUCTION_MODE
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_OTP_ENABLED=$NEXT_PUBLIC_OTP_ENABLED \
    NEXT_PUBLIC_PRODUCTION_MODE=$NEXT_PUBLIC_PRODUCTION_MODE

COPY . .

# `next build` evaluates every route module to collect its exported config
# (maxDuration, dynamic), which imports src/lib/prisma.ts, which parses
# `new URL(process.env.DATABASE_URL!)` at module scope. With no value that is
# a "TypeError: Invalid URL" and the build dies on the first API route. Vercel
# happened to expose DATABASE_URL to its builds, so this never showed up there.
#
# A placeholder is enough: nothing connects during a build, only parses. It is
# deliberately scoped to this one RUN rather than set with ENV, so it does not
# persist into the image — if the real DATABASE_URL is ever missing at runtime
# the app still fails loudly at startup instead of quietly aiming at localhost.
RUN DATABASE_URL="mysql://build:build@127.0.0.1:3306/build" npm run build

ENV NODE_ENV=production

# Next reads PORT from the environment; Render sets it.
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
