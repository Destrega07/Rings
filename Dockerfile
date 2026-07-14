# Stage 1: Build H5
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build:h5

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
