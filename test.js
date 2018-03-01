const {promisify} = require('util');
const test = require('ava');
const request = require('supertest');
const bootstrapKoaApp = require('./src/bootstrap-koa-app');

const agendaAppUrl = 'http://localhost:4041';
const testAppUrl = 'http://localhost:4042';
const {app: testApp, router: testAppRouter} = bootstrapKoaApp();
const getTestAppUrl = path => path ? `${testAppUrl}${path}` : testAppUrl;

const agendaAppRequest = request(agendaAppUrl);

testAppRouter.post('/foo', async (ctx, next) => {
  console.log('foo invoked!');
  ctx.body = 'foo success';
  ctx.status = 200;
  await next();
});

testAppRouter.post('/foo/:fooParam', async (ctx, next) => {
  console.log('foo with params invoked!');
  console.log(ctx.params);
  console.log(ctx.request.body);
  ctx.body = 'foo with params success';
  ctx.status = 200;
  await next();
});

testAppRouter.post('/foo/cb', async (ctx, next) => {
  console.log('foo callback invoked!');
  ctx.body = 'foo callback success';
  ctx.status = 200;
  await next();
});

const bootstrapApp = async () => {
  const {app, jobsReady} = require('./src');
  await promisify(app.listen).bind(app)(4041)
    .then(() => console.log('agenda-rest app running'));

  await promisify(testApp.listen).bind(testApp)(4042)
    .then(() => console.log('test app running'));
  await jobsReady;
};

test.before(() => bootstrapApp());

test.serial('POST /api/job fails without content', async t => {
  const res = await agendaAppRequest
    .post('/api/job')
    .send();

  t.is(res.status, 400);
});

test.serial('POST /api/job succeeds when a job is specified', async t => {
  const res = await agendaAppRequest
    .post('/api/job')
    .send({name: 'foo', url: getTestAppUrl('/foo')});

  t.is(res.status, 200);
});

test.serial('DELETE /api/job succeeds when a job is defined', async t => {
  const res = await agendaAppRequest
    .delete('/api/job/foo');

  t.is(res.status, 200);
});
