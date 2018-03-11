let dbname = process.env.DB_NAME || 'agenda';
let dbhost = process.env.DB_HOST || 'localhost';
let collection = 'agendaJobs';
let definitions = 'jobDefinitions';
let timeout = 5000;

const settings = {
  get agendaMongoUrl() {
    return `mongodb://${dbhost}/${dbname}`;
  },
  get dbname() {
    return dbname;
  },
  set dbname(value) {
    dbname = value;
  },
  get dbhost() {
    return dbhost;
  },
  set dbhost(value) {
    dbhost = value;
  },
  get collection() {
    return collection;
  },
  set collection(value) {
    collection = value;
  },
  get definitions() {
    return definitions;
  },
  set definitions(value) {
    definitions = value;
  },
  get timeout() {
    return timeout;
  },
  set timeout(value) {
    timeout = value;
  }
};

module.exports = settings;
