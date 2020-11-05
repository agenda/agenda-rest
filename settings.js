let dbname = process.env.DB_NAME || "agenda";
let dbhost = process.env.DB_HOST || "localhost";
let dburi = process.env.DB_URI || null;
let appId = process.env.API_KEY;
let collection = process.env.COLLECTION || 'agendaJobs';
let definitions = process.env.COLLECTION || 'jobDefinitions';
let timeout = 5000;

const settings = {
  get agendaMongoUrl() {
    return dburi ? dburi : `mongodb://${dbhost}/${dbname}`;
  },
  get dbname() {
    return dbname;
  },
  set dbname(value) {
    dbname = value;
  },
  get dburi() {
    return dburi;
  },
  set dburi(value) {
    dburi = value;
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
  },
  get appId() {
    return appId;
  },
  set appId(value) {
    appId = value;
  },
};

module.exports = settings;
