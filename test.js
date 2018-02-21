const test = require('ava');
const request = require('supertest');
const bootstrapKoaApp = require('./dist/bootstrap-koa-app');

const {app: testApp, router: testAppRouter} = bootstrapKoaApp();
const testAppUrl = 'http://localhost:4042';
const getTestAppUrl = path => path ? `${testAppUrl}${path}` : testAppUrl;

const agendaRequest = request('http://localhost:4041');
const testAppRequest = request(testAppUrl);

function bootstrapApp() {
  const {app, agendaReady} = require('./dist/index');
  app.listen(4041, () => {
    console.log('agenda-rest app running');
  });
  testApp.listen(4042, () => {
    console.log('test app running');
  });
  return agendaReady;
}

test.before(() => bootstrapApp());

test.serial('POST /api/job fails without content', async t => {
  const res = await agendaRequest
    .post('/api/job')
    .send();

  t.is(res.status, 400);
});

test.serial('POST /api/job succeeds when a job is specified', async t => {
  const res = await agendaRequest
    .post('/api/job')
    .send({name: 'foo', url: getTestAppUrl('/foo')});

  t.is(res.status, 200);
});

test.after.cb(t => {
  const res = agendaRequest
    .delete('/api/job')
    .send({name: 'foo'});

  t.is(res.status, 200);
  t.end();
});
