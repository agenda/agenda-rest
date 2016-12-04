/**
 * Created by keyvan on 11/28/16.
 */

import Agenda from 'agenda';
import Koa from 'koa';
import logger from 'koa-logger';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import {keyValues} from 'pythonic';
import qs from 'querystring';
import rp from 'request-promise';
import settings from './settings';

const app = new Koa();
const router = new Router();
app
    .use(router.routes())
    .use(logger())
    .use(bodyParser({
        onerror(error, ctx) {
            ctx.throw(`cannot parse request body, ${JSON.stringify(error)}`, 400);
        }
    }));

const agenda = new Agenda({db: {address: settings.agendaMongoUrl}});
const mongoDb = () => agenda._mdb;
let jobs;

const defineJob = ({name, url, callback} = {}) => {
    agenda.define(name, (job, done) => {
        const data = job.attrs.data;
        let uri = url;
        for (const [key, value] of keyValues(data))
            uri = uri.replace(`:${key}`, value);
        Promise.race([
            new Promise((resolve, reject) => setTimeout(() =>
                reject('TimeOutError'), settings.timeout)),
            rp({
                method: data.method || 'POST',
                uri: uri,
                body: data,
                json: true
            })
        ])
            .then(result => {
                console.log(result)
                done();
            })
            .catch(error => {
                console.log(error)
                done();
            });
    });

    jobs.count({name}, (error, count) => {
        if (error)
            return console.dir(error);
        if (count < 1)
            jobs.insert({name, url, callback});
        else
            jobs.update({name}, {$set: {url, callback}});
    });
};

agenda.on('ready', () => {
    jobs = mongoDb().collection('job-definitions');
    jobs.find().each((error, job) => {
        if (!job)
            return;
        defineJob(job);
    });

    agenda.start();
});


router.post('/api/new', async (ctx, next) => {
    console.log(`ssss ${mongoDb()}`);
    // const params = ctx.request.body;
    const params = {};
    params.name = 'sege';
    params.url = 'http://localhost:3000/api/expert/:id';
    defineJob(params);
    ctx.body = 'job defined';
    await next();
});

router.post('/api/schedule', async (ctx, next) => {
    // const params = ctx.request.body;
    const params = {};
    params.human_interval = 'in 5 seconds';
    params.name = 'sege';
    agenda.schedule(params.human_interval, params.name, {id: 16841, method:'GET'});
    ctx.body = 'job scheduled';
    await next();
});


app.listen(4040, () => {
    console.log('App listening on port 4040.');
});
