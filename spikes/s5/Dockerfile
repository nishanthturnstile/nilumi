FROM node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global pnpm@12.9.1 && pnpm install --prod --frozen-lockfile
COPY src ./src
USER node
EXPOSE 3000
CMD ["node", "src/server.mjs"]
