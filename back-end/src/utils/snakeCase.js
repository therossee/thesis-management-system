const _ = require('lodash');

const toSnakeCase = obj => {
  if (!_.isObject(obj) || _.isDate(obj) || _.isRegExp(obj)) {
    return obj;
  }

  if (_.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  }

  return _.reduce(
    obj,
    (result, value, key) => {
      const snakeKey = _.snakeCase(key);
      result[snakeKey] = toSnakeCase(value);
      return result;
    },
    {},
  );
};

module.exports = toSnakeCase;
