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

# Define environment variables
ENV TOKEN=$DISCORD_TOKEN
ENV CLIENT_ID=$DISCORD_CLIENT

# Command to run the application
CMD ["node", "index.js"]
