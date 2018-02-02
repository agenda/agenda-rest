import querystring from 'querystring';
import {keyValues} from 'pythonic';
import rp from 'request-promise';
import settings from '../settings';

const defineJob = (agenda, jobs, {name, url, method, callback} = {}) => {
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

export default defineJob;
