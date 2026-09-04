# syntax=docker/dockerfile:1

# Bun is pinned rather than tracking oven/bun:1-alpine. 1.4.1's bundler renames
# a CommonJS export onto a name already bound in the same scope, emitting
# `var Check2 = Check2`, which fails to parse — elysia and @sinclair/typebox
# both bind `Check` and trip it. Fixed upstream but unreleased as of 1.4.1.
# TODO: return to oven/bun:1-alpine once 1.4.2 is out.
# https://github.com/oven-sh/bun/issues/41351

FROM oven/bun:1.4.0-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./

# `trptools-backend` is a type-only dependency resolved from a sibling
# directory, which does not exist inside this build context. Every reference to
# it is an `import type`, so it is erased before any JavaScript is emitted and
# the build does not need it. Dropping it here keeps the image buildable from
# this project alone — the two projects stay independently deployable.
RUN bun --eval "const p = require('./package.json'); delete p.devDependencies['trptools-backend']; require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2))" \
	&& bun install

FROM oven/bun:1.4.0-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY . .

# Baked into the client bundle at build time; also read at runtime from the
# environment, so this is only the fallback.
ARG PUBLIC_API_URL=http://localhost:3001
ENV PUBLIC_API_URL=$PUBLIC_API_URL

# The site's strings come from ./messages, which is committed rather than
# fetched: `vite build` compiles them into typed functions and tree-shakes the
# locales nobody selected, so what a language costs the browser is only what a
# reader actually loads. Nothing here reaches out to the Locales repository —
# `scripts/pull-locales.sh` does that on a developer's machine, and the result
# is reviewed and committed like any other change.
#
# This is the one thing that differs from the policies directory below: a
# policy is content an operator swaps at runtime, whereas a missing string is a
# blank button, so strings are pinned to the build that expects them.
RUN bun run build

FROM oven/bun:1.4.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# adapter-node emits a self-contained server; only production dependencies of
# the built output are needed alongside it.
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

# The footer's links are read from here at startup, not baked into the image —
# mount a volume over it to publish documents, or leave it empty to ship with a
# footer that has no links. See POLICIES_DIR to point elsewhere.
RUN mkdir -p /app/policies && chown bun:bun /app/policies
VOLUME /app/policies

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD bun --eval "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "run", "build/index.js"]
