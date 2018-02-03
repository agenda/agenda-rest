import querystring from 'querystring';
import {keyValues} from 'pythonic';
import rp from 'request-promise';
import settings from '../settings';

const checkJobFormat = job => {
  if (!job.name || !job.url) {
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

const checkFunctionOnJobCount = (assertFunction, errorFunction) => async (job, jobs) => countJobByName(job.name, jobs)
  .then(count => {
    if (!assertFunction(count)) {
      throw new Error(errorFunction(job.name));
    }
  });

const assertJobAlreadyExists = checkFunctionOnJobCount(count => count > 0, name => `Did not find a job named "${name}"`);
const assertJobNotExists = checkFunctionOnJobCount(count => count <= 0, name => `A job named "${name}" already exist`);

const defineJob = ({name, url, method, callback} = {}, jobs, agenda) => {
  agenda.define(name, (job, done) => {
    const data = job.attrs.data;
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

  jobs.count({name}, (error, count) => {
    if (error) {
      return console.dir(error);
    }
    if (count < 1) {
      jobs.insert({name, url, method, callback});
    } else {
      jobs.update({name}, {$set: {url, method, callback}});
    }
  });

  return 'job defined';
};

export {
  checkJobFormat,
  assertJobAlreadyExists,
  assertJobNotExists,
  defineJob
};
