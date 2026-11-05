# Use the full Node image so workerd has a working CA trust store for outbound HTTPS.
FROM node:22

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3001

# The app's boot-time build reads this to show the notice pointing to the
# standalone image (deploy/standalone/), which replaces this one.
# These three values are the build fingerprint on seo.toba-tech.ai. The
# entrypoint skips vite when dist/.openseo-build-env matches the live env.
ENV VITE_OPENSEO_LEGACY_DOCKER=true
ENV AUTH_MODE=password
ENV VITE_SHOW_DEVTOOLS=false

RUN pnpm run build \
  && FP="$(env | grep -E '^(VITE_|AUTH_MODE|BYPASS_EMAIL_VERIFICATION|POSTHOG_PUBLIC_KEY|POSTHOG_HOST|TURNSTILE_SITE_KEY|POSTHOG_SOURCEMAPS)' | sort | sha256sum | cut -d' ' -f1)" \
  && test -n "$FP" \
  && printf '%s' "$FP" > dist/.openseo-build-env

# Readiness probe against the unauthenticated setup/health endpoint. The long
# start period covers migrations plus the boot-time vite build (skipped when
# the previous start's build is still valid; see deploy/docker/docker-entrypoint.sh).
HEALTHCHECK --interval=30s --timeout=10s --start-period=300s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(function(r){process.exit(r.ok?0:1)}).catch(function(){process.exit(1)})"

# Startup (preflight, migrations, conditional build, serve) lives in
# deploy/docker/docker-entrypoint.sh. The repo .npmrc raises the V8 heap ceiling
# (node-options) so the ~7400-module SSR build doesn't OOM under Node's ~2GB
# default.
CMD ["sh", "deploy/docker/docker-entrypoint.sh"]
