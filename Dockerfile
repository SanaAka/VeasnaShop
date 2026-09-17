FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Install production dependencies in a separate builder
FROM base AS build
ENV NODE_ENV=production
RUN npm install --omit=dev

# Final stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY . .

EXPOSE 5000
CMD ["node", "server.js"]