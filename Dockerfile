# Use Node 20 (LTS) - More stable for audio libraries
FROM node:20

# Install system build tools for native modules (prevents crashes)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files (we assume you DELETED package-lock.json already)
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Expose port
EXPOSE 3000

# Start the bot
CMD ["node", "index.js"]