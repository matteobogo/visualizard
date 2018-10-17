# multi-stage build

# stage 1 - build artifacts
FROM node:latest as build-stage

LABEL developer="Matteo Bogo" \
    version="0.1.0" \
    description="Visualizard Client"

RUN mkdir /visualizard-client
WORKDIR /visualizard-client

COPY *.json ./
RUN npm install

COPY . ./
RUN npm run build

# stage 2 - run the production environment
FROM nginx:alpine
COPY --from=build-stage /visualizard-client/dist /var/www
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 45671
CMD ["nginx", "-g", "daemon off;"]
