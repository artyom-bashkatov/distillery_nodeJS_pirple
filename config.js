/*
* Create and export configuraton variables
*
*/

// Container for all the environments
const environments = {};

// Staging (default) environment
environments.staging = {
  'httpPort': 3000,
  'httpsPort': 3001,
  'envName': 'staging',
  'hashingSecret': 'thisIsASecret',
  'maxChecks': 5,
  'twilio': {
    'accountSid': 'AC59ad9fd52e35018fede6035cba912e0f',
    'authToken': '68d8b5efd2faf7e33f55cbba37bc0473',
    'fromPhone': 'MGc4c87bc69320fb88ae2543fa70e16c83'
  }
};

// Production environment
environments.production = {
  'httpPort': 5000,
  'httpsPort': 5001,
  'envName': 'production',
  'hashingSecret': 'thisIsAlsoASecret',
  'maxChecks': 5,
  'twilio': {
    'accountSid': 'AC59ad9fd52e35018fede6035cba912e0f',
    'authToken': '68d8b5efd2faf7e33f55cbba37bc0473',
    'fromPhone': 'MGc4c87bc69320fb88ae2543fa70e16c83'
  }
};

// Determine which environment was passed as a command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check- that the current environment is one of the environments above, if not, default to staging
const environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;