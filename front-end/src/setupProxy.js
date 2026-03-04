/* global require, module */

const registerCodeCoverageMiddleware = require('@cypress/code-coverage/middleware/express');

module.exports = function setupProxy(app) {
  registerCodeCoverageMiddleware(app);
};
