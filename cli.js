#!/usr/bin/env node

const program = require('commander');

program
    .option('-d, --dbname <dbname>', '[optional] Name of the Mongo database')
    .option('-h, --dbhost <dbhost>', "[optional] Mongo instance's IP")
    .option('-p, --port <port>', '[optional] Server port, default 4040', (n, d) => +n || d, 4040)
    .option('-t, --timeout <timeout>', '[optional] Timeout for request duration',
        (n, d) => +n || d, 5000)
    .parse(process.argv);

const settings = require('./settings');

if (program.dbname)
    settings.dbname = program.dbname;

if (program.dbhost)
    settings.dbhost = program.dbhost;
else if (!settings.dbhost) {
    console.error("neither '--dbhost' nor '$DB_HOST env' were present");
    process.exit(1);
}

if (program.timeout)
    settings.timeout = program.timeout;

require('./index').listen(program.port, () => {
    console.log(`App listening on port ${program.port}.`);
});
