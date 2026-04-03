const https = require('https');

// Proxy for counterapi.dev — resolves CORS issues on custom domain
exports.handler = async (event) => {
  const path = (event.queryStringParameters && event.queryStringParameters.path) || '';
  if (!path) {
    return { statusCode: 400, body: JSON.stringify({ error: 'missing path param' }) };
  }

  // Follow redirects (counterapi.dev adds trailing slash via 301)
  const fetchUrl = (url) => new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location;
        const next = loc.startsWith('http') ? loc : `https://api.counterapi.dev${loc}`;
        fetchUrl(next).then(resolve);
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', (e) => resolve({ status: 500, body: JSON.stringify({ error: e.message }) }));
  });

  const target = `https://api.counterapi.dev/v1/${path}`;
  const result = await fetchUrl(target);

  return {
    statusCode: result.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: result.body,
  };
};
