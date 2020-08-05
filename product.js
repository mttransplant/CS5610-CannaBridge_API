const { UserInputError } = require('apollo-server-express');
const { getDb, getNextSequence } = require('./db.js');
const { mustBeSignedIn } = require('./auth.js');

async function get(_, { id }) {
  const db = getDb();
  const issue = await db.collection('products').findOne({ id });
  return issue;
}

const PAGE_SIZE = 10;

async function list(_, {
  type, dateMin, dateMax, search, page,
}) {
  const db = getDb();
  const filter = {};
  if (type) filter.type = type;
  if (dateMin !== undefined || dateMax !== undefined) {
    filter.effort = {};
    if (dateMin !== undefined) filter.effort.$gte = dateMin;
    if (dateMax !== undefined) filter.effort.$lte = dateMax;
  }
  if (search) filter.$text = { $search: search };
  const cursor = db.collection('products').find(filter)
    .sort({ id: 1 })
    .skip(PAGE_SIZE * (page - 1))
    .limit(PAGE_SIZE);

  const totalCount = await cursor.count(false);
  const products = cursor.toArray();
  const pages = Math.ceil(totalCount / PAGE_SIZE);
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

async function add(_, { product }) {
  const db = getDb();
  validate(product);
  const newProduct = Object.assign({}, product);
  newProduct.created = new Date();
  newProduct.id = await getNextSequence('products');
  const result = await db.collection('products').insertOne(newProduct);
  const savedProduct = await db.collection('products').findOne({ _id: result.insertedId });
  return savedProduct;
}

async function update(_, { id, changes }) {
  const db = getDb();
  if (changes.title || changes.type || changes.poster) {
    const product = await db.collection('products').findOne({ id });
    Object.assign(product, changes);
    validate(product);
  }
  await db.collection('products').updateOne({ id }, { $set: changes });
  const savedProduct = await db.collection('products').findOne({ id });
  return savedProduct;
}

async function remove(_, { id }) {
  const db = getDb();
  const product = await db.collection('products').findOne({ id });
  if (!product) return false;
  product.deleted = new Date();

  let result = await db.collection('deleted_products').insertOne(product);
  if (result.insertedId) {
    result = await db.collection('products').removeOne({ id });
    return result.deletedCount === 1;
  }
  return false;
}

async function restore(_, { id }) {
  const db = getDb();
  const product = await db.collection('deleted_products').findOne({ id });
  if (!product) return false;
  product.deleted = new Date();

  let result = await db.collection('products').insertOne(product);
  if (result.insertedId) {
    result = await db.collection('deleted_products').removeOne({ id });
    return result.deletedCount === 1;
  }
  return false;
}

async function counts(_, { type, dateMin, dateMax }) {
  const db = getDb();
  const filter = {};

  if (type) filter.type = type;

  if (dateMin !== undefined || dateMax !== undefined) {
    filter.effort = {};
    if (dateMin !== undefined) filter.effort.$gte = dateMin;
    if (dateMax !== undefined) filter.effort.$lte = dateMax;
  }

  const results = await db.collection('products').aggregate([
    { $match: filter },
    {
      $group: {
        _id: { poster: '$poster', type: '$type' },
        count: { $sum: 1 },
      },
    },
  ]).toArray();

  const stats = {};
  results.forEach((result) => {
    // eslint-disable-next-line no-underscore-dangle
    const { poster, type: typeKey } = result._id;
    if (!stats[poster]) stats[poster] = { poster };
    stats[poster][typeKey] = result.count;
  });
  return Object.values(stats);
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
