FROM node:latest

RUN npm install -g agendash

#expose
EXPOSE 3022
CMD agendash --db=mongodb://$DB_HOST/$DB_NAME --collection=agendaJobs --port=3022
