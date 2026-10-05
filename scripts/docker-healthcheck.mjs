const port = process.env.PORT ?? '3000';
const response = await fetch(`http://127.0.0.1:${port}/health`);

if (response.status !== 200) {
  process.exit(1);
}

const body = await response.json();

if (body.status !== 'YorNaaS' || typeof body.version !== 'string') {
  process.exit(1);
}
