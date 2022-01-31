/*
* Primary file for the API
*
*/

// Dependencies
const http = require('http');

// The server should respond to all requests with a string
let server = http.createServer((req, res) => {
  res.end('Hello World\n');
})

server.listen(3000, () => {
  console.log("The server is listening on port 3000 now")
})

// Start the server, and have it listen on port 3000