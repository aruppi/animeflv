const app = require('./app');
const port = process.env.PORT || 4000;

app.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`\n🚀 ... Listening: http://localhost:${port}/api/v1`);
  /* eslint-enable no-console */
});
