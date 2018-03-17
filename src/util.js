import Koa from 'koa';
import logger from 'koa-logger';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

const bootstrapKoaApp = () => {
  const app = new Koa();
  const router = new Router();
  app.use(logger());
  app.use(async (ctx, next) => next()
    .catch(err => {
      console.dir(err);
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
  return {app, router};
};

const isValidDate = date => Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime());

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

export {bootstrapKoaApp, isValidDate, AsyncCounter};
