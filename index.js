/*
 * Primary file for the API
 *
 */

// Dependencies
const http = require("http");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;

// Define the handlers
const handlers = {};


// Sample handler
handlers.sample = (data, callback) => {
  // Calback a http status code, and a payload object
  callback(406, {'name': 'sample handler'})
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
}

// Define a request router
const router = {
  'sample' : handlers.sample
}



// The server should respond to all requests with a string
let server = http.createServer((req, res) => {
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
  console.log("Request received with these headers", headers);

  // Get the payload, if any
  const decoder = new StringDecoder("utf8");
  let buffer = "";
  req.on("data", (data) => {
    buffer += decoder.write(data);
  });
  req.on("end", () => {
    buffer += decoder.end();

    // Choose the handler this request should go to. If one is not found, use the notFound handler
    const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      'trimmedPath': trimmedPath,
      'queryStringObject': queryStringObject,
      'method': method,
      'headers': headers,
      'payload': buffer
    }

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request path
      console.log("Returning this response", statusCode, payloadString);
    })

    // Send the response
    // res.end("Hello World\n");
    console.log("Request received with this payload", buffer);

    // Log the request path
    console.log(
      "Request received on path: " +
        trimmedPath +
        " with method: " +
        method +
        " with this query string parameters" +
        JSON.stringify(queryStringObject)
    );
  });
});

server.listen(3000, () => {
  console.log("The server is listening on port 3000 now");
});

// Start the server, and have it listen on port 3000
