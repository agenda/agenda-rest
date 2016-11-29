/**
 * Created by keyvan on 11/28/16.
 */

import Koa from 'koa';
import Router from 'koa-router';

const app = new Koa();
const router = new Router();

app.use(router.routes());

router.get('/test', async (ctx, next) => {
    ctx.body = 'test'; // ctx instead of this
    await next();
});

app.listen(4040, () => {
    console.log('App listening on port 4040.');
});
