import Agenda from 'agenda';
import Koa from 'koa';
import logger from 'koa-logger';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import settings from './settings';
import {jobOperations, jobAssertions, promiseJobOperation} from './job';

const app = new Koa();
const router = new Router();
app.use(logger());
app.use(async (ctx, next) => await next()
  .catch(err => {
    console.log(err);
    ctx.body = String(err);
    ctx.status = err.status || 500;
  })
);
app.use(bodyParser({
  onerror(error, ctx) {
    ctx.throw(400, `cannot parse request body, ${JSON.stringify(error)}`);
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
    jobOperations.define(job, jobs, agenda);
  });

  agenda.start();
  resolve(jobs);
}));

const getJobMiddleware = (jobAssertion, jobOperation) => async (ctx, next) => {
  const job = ctx.request.body;
  job.name = ctx.params.jobName || job.name
  const jobs = await agendaReady;
  ctx.body = await promiseJobOperation(job, jobs, agenda, jobAssertion, jobOperation)
    .catch(err => ctx.throw(400, err))
  await next();
};

router.post('/api/jobs', getJobMiddleware(jobAssertions.notExists, jobOperations.define));

router.put('/api/jobs/:jobName', getJobMiddleware(jobAssertions.allreadyExists, jobOperations.define));

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
