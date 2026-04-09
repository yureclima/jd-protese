const https = require('https');

const req = https.request({
  hostname: 'api.cal.com',
  port: 443,
  path: '/v2/event-types',
  method: 'GET',
  headers: {
    'cal-api-version': '2024-08-13'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('V2 Response:', res.statusCode, data));
});
req.end();

const req2 = https.request({
  hostname: 'api.cal.com',
  port: 443,
  path: '/v1/event-types',
  method: 'GET',
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('V1 Response:', res.statusCode, data));
});
req2.end();
