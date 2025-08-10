# Use official Node.js base image for ARM64
FROM node:lts-alpine

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install dependencies
RUN npm install

# Build the app (static files will be in /app/dist)
RUN npm run build

# Install lightweight static server
RUN npm install -g serve

# Expose port
EXPOSE 8000

# Serve the built app
CMD ["serve", "-s", "dist", "-l", "0.0.0.0:8000"]
