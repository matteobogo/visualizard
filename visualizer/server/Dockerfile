ARG VERSION=latest
FROM ubuntu:$VERSION

LABEL developer="Matteo Bogo" \
    version="0.1.0" \
    description="Visualizard API"

# init
RUN apt-get -qq update && apt-get -qq install -y > /dev/null
RUN apt-get -qq install curl -y > /dev/null
RUN apt-get -qq install gnupg2 -y > /dev/null
RUN apt-get install -qq -y build-essential > /dev/null

# node
RUN curl -sL https://deb.nodesource.com/setup_9.x | bash -
RUN apt-get install -y nodejs > /dev/null

# install Cairo (used by node-canvas)
RUN apt-get install libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++ -qq -y > /dev/null

WORKDIR /visualizard-api

# copy package.json and package-lock.json with wildcard
COPY package*.json ./

# install npm dependencies
RUN npm install

# copy app source
COPY . .

EXPOSE 45670
CMD ["npm", "start"]
