# Use Node 20 (LTS) - More stable for audio libraries
FROM node:20

# Install system build tools for native modules (prevents crashes)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the code
COPY . .

# Start the bot
CMD ["node", "index.js"]