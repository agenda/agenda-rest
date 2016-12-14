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

const agenda = new Agenda({
    db: {
        address: settings.agendaMongoUrl,
        collection: settings.collection
    }
});
const mongoDb = () => agenda._mdb;
let jobs;

const defineJob = ({name, url, method, callback} = {}) => {
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
                headers: data.headers || {},
                json: true
            })
        ])
            .catch(error => {
                job.fail(error.message);
                return {error: error.message};
            })
            .then(result => {
                if (callback)
                    return rp({
                        method: callback.method || 'POST',
                        uri: callback.url,
                        headers: callback.headers || {},
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
            jobs.insert({name, url, method, callback});
        else
            jobs.update({name}, {$set: {url, method, callback}});
    });

    return 'job defined';
};

agenda.on('ready', () => {
    jobs = mongoDb().collection(settings.definitions);
    jobs.find().each((error, job) => {
        if (!job)
            return;
        defineJob(job);
    });

    agenda.start();
});

const newCheck = body => {
    if (!body.name || !body.url)
        throw new Error('expected request body to match {name, url}');
    return body;
};

router.post('/api/new', async (ctx, next) => {
    ctx.body = await Promise.resolve(ctx.request.body)
        .then(newCheck)
        .then(defineJob)
        .catch(error => {
            ctx.status = 400;
            return error.message;
        });
    await next();
});

const scheduleCheckAndFillMissing = body => {
    if (!body.name || !body.human_interval)
        throw new Error('expected request body to match {name, human_interval}');
    if (!body.data)
        body.data = {};
    if (!body.data.body)
        body.data.body = {};
    if (!body.data.params)
        body.data.params = {};
    if (!body.data.query)
        body.data.query = {};
    return body;
};

const schedulePromise = (ctx, scheduleOrEvery) => Promise.resolve(ctx.request.body)
    .then(scheduleCheckAndFillMissing)
    .then(body => {
        agenda[scheduleOrEvery].apply(agenda, [body.human_interval, body.name, body.data]);
        return `job scheduled${scheduleOrEvery === 'every' ? ' for repetition' : ''}`;
    })
    .catch(error => {
        ctx.status = 400;
        return error.message;
    });

router.post('/api/schedule', async (ctx, next) => {
    ctx.body = await schedulePromise(ctx, 'schedule');
    await next();
});

router.post('/api/every', async (ctx, next) => {
    ctx.body = await schedulePromise(ctx, 'every');
    await next();
});

router.post('/api/cancel', async (ctx, next) => {
    ctx.body = await Promise.resolve(ctx.request.body)
        .then(body => new Promise((resolve, reject) =>
            agenda.cancel(ctx.request.body,
                (error, numRemoved) => { if (error) reject(error); else resolve(numRemoved); })
        ))
        .then(numRemoved => `${numRemoved} jobs removed`)
        .catch(error => {
            ctx.status = 400;
            return error.message;
        });
    await next();
});

const graceful = () => {
    console.log('\nShutting down gracefully...');
    agenda.stop(() => {
        process.exit(0);
    });
};

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);

export {app, router};
export default app;
