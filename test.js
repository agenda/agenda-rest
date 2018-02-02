const test = require('ava');
const request = require('supertest');
const Agenda = require('agenda');

const agenda = new Agenda().database('mongodb://127.0.0.1/agenda', 'agendaJobs');

function bootstrapApp() {
  const {app} = require('./dist/index');
  app.listen(4041, () => {
    console.log('Test app running');
  });
}

test.before.cb(t => {
  bootstrapApp();
  agenda.on('ready', () => {
    t.end();
  });
});

test.serial('POST /api/new fails without content', async t => {
  const res = await request('http://localhost:4041')
    .post('/api/new')
    .send();

  t.is(res.status, 400);
});
