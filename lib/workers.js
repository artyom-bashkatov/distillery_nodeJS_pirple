/*
 * Worker-related tasks
 *
 */

// Dependencies
const path = require("path");
const fs = require("fs");
const _data = require("./data");
const https = require("https");
const http = require("http");
const helpers = require("./helpers");
const url = require("url");

// Instantiate the worker object
const workers = {};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  _data.list("checks", (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the check data
        _data.read("checks", check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass it to the check validator, and let that function continue or log errors
            workers.validateCheckData(originalCheckData);
          } else {
            console.log("Error: reading one of the check's data");
          }
        });
      });
    } else {
      console.log("Error: Could not find any checks to process");
    }
  });
};

workers.validateCheckData = (originalCheckData) => {
  originalCheckData =
    typeof originalCheckData == "object" && originalCheckData !== null
      ? originalCheckData
      : {};
  originalCheckData.id =
    typeof originalCheckData.id == "string" &&
    originalCheckData.id.trim().length == 20
      ? originalCheckData.id.trim()
      : false;
  originalCheckData.userPhone =
    typeof originalCheckData.userPhone == "string" &&
    originalCheckData.userPhone.trim().length == 10
      ? originalCheckData.userPhone.trim()
      : false;
  originalCheckData.protocol =
    typeof originalCheckData.protocol == "string" &&
    ["http", "https"].includes(originalCheckData.protocol)
      ? originalCheckData.protocol
      : false;
  originalCheckData.url =
    typeof originalCheckData.url == "string" &&
    originalCheckData.url.trim().length > 0
      ? originalCheckData.url
      : false;
  originalCheckData.method =
    typeof originalCheckData.method == "string" &&
    ["get", "put", "post", "delete"].includes(originalCheckData.method)
      ? originalCheckData.method
      : false;
  originalCheckData.successCodes =
    typeof originalCheckData.successCodes == "object" &&
    originalCheckData.successCodes instanceof Array &&
    originalCheckData.successCodes.length > 0
      ? originalCheckData.successCodes
      : false;
  originalCheckData.timeOutSeconds =
    typeof originalCheckData.timeOutSeconds == "number" &&
    originalCheckData.timeOutSeconds % 1 === 0 &&
    originalCheckData.timeOutSeconds >= 1 &&
    originalCheckData.timeOutSeconds <= 5
      ? originalCheckData.timeOutSeconds
      : false;


  // Set the keys that may not be set (if workers never seen before)
  originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].includes(originalCheckData.state) ? originalCheckData.state : 'down';
  originalCheckData.lastChecked =
    typeof originalCheckData.lastChecked == "number" &&
    originalCheckData.lastChecked > 0
      ? originalCheckData.lastChecked
      : false;


  // If all the checks pass, pass the data along to the next step in the process
  if(originalCheckData.id &&
    originalCheckData.userPhone &&
    originalCheckData.protocol &&
    originalCheckData.url &&
    originalCheckData.method &&
    originalCheckData.successCodes &&
    originalCheckData.timeOutSeconds) {
      workers.performCheck(originalCheckData);
    } else {
      console.log("Error: One of the checks is not properly formatted. Skipping it.");
    }
};

workers.performCheck = (originalCheckData) => {
  const checkOutcome = {
    'error': false,
    'responseCode': false
  }
  let outcomeSent = false;
  const parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.path;

  const requestDetails = {
    'protocol': originalCheckData.protocol+':',
    'hostname': hostName,
    'method': originalCheckData.method.toUpperCase(),
    'path': path,
    'timeOut': originalCheckData.timeOutSeconds * 1000
  }

  const _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    const status = res.statusCode;
    checkOutcome.responseCode = status;
  })

  req.on('response', res => {
    if(!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('error', (e) => {
    checkOutcome.error = {
      'error': true,
      'value': e
    };
    if(!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('timeout', (e) => {
    checkOutcome.error = {
      'error': true,
      'value': 'timeout'
    };
    if(!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.end();

}

workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';
  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if(!err) {
      if(alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log('Check outcome has not changed, no alert needed')
      }
    } else {
      console.log('Error trying to save updates to one of the checks')
    }
  });
}

workers.alertUserToStatusChange = (newCheckData) => {
  const msg = 'Alert: You check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently' + newCheckData.state;
  helpers.sendTwilioSms(newCheckData.phone, msg, (err) => {
    if(!err) {
      console.log('Success: User was alerted to a status change in their check, via sms', msg)
    } else {
      console.log('Error: Could not send sms')
    }
  })
}

// Timer to execute the worker-process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 5);
};

// Init script
workers.init = () => {
  // Execute all the checks immediately
  workers.gatherAllChecks();
  // Call the loop so the checks will execute later on
  workers.loop();
};

// Export the module
module.exports = workers;
