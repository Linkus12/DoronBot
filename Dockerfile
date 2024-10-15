# Use the official Node.js image as the base image
FROM node:22

# Set the working directory
WORKDIR ./

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# set ENV variables
ARG DISCORD_TOKEN
ARG DISCORD_CLIENT
ENV TOKEN="$DISCORD_TOKEN"
ENV CLIENT_ID="$DISCORD_CLIENT"

echo "TOKEN: $TOKEN"
echo "CLIENT_ID: $CLIENT_ID"

# Command to run the application
CMD ["node", "index.js"]
