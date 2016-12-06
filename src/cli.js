/**
 * Created by keyvan on 12/6/16.
 */
import program from 'commander';

program
    .option('-d, --dbname <dbname>', '[optional] Name of the Mongo database')
    .option('-h, --dbhost <dbhost>', "[optional] Mongo instance's IP")
    .option('-p, --port <port>', '[optional] Server port, default 4040', (n, d) => +n || d, 4040)
    .option('-t, --timeout <timeout>', '[optional] Timeout for request duration',
        (n, d) => +n || d, 5000)
    .parse(process.argv);

import settings from './settings';

if (program.dbname)
    settings.dbname = program.dbname;
else if (!settings.dbname) {
    console.error("neither '--dbname' nor '$DB_NAME env' were present");
    process.exit(1);
}

if (program.dbhost)
    settings.dbhost = program.dbhost;
else if (!settings.dbhost) {
    console.error("neither '--dbhost' nor '$DB_HOST env' were present");
    process.exit(1);
}

settings.timeout = program.timeout;

import app from './index';

app.listen(program.port, () => {
    console.log(`App listening on port ${program.port}.`);
});
