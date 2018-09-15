import Koa from 'koa';
import logger from 'koa-logger';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

const bootstrapKoaApp = () => {
  const app = new Koa();
  const router = new Router();
  app.use(logger());
  app.use((ctx, next) => next()
    .catch(error => {
      console.dir(error);
      ctx.body = String(error);
      ctx.status = error.status || 500;
    })
  );
  app.use(bodyParser({
    onerror(error, ctx) {
      ctx.throw(400, `cannot parse request body, ${JSON.stringify(error)}`);
    }
  }));
  app.use(router.routes());
  return {app, router};
};

const isValidDate = date => Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime());

const repeatPerKey = (keys = {}) => count => (key, fn) => () => {
  if (!(key in keys)) {
    keys[key] = 0;
  }
  if (keys[key] < count) {
    fn();
    keys[key]++;
  }
};

const oncePerKey = repeatPerKey()(1);

class AsyncCounter {
  constructor(countTimes) {
    let currentCount = 0;
    this.countTimes = countTimes;
    this.ready = new Promise(resolveReady => {
      this.finished = new Promise(resolveFinished => {
        const count = () => {
          currentCount++;
          if (currentCount === countTimes) {
            resolveFinished();
          }
          return currentCount;
        };
        this.count = () => this.ready.then(() => count());
        resolveReady();
      });
    });
  }
}

export {bootstrapKoaApp, isValidDate, oncePerKey, AsyncCounter};
