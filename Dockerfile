# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.4.2

# The emitted server/client code contains no native addons. Compile once on
# the builder's native CPU, even when publishing both AMD64 and ARM64 images.
FROM --platform=$BUILDPLATFORM oven/bun:${BUN_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY scripts/docker-dependencies.ts ./scripts/docker-dependencies.ts
# Filter the sibling type dependency from both manifests without re-resolving
# registry packages. Vite generates messages once source is available.
RUN bun scripts/docker-dependencies.ts
RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY src ./src
COPY static ./static
COPY messages ./messages
COPY project.inlang ./project.inlang
COPY vite.config.ts paraglide.config.js tsconfig.json .npmrc ./

# Origins come from dynamic environment variables at runtime, so deployments
# reuse one artifact. Documentation and test changes do not invalidate this step.
RUN bun run build && mkdir -p /app/policies

FROM oven/bun:${BUN_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# All application libraries are bundled by adapter-node. The runtime needs
# neither the compilers nor the original icon/translation catalogues.
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json

# The footer's links are read from here at startup, not baked into the image —
# mount a volume over it to publish documents, or leave it empty to ship with a
# footer that has no links. See POLICIES_DIR to point elsewhere.
COPY --from=build --chown=bun:bun /app/policies ./policies
VOLUME /app/policies

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD bun --eval "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "run", "build/index.js"]
