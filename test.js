const test = require('ava');
const request = require('supertest');

function bootstrapApp() {
  const {app, agendaReady} = require('./dist/index');
  app.listen(4041, () => {
    console.log('Test app running');
  });
  return agendaReady;
}

test.before.cb(t => {
  bootstrapApp().then(() => t.end());
});

test.serial('POST /api/new fails without content', async t => {
  const res = await request('http://localhost:4041')
    .post('/api/new')
    .send();

  t.is(res.status, 400);
});

test.serial('POST /api/new succeeds when a job is specified', async t => {
  const res = await request('http://localhost:4041')
    .post('/api/new')
    .send({name: 'foo', url: 'http://localhost:4042/foo'});

  t.is(res.status, 200);
});
