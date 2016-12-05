/**
 * Created by keyvan on 11/28/16.
 */

import Agenda from 'agenda';
import Koa from 'koa';
import logger from 'koa-logger';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import {keyValues} from 'pythonic';
import querystring from 'querystring';
import rp from 'request-promise';
import settings from './settings';

const app = new Koa();
const router = new Router();
app
    .use(logger())
    .use(bodyParser({
        onerror(error, ctx) {
            ctx.throw(`cannot parse request body, ${JSON.stringify(error)}`, 400);
        }
    }))
    .use(router.routes());

const agenda = new Agenda({db: {address: settings.agendaMongoUrl}});
const mongoDb = () => agenda._mdb;
let jobs;

const defineJob = ({name, url, method, callbackUrl, callbackMethod} = {}) => {
    agenda.define(name, (job, done) => {
        const data = job.attrs.data;
        let uri = url;
        for (const [key, value] of keyValues(data.params))
            uri = uri.replace(`:${key}`, value);
        const query = querystring.stringify(data.query);
        if (query !== '')
            uri += `?${query}`;
        Promise.race([
            new Promise((resolve, reject) => setTimeout(() =>
                reject(new Error('TimeOutError')), settings.timeout)),
            rp({
                method: method || 'POST',
                uri: uri,
                body: data.body,
                json: true
            })
        ])
            .catch(error => {
                job.fail(error.message);
                return {error: error.message};
            })
            .then(result => {
                if (callbackUrl)
                    return rp({
                        method: callbackMethod || 'POST',
                        uri: callbackUrl,
                        body: {data: data.body, response: result},
                        json: true
                    });
            })
            .catch(error => job.fail(`failure in callback: ${error.message}`))
            .then(done);
    });

    jobs.count({name}, (error, count) => {
        if (error)
            return console.dir(error);
        if (count < 1)
            jobs.insert({name, url, method, callbackUrl, callbackMethod});
        else
            jobs.update({name}, {$set: {url, method, callbackUrl, callbackMethod}});
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
    defineJob(ctx.request.body);
    ctx.body = 'job defined';
    await next();
});

router.post('/api/schedule', async (ctx, next) => {
    agenda.schedule(ctx.request.body.human_interval, ctx.request.body.name, ctx.request.body.data);
    ctx.body = 'job scheduled';
    await next();
});

router.post('/api/every', async (ctx, next) => {
    agenda.every(ctx.request.body.human_interval, ctx.request.body.name, ctx.request.body.data);
    ctx.body = 'job scheduled for repetition';
    await next();
});

router.post('/api/cancel', async (ctx, next) => {
    ctx.body = await new Promise((resolve, reject) => {
        agenda.cancel(ctx.request.body, (error, numRemoved) => {
            if (error) {
                ctx.status = 400;
                reject(error.message);
            } else
                resolve(`${numRemoved} jobs removed`);
        });
    });
    await next();
});

const graceful = () => {
    console.log('Shutting down gracefully...');
    agenda.stop(() => {
        process.exit(0);
    });
};

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);

app.listen(4040, () => {
    console.log('App listening on port 4040.');
});
