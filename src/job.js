import querystring from 'querystring';
import {promisify} from 'util';
import {keyValues} from 'pythonic';
import rp from 'request-promise';
import settings from './settings';

const getCheckJobFormatFunction = checkUrl => job => {
  if (!job.name || (checkUrl && !job.url)) {
    throw new Error('expected request body to match {name, url}');
  }
};

const countJobByName = async (name, jobs) => new Promise((resolve, reject) => jobs.count({name}, (err, count) => {
  if (err) {
    reject(err);
  } else {
    resolve(count);
  }
}));

const getAssertFunction = (assertOnCount, errorOnName) => async (job, jobs) => countJobByName(job.name, jobs)
  .then(count => {
    if (!assertOnCount(count)) {
      throw new Error(errorOnName(job.name));
    }
  });

const jobAssertions = {
  alreadyExists: getAssertFunction(count => count > 0, name => `Did not find a job named "${name}"`),
  notExists: getAssertFunction(count => count <= 0, name => `A job named "${name}" already exist`)
};

const defineJob = async ({name, url, method, callback} = {}, jobs, agenda) => {
  agenda.define(name, (job, done) => {
    const {attrs: {data}} = job;
    let uri = url;
    for (const [key, value] of keyValues(data.params)) {
      uri = uri.replace(`:${key}`, value);
    }
    const query = querystring.stringify(data.query);
    if (query !== '') {
      uri += `?${query}`;
    }
    Promise.race([
      new Promise((resolve, reject) => setTimeout(() => reject(new Error('TimeOutError')), settings.timeout)),
      rp({
        method: method || 'POST',
        uri,
        body: data.body,
        headers: data.headers || {},
        json: true
      })
    ])
      .catch(err => {
        job.fail(err.message);
        return {error: err.message};
      })
      .then(result => {
        if (callback) {
          return rp({
            method: callback.method || 'POST',
            uri: callback.url,
            headers: callback.headers || {},
            body: {data: data.body, response: result},
            json: true
          });
        }
      })
      .catch(err => job.fail(`failure in callback: ${err.message}`))
      .then(done);
  });

  const count = promisify(jobs.count).bind(jobs);
  const insert = promisify(jobs.insert).bind(jobs);
  const update = promisify(jobs.update).bind(jobs);

  await count({name})
    .then(count => count < 1 ? insert({name, url, method, callback}) : update({name}, {$set: {url, method, callback}}));

  return 'job defined';
};

const deleteJob = async (job, jobs, agenda) => {
  const cancel = promisify(agenda.cancel).bind(agenda);
  const remove = promisify(jobs.remove).bind(jobs);
  const numRemoved = await cancel(job);
  const obj = await remove(job);
  return `removed ${numRemoved} job definitions and ${obj.result.n} job instances.`;
};

const getJobOperation = (checkFunction, jobFunction) => ({check: checkFunction, fn: jobFunction});

const jobOperations = {
  define: getJobOperation(getCheckJobFormatFunction(true), defineJob),
  delete: getJobOperation(getCheckJobFormatFunction(false), deleteJob)
};

const promiseJobOperation = async (job, jobs, agenda, jobAssertion, jobOperation) => {
  await jobOperation.check(job);
  await jobAssertion(job, jobs);
  return jobOperation.fn(job, jobs, agenda);
};

export {
  promiseJobOperation,
  jobOperations,
  jobAssertions,
  defineJob,
  deleteJob
};
