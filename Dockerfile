FROM node:argon

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

ENV DB_NAME {$}

# Bundle app source
COPY . /usr/src/app
#expose
EXPOSE 4200
CMD [ "npm", "start" ]
