const handler = require('./api/students.js');

const req = {
  url: '/api/students',
  headers: { host: 'localhost:3000' },
  method: 'GET'
};

const res = {
  statusCode: 200,
  setHeader: (k, v) => console.log('SetHeader:', k, v),
  end: (data) => console.log('End:', data)
};

handler(req, res).catch(console.error);
