FROM node:20-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Install dependencies (no lockfile in package subdirectory)
RUN pnpm install

# Copy source
COPY . .

# Build TypeScript
RUN pnpm build

# Expose port
EXPOSE 3001

# Run the server
CMD ["node", "dist/index.js"]
