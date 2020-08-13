const { UserInputError } = require('apollo-server-express');
const { mustBeSignedIn } = require('./auth.js');
const item = require('./item.js');

const collection = 'requests';

async function get(e, { id }) {
  const request = await item.get(e, { id }, collection);
  return request;
}

async function list(e, params) {
  const { items: requests, pages } = await item.list(e, params, collection);
  return { requests, pages };
}

function validate(request) {
  const errors = [];
  if (request.title.trim().length < 3) {
    errors.push('Field "title" must be at least 3 characters long.');
  }
  // TODO: Think of other fields to validate
  if (errors.length > 0) {
    throw new UserInputError('Invalid input(s)', { errors });
  }
}

async function add(e, { request }) {
  validate(request);
  const savedProduct = await item.add(e, request, collection);
  return savedProduct;
}

async function update(e, { id, changes }) {
  // TODO: Add in options for other validated fields
  // if (changes.title || changes.quantity || changes.price) {
  if (changes.title) {
    const request = await get(e, { id });
    Object.assign(request, changes);
    validate(request);
  }
  const savedReqeust = await item.update(e, { id, changes }, collection);
  return savedReqeust;
}

async function remove(e, params) {
  const result = await item.remove(e, params, collection);
  return result;
}

async function restore(e, params) {
  const result = await item.restore(e, params, collection);
  return result;
}

async function counts(e, params) {
  const result = await item.counts(e, params, collection);
  return result;
}

module.exports = {
  list,
  add: mustBeSignedIn(add),
  get,
  update: mustBeSignedIn(update),
  delete: mustBeSignedIn(remove),
  restore: mustBeSignedIn(restore),
  counts,
};
