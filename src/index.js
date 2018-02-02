import Agenda from 'agenda';
import Koa from 'koa';
import logger from 'koa-logger';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import settings from './settings';
import {defineJob, newCheck} from './utils';

const app = new Koa();
const router = new Router();
app.use(logger());
app.use(bodyParser({
  onerror(error, ctx) {
    ctx.throw(`cannot parse request body, ${JSON.stringify(error)}`, 400);
  }
}));
app.use(router.routes());

const agenda = new Agenda({
  db: {
    address: settings.agendaMongoUrl,
    collection: settings.collection
  }
});

const agendaReady = new Promise(resolve => agenda.on('ready', () => {
  const jobs = agenda._mdb.collection(settings.definitions);
  jobs.find().each((error, job) => {
    if (!job) {
      return;
    }
    defineJob(agenda, jobs, job);
  });

  agenda.start();
  resolve(jobs);
}));

router.post('/api/new', async (ctx, next) => {
  ctx.body = await Promise.resolve(ctx.request.body)
    .then(newCheck)
    .then(job => Promise.all([agendaReady, job]))
    .then(([jobs, job]) => defineJob(agenda, jobs, job))
    .catch(err => {
      ctx.status = 400;
      return err.message;
    });
  await next();
});

router.get('/api/jobs', async (ctx, next) => {
  ctx.body = await agendaReady
    .then(jobs => new Promise((resolve, reject) =>
      jobs.find().toArray((err, array) => {
        if (err) {
          reject(err);
        } else {
          resolve(array);
        }
      })
    ));
  await next();
});

const scheduleCheckAndFillMissing = body => {
  if (!body.name || !body.human_interval) {
    throw new Error('expected request body to match {name, human_interval}');
  }
  if (!body.data) {
    body.data = {};
  }
  if (!body.data.body) {
    body.data.body = {};
  }
  if (!body.data.params) {
    body.data.params = {};
  }
  if (!body.data.query) {
    body.data.query = {};
  }
  return body;
};

const schedulePromise = (ctx, scheduleOrEvery) => Promise.resolve(ctx.request.body)
    .then(scheduleCheckAndFillMissing)
    .then(body => {
      // eslint-disable-next-line no-useless-call
      agenda[scheduleOrEvery].apply(agenda, [body.human_interval, body.name, body.data]);
      return `job scheduled${scheduleOrEvery === 'every' ? ' for repetition' : ''}`;
    })
    .catch(err => {
      ctx.status = 400;
      return err.message;
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
  agenda.cancel(ctx.request.body, (error, numRemoved) => {
    if (error) {
      ctx.status = 400;
      ctx.body = error.message;
      return next();
    }
    console.log(`${numRemoved} jobs removed`);
    ctx.body = numRemoved;
  });
});

const graceful = () => {
  console.log('\nShutting down gracefully...');
  agenda.stop(() => {
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  });
};

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);

export {app, router, agendaReady};
export default app;
