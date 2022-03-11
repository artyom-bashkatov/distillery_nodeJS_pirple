/*
 * Server-related tasks
 *
 */

// Dependencies
const http = require("http");
const http2 = require("http2");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("../config");
const fs = require("fs");
const handlers = require("./handlers");
const helpers = require("./helpers");
const path = require("path");

// Instantiate the server module object
const server = {};

/* helpers.sendTwilioSms("+79002823501", "Sms by Twilio Service", (err) => {
  console.log("this was the error", err);
}); */

// TESTING
// @TODO delete this
/* _data.create('test', 'newFile', {'foo':'bar'}, (err) => {
  // console.log("this was the error", err)
})

_data.read('test', 'newFile',(err, data) => {
  // console.log("this was the error", err, 'and this was the data', data)
}) 

_data.update('test', 'newFile', {'fizz':'buzz'}, (err) => {
  // console.log("this was the error", err)
})

_data.delete('test', 'newFile', (err) => {
  // console.log("this was the error", err)
}) */

// Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

// All the server logic for both- the http and https server
server.unifiedServer = (req, res) => {
  // Get the URL and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the HTTP Method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;
  // console.log("Request received with these headers", headers);

  // Get the payload, if any
  const decoder = new StringDecoder("utf8");
  let buffer = "";
  req.on("data", (data) => {
    buffer += decoder.write(data);
  });
  req.on("end", () => {
    buffer += decoder.end();

    // Choose the handler this request should go to. If one is not found, use the notFound handler
    const chosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {
      statusCode = typeof statusCode == "number" ? statusCode : 200;
      payload = typeof payload == "object" ? payload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request path
      // console.log("Returning this response", statusCode, payloadString);
    });

    // Send the response
    // res.end("Hello World\n");
    // console.log("Request received with this payload", buffer);

    // Log the request path
    /* console.log(
      "Request received on path: " +
        trimmedPath +
        " with method: " +
        method +
        " with this query string parameters" +
        JSON.stringify(queryStringObject)
    ); */
  });
};

// Instantiate the HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, "/../https/key.pem-")),
  cert: fs.readFileSync(path.join(__dirname, "/../https/cert.pem")),
};

// The server should respond to all requests with a string
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

server.httpsServer = http2.createSecureServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res);
});

// Init script
server.init = function () {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log(
      "The server is listening on port " +
        config.httpPort +
        " " +
        config.envName +
        " now"
    );
  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(
      "The server is listening on port " +
        config.httpsPort +
        " " +
        config.envName +
        " now"
    );
  });
};

// Export the module
module.exports = server;
