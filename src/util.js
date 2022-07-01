import Koa from "koa";
import logger from "koa-logger";
import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import { items } from "pythonic";
import querystring from "querystring";

const bootstrapKoaApp = () => {
  const app = new Koa();
  const router = new Router();
  app.use(logger());
  app.use((ctx, next) =>
    next().catch((error) => {
      console.dir(error);
      ctx.body = String(error);
      ctx.status = error.status || 500;
    })
  );
  app.use(
    bodyParser({
      onerror(error, ctx) {
        ctx.throw(400, `cannot parse request body, ${JSON.stringify(error)}`);
      },
    })
  );
  app.use(router.routes());
  return { app, router };
};

const isValidDate = (date) =>
  Object.prototype.toString.call(date) === "[object Date]" &&
  !isNaN(date.getTime());

const repeatPerKey =
  (keys = {}) =>
  (count) =>
  (key, fn) =>
  () => {
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
    this.ready = new Promise((resolveReady) => {
      this.finished = new Promise((resolveFinished) => {
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

// http://example.com:8888/foo/:param1/:param2
// =>
// http://example.com:8888/foo/value1/value2
const buildUrlWithParams = ({ url, params }) => {
  if (url.indexOf("/:") > 0 && params) {
    const protoDomain = url.slice(0, url.indexOf("/:"));
    let path = url.slice(url.indexOf("/:"));
    for (const [key, value] of items(params)) {
      path = path.replace(`:${key}`, value);
    }

    return `${protoDomain}${path}`;
  }

  return url;
};

// http://example.com/foo
// =>
// http://example.com/foo?query1=value1&query2=value2
const buildUrlWithQuery = ({ url, query }) => {
  if (query) {
    query = querystring.stringify(query);
    if (query !== "") {
      url += `?${query}`;
    }
  }

  return url;
};

export {
  bootstrapKoaApp,
  isValidDate,
  oncePerKey,
  AsyncCounter,
  buildUrlWithParams,
  buildUrlWithQuery,
};
