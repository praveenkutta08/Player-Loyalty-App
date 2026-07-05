# Admin console image — build the pnpm workspace, serve the static SPA with nginx.
# Build context = repo ROOT (the admin depends on @repo/* workspace packages):
#   docker build -f apps/admin/Dockerfile --build-arg VITE_API_BASE_URL=https://<backend>/api/v1 .
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo

# Whole workspace (admin needs shared-types + api-client + config to build).
COPY . .
RUN pnpm install --frozen-lockfile

# Baked into the bundle at build time — the deployed backend's /api/v1 base URL.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm build

FROM nginx:alpine
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/admin/dist /usr/share/nginx/html
EXPOSE 8080
