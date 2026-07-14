FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package*.json ./

RUN npm set strict-ssl false
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN npm install

# Copia o projeto (.env incluído — Vite lê VITE_* em npm run build)
COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Serve estático com Node (evita pull de nginx quando o registry TLS falha)
FROM node:20-alpine

WORKDIR /app

RUN npm set strict-ssl false
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
