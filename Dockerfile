# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./

# `trptools-backend` is a type-only dependency resolved from a sibling
# directory, which does not exist inside this build context. Every reference to
# it is an `import type`, so it is erased before any JavaScript is emitted and
# the build does not need it. Dropping it here keeps the image buildable from
# this project alone — the two projects stay independently deployable.
RUN bun --eval "const p = require('./package.json'); delete p.devDependencies['trptools-backend']; require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2))" \
	&& bun install

FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY . .

# Baked into the client bundle at build time; also read at runtime from the
# environment, so this is only the fallback.
ARG PUBLIC_API_URL=http://localhost:3001
ENV PUBLIC_API_URL=$PUBLIC_API_URL

RUN bun run build

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# adapter-node emits a self-contained server; only production dependencies of
# the built output are needed alongside it.
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

# TERMS.md and PRIVACY.md are read from here at startup, not baked into the
# image — mount a volume over it to publish policy text, or leave it empty to
# ship with no terms/privacy pages. See POLICIES_DIR to point elsewhere.
RUN mkdir -p /app/policies && chown bun:bun /app/policies
VOLUME /app/policies

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD bun --eval "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "run", "build/index.js"]
