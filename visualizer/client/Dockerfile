FROM node:latest

LABEL developer="Matteo Bogo" \
    version="0.1.0" \
    description="Visualizard Client"

RUN mkdir /visualizard-client
COPY . /visualizard-client
WORKDIR /visualizard-client

RUN npm install webpack-dev-server -g && npm install

EXPOSE 45671
CMD ["npm", "run", "dev-docker"]
