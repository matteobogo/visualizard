ARG VERSION=9.11.2
FROM node:$VERSION

LABEL developer="Matteo Bogo" \
    version="0.1.0" \
    description="Visualizard API"

#
ENV VISUALIZARD_HOME=/visualizard

# init

WORKDIR $VISUALIZARD_HOME

# copy package.json and package-lock.json with wildcard
COPY package*.json ./

# install npm dependencies
RUN npm install

# copy app source
COPY . .

CMD ["npm", "run", "dev"]