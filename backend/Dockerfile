FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm set strict-ssl false
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN npm install

# prisma.config.ts exige DATABASE_URL ao carregar; .env não entra no build (.dockerignore)
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

COPY . .

RUN npx prisma generate && npm run build

FROM node:22-alpine

WORKDIR /usr/src/app

RUN npm set strict-ssl false
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/prisma.config.ts ./prisma.config.ts
# Seed usa tsx e importa o client gerado em src/generated.
COPY --from=build /usr/src/app/src ./src

EXPOSE 3000

# prisma generate atualiza src/generated; seed só corre se a base estiver vazia.
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npx prisma db seed && npm run start"]
