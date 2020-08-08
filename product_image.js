const { UserInputError } = require('apollo-server-express');
const { Binary } = require('mongodb');
const { mustBeSignedIn } = require('./auth.js');
const item = require('./item.js');

const collection = 'product_images';

async function get(e, { id }) {
  const request = await item.get(e, { id }, collection);
  return request;
}

function validate(imageBin) {
  const errors = [];
  if (imageBin.length() > 16000) {
    errors.push('File must be smaller than 16 MB.');
  }
  if (errors.length > 0) {
    throw new UserInputError('Invalid input(s)', { errors });
  }
}

async function add(e, { image }) {
  const imageBin = Binary(image);
  validate(imageBin);
  const savedImage = await item.add(e, imageBin, collection);
  return savedImage;
}

async function update(e, { id, changes }) {
  if (changes.thumbnail || changes.image) {
    const image = await get(e, { id });
    Object.assign(image, changes);
    const imageBin = Binary(image);
    validate(imageBin);
  }
  const savedImage = await item.update(e, { id, changes }, collection);
  return savedImage;
}

async function remove(e, params) {
  const result = await item.remove(e, params, collection);
  return result;
}

async function restore(e, params) {
  const result = await item.restore(e, params, collection);
  return result;
}

module.exports = {
  add: mustBeSignedIn(add),
  get,
  update: mustBeSignedIn(update),
  delete: mustBeSignedIn(remove),
  restore: mustBeSignedIn(restore),
};
