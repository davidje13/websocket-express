export default async function runServer(server, address = '127.0.0.1') {
  await new Promise((resolve, reject) => {
    server.listen(0, address, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
  return () => new Promise((resolve) => server.close(resolve));
}
