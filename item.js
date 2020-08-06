const { getDb, getNextSequence } = require('./db.js');
const GraphQLDate = require('./graphql_date.js');

async function get(_, { id }, collection) {
  const db = getDb();
  const item = await db.collection(collection).findOne({ id });
  return item;
}

const PAGE_SIZE = 10;

async function list(_, {
  type, dateMin, dateMax, search, page,
}, collection) {
  const db = getDb();
  const filter = {};
  if (type) filter.type = type;
  if (dateMin !== undefined || dateMax !== undefined) {
    filter.created = {};
    // console.log(`dateMin is: ${dateMin}`);
    // console.log(`dateMax is: ${dateMax}`);
    if (dateMin !== undefined) filter.created.$gte = GraphQLDate.parseValue(dateMin);
    if (dateMax !== undefined) filter.created.$lte = GraphQLDate.parseValue(dateMax);
    // console.log(filter);
  }
  if (search) filter.$text = { $search: search };
  const cursor = db.collection(collection).find(filter)
    .sort({ id: 1 })
    .skip(PAGE_SIZE * (page - 1))
    .limit(PAGE_SIZE);

  const totalCount = await cursor.count(false);
  const items = cursor.toArray();
  const pages = Math.ceil(totalCount / PAGE_SIZE);
  return { items, pages };
}

async function add(_, item, collection) {
  const db = getDb();
  const newItem = Object.assign({}, item);
  newItem.created = new Date();
  newItem.id = await getNextSequence(collection);
  const result = await db.collection(collection).insertOne(newItem);
  const savedItem = await db.collection(collection).findOne({ _id: result.insertedId });
  return savedItem;
}

async function update(_, { id, changes }, collection) {
  const db = getDb();
  await db.collection(collection).updateOne({ id }, { $set: changes });
  const savedProduct = await db.collection(collection).findOne({ id });
  return savedProduct;
}

async function remove(_, { id }, collection) {
  const db = getDb();
  const item = await db.collection(collection).findOne({ id });
  if (!item) return false;
  item.deleted = new Date();

  let result = await db.collection(`deleted_${collection}`).insertOne(item);
  if (result.insertedId) {
    result = await db.collection(collection).removeOne({ id });
    return result.deletedCount === 1;
  }
  return false;
}

async function restore(_, { id }, collection) {
  const db = getDb();
  const item = await db.collection(`deleted_${collection}`).findOne({ id });
  if (!item) return false;
  item.deleted = new Date();

  let result = await db.collection(collection).insertOne(item);
  if (result.insertedId) {
    result = await db.collection(`deleted_${collection}`).removeOne({ id });
    return result.deletedCount === 1;
  }
  return false;
}

async function counts(_, { type, dateMin, dateMax }, collection) {
  const db = getDb();
  const filter = {};

  if (type) filter.type = type;

  if (dateMin !== undefined || dateMax !== undefined) {
    filter.date = {};
    if (dateMin !== undefined) filter.date.$gte = dateMin;
    if (dateMax !== undefined) filter.date.$lte = dateMax;
  }

  const results = await db.collection(collection).aggregate([
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
  get,
  list,
  add,
  update,
  remove,
  restore,
  counts,
};
