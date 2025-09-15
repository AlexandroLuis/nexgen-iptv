# Stage 1: Build the Vite app
FROM node:18 AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install
RUN npm install video.js@^8.6.1 @videojs/http-streaming@^3.8.0
RUN npm install tailwindcss @tailwindcss/vite

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy production build from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Remove default nginx config and add your own if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
