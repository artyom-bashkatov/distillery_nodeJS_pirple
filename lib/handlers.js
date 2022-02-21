/*
* Request handlers
*
*/

// Dependencies
const { off } = require('process');
const _data = require('./data');
const helpers = require('./helpers');

// Define the handlers
const handlers = {};

// Users
handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
}

// Users
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
}

// Container for the users submethods
handlers._users = {};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  const password = typeof(data.payload.password) == 'string' && data.payload.phone.trim().length > 0 ? data.payload.password.trim() : false;
  if(phone && password) {
    // Lookup the user who matches that phone number

    _data.read('users', phone, (err, userData) => {
      if(!err && userData) {
        // Hash the sent password, and compare it to the password stored in the user object
        const hashedPassword = helpers.hash(password);
        if(hashedPassword == userData.hashedPassword) {
          // If valid, create a new token woth a random name. Set expiration data 1 hour in the feature
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            'phone': phone,
            'id': tokenId,
            'expires': expires
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, (err) => {
            if(!err) {
              callback(200, tokenObject);
            } else {
              callback(500, {'Error': 'Could not create the new token'});
            }
          })
        } else {
          callback(400, {'Error': 'Password did not match the specified user stored password'});
        }
      } else {
        callback(400, {'Error': 'Could not find the specified user'})
      }
    })

  } else {
    callback(400, {'Error': 'Missing required field(s)'});
  }
}

// Tokens - get
// Required data : id
// Optional data : none
handlers._tokens.get = (data, callback) => {
  // Check that the id is valid
  const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id) {
    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
      if(!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    })
  } else {
    callback(400, {'Error': 'Missing required field'});
  }
}

// Tokens - put
handlers._tokens.put = (data, callback) => {
  
}

// Tokens - delete
handlers._tokens.delete = (data, callback) => {
  
}

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  // Check that all required fields are filled out
  const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  const password = typeof(data.payload.password) == 'string' && data.payload.phone.trim().length > 0 ? data.payload.password.trim() : false;
  const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesnt' already exist
    _data.read('users', phone, (err, data) => {
      if(err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if(hashedPassword) {
          // Create the user object
        const userObject = {
          firstName,
          lastName,
          phone,
          hashedPassword,
          tosAgreement: true
        }

        // Store the user
        _data.create('users', phone, userObject, (err) => {
          if(!err) {
            callback(200);
          } else {
            console.log(err);
            callback(500, {'Error': 'Could not create the new user'});
          }
        })
        } else {
          callback(500, {'Error': 'Could not hash the user\'s password'})
        }
      } else {
        // User already exists
        callback(400, {'Error': 'A user with that phone number already exists'})
      }
    })
  } else {
    callback(400, {'Error': 'Missing required fields'});
  }
}

// Users - get
// Required data: phome
// Optional data: none
// @TODO Only let an authenticated user access their object. Don't let them access anyone elses
handlers._users.get = (data, callback) => {
  // Check that the phone number is valid
  const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone) {
    _data.read('users', phone, (err, data) => {
      if(!err && data) {
        // Remove the hashed password from the user object before returning it to the requester
        delete data.hashedPassword;
        callback(200, data);
      } else {
        callback(404);
      }
    })
  } else {
    callback(400, {'Error': 'Missing required field'});
  }
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// @TODO Only let an authenticated user update their own object. Don't let them update an user
handlers._users.put = (data, callback) => {
  // Check required filed
  const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const password = typeof(data.payload.password) == 'string' && data.payload.phone.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if the phone is invalid
  if(phone) {
    if(firstName || lastName || password) {
      // Lookup the user
      _data.read('users', phone, (err, userData) => {
        if(!err && userData) {
          // Update the fields necessary
          if(firstName) {
            userData.firstName = firstName;
          }
          if(lastName) {
            userData.lastName = lastName;
          }
          if(password) {
            userData.hashedPassword = helpers.hash(password);
          }
          // Store the new updates
          _data.update('users', phone, userData, (err) => {
            if(!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, {'Error': 'Could not update the user'});
            }
          })
        } else {
          callback(400, {'Error': 'The specified user does not exist'})
        }
      })
    } else {
      callback(400, {'Error': 'Missing fields to update'});
    }
  } else {
    callback(400, {'Error': 'Missing required field'})
  }
}

// Users - delete
// Required field: phone
// @TODO Only let an authenticated user delete their object. Dont let them delete anyone else's
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid
  const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone) {
    _data.read('users', phone, (err, data) => {
      if(!err && data) {
        // Remove the hashed password from the user object before returning it to the requester
        _data.delete('users', phone, (err) => {
          if(!err) {
            callback(200);
          } else {
            callback(500, {'Error': 'Could not delete the specified user'});
          }
        })
      } else {
        callback(400, {'Error': 'Could not find the specified user'});
      }
    })
  } else {
    callback(400, {'Error': 'Missing required field'});
  }
}


// Ping handler
handlers.ping = (data, callback) => {
  callback(200);
};

// NotFound handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Export the module
module.exports = handlers;