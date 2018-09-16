FROM node:latest

RUN npm install -g agenda-rest

#expose
EXPOSE 4040

CMD ['agenda-rest']
