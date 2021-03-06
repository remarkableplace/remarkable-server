const assert = require('assert');
const uuid = require('uuid');
const _ = require('lodash');
const promisify = require('es6-promisify');
const dynamoDb = require('./dynamoDb');

const dbScan = promisify(dynamoDb.scan, dynamoDb);
const dbGet = promisify(dynamoDb.get, dynamoDb);
const dbQuery = promisify(dynamoDb.query, dynamoDb);
const dbPut = promisify(dynamoDb.put, dynamoDb);
const dbUpdate = promisify(dynamoDb.update, dynamoDb);
const dbDelete = promisify(dynamoDb.delete, dynamoDb);
const { PAGES_TABLE } = process.env;

assert.ok(PAGES_TABLE, 'Env. variable PAGES_TABLE is required');

/**
 * Get pages
 *
 * @function get
 * @returns {Promise<Page[]>} array of pages
 */
function get() {
  return dbScan({
    TableName: PAGES_TABLE,
    Limit: 50
  }).then(data => data.Items);
}

/**
 * Get page by id
 *
 * @function getById
 * @param {String} id - page id
 * @returns {Promise<Page>} page
 */
function getById(id) {
  if (!id) {
    return Promise.reject(new Error('id is required'));
  }

  return dbGet({
    TableName: PAGES_TABLE,
    Key: {
      id
    }
  }).then(data => data.Item);
}

/**
 * Get pages for author
 *
 * @function getByAuthorId
 * @param {String} authorId - author's id
 * @returns {Promise<[Page]>} pages
 */
function getByAuthorId(authorId) {
  if (!authorId) {
    return Promise.reject(new Error('authorId is required'));
  }

  return dbQuery({
    TableName: PAGES_TABLE,
    IndexName: 'AuthorIdIndex',
    KeyConditionExpression: 'authorId = :authorId',
    ExpressionAttributeValues: {
      ':authorId': authorId
    }
  }).then(data => data.Items);
}

/**
 * Create page
 *
 * @function create
 * @param {Object} page - new page args
 * @param {String} page.authorId - authorId
 * @param {String} [page.id] - id, only for testing
 * @param {String} [page.title] - title
 * @param {String} [page.content] - content
 * @returns {Promise<Page>} new page
 */
function create({ id = uuid.v1(), authorId, title = '', content = '' } = {}) {
  if (!authorId) {
    return Promise.reject(new Error('authorId is required'));
  }

  const page = {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorId,
    title,
    content
  };

  return dbPut({
    TableName: PAGES_TABLE,
    Item: page
  }).then(() => page);
}

/**
 * Update page by id
 *
 * @function updateById
 * @param {String} id - page id
 * @param {Object} pageArgs - new args
 * @param {String} [pageArgs.title] - title
 * @param {String} [pageArgs.content] - content
 * @returns {Promise<Page>} updated page
 */
function updateById(id, pageArgs = {}) {
  if (!id) {
    return Promise.reject(new Error('id is required'));
  }

  if (pageArgs.id) {
    return Promise.reject(new Error('id cannot be updated'));
  }

  if (pageArgs.authorId) {
    return Promise.reject(new Error('authorId cannot be updated'));
  }

  let UpdateExpression = _.map(pageArgs, (value, key) => `${key}= :${key}`);
  UpdateExpression.push('updatedAt= :updatedAt');
  UpdateExpression = `set ${UpdateExpression.join(', ')}`;

  const ExpressionAttributeValues = _.mapKeys(
    pageArgs,
    (value, key) => `:${key}`
  );
  ExpressionAttributeValues[':updatedAt'] = new Date().toISOString();

  return dbUpdate({
    TableName: PAGES_TABLE,
    Key: { id },
    UpdateExpression,
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  }).then(data => data.Attributes);
}

/**
 * Remove page by id
 *
 * @function removeById
 * @param {String} id - page id
 * @returns {Promise<undefined>} no return value
 */
function removeById(id) {
  if (!id) {
    return Promise.reject(new Error('id is required'));
  }

  return dbDelete({
    TableName: PAGES_TABLE,
    Key: {
      id
    }
  });
}

module.exports = {
  get,
  getById,
  getByAuthorId,
  create,
  updateById,
  removeById
};
