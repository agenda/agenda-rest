import {promisify} from 'util';
import Agenda from 'agenda';
import settings from '../settings';
import {bootstrapKoaApp} from './util';
import {defineJob, jobOperations, jobAssertions, promiseJobOperation} from './job';

const {app, router} = bootstrapKoaApp();

const agenda = new Agenda({
  db: {
    address: settings.agendaMongoUrl,
    collection: settings.collection
  }
});

const jobsReady = agenda._ready
  .then(async () => {
    const jobs = agenda._mdb.collection(settings.definitions);
    jobs.toArray = () => {
      const jobsCursor = jobs.find();
      return promisify(jobsCursor.toArray).bind(jobsCursor)();
    };
    await jobs.toArray()
      .then(jobsArray => Promise.all(jobsArray.map(job => defineJob(job, jobs, agenda))));

    await agenda.start();
    return jobs;
  });

const getJobMiddleware = (jobAssertion, jobOperation, errorCode = 400) => async (ctx, next) => {
  const job = ctx.request.body || {};
  if (ctx.params.jobName) {
    job.name = ctx.params.jobName;
  }
  const jobs = await jobsReady;
  ctx.body = await promiseJobOperation(job, jobs, agenda, jobAssertion, jobOperation)
    .catch(error => ctx.throw(errorCode, error));
  await next();
};

const listJobs = async (ctx, next) => {
  ctx.body = await jobsReady.then(jobs => jobs.toArray());
  await next();
};
const createJob = getJobMiddleware(jobAssertions.notExists, jobOperations.create);
const removeJob = getJobMiddleware(jobAssertions.alreadyExists, jobOperations.delete);
const updateJob = getJobMiddleware(jobAssertions.alreadyExists, jobOperations.update);
const runJobOnce = getJobMiddleware(jobAssertions.alreadyExists, jobOperations.once);
const runJobEvery = getJobMiddleware(jobAssertions.alreadyExists, jobOperations.every);
const runJobNow = getJobMiddleware(jobAssertions.alreadyExists, jobOperations.now);
const cancelJobs = getJobMiddleware(jobAssertions.doNotAssert, jobOperations.cancel);

// v1
router.get('/api/v1/job', listJobs);
router.post('/api/v1/job', createJob);
router.del('/api/v1/job/:jobName', removeJob);
router.put('/api/v1/job/:jobName', updateJob);
router.post('/api/v1/job/once', runJobOnce);
router.post('/api/v1/job/every', runJobEvery);
router.post('/api/v1/job/now', runJobNow);
router.post('/api/v1/job/cancel', cancelJobs);

// latest
router.get('/api/job', listJobs);
router.post('/api/job', createJob);
router.del('/api/job/:jobName', removeJob);
router.put('/api/job/:jobName', updateJob);
router.post('/api/job/once', runJobOnce);
router.post('/api/job/every', runJobEvery);
router.post('/api/job/now', runJobNow);
router.post('/api/job/cancel', cancelJobs);

export {app, router, agenda, jobsReady};
export default app;
