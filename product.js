const { UserInputError } = require('apollo-server-express');
const { mustBeSignedIn } = require('./auth.js');
const item = require('./item.js');

const collection = 'products';

async function get(e, { id }) {
  const product = await item.get(e, { id }, collection);
  return product;
}

async function list(e, params) {
  const { items: products, pages } = await item.list(e, params, collection);
  return { products, pages };
}

function validate(product) {
  const errors = [];
  if (product.title.trim().length < 3) {
    errors.push('Field "title" must be at least 3 characters long.');
  }
  if (product.quantity <= 0) {
    errors.push('Field "Quantity" must be a positve number.');
  }
  if (product.price <= 0) {
    errors.push('Field "Price" must be a positve number.');
  }
  if (errors.length > 0) {
    throw new UserInputError('Invalid input(s)', { errors });
  }
}

async function add(e, { product }) {
  validate(product);
  const savedProduct = await item.add(e, product, collection);
  return savedProduct;
}

async function update(e, { id, changes }) {
  if (changes.title || changes.quantity || changes.price) {
    const product = await get(e, { id });
    Object.assign(product, changes);
    validate(product);
  }
  const savedProduct = await item.update(e, { id, changes }, collection);
  return savedProduct;
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
