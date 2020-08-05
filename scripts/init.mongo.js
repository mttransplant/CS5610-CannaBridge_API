/*
* Run using the mongo shell. For remote databases, ensure that the
* connection string is supplied in the command line. For example:
* localhost:
*   mongo cannabridge scripts/init.mongo.js
* Atlas:
*   mongo mongodb+srv://user:pwd@xxx.mongodb.net/cannabridge
*   scripts/init.mongo.js
* MLab:
*   mongo mongodb://user:pwd@xxx.mlab.com:33533/cannabridge
*   scripts/init.mongo.js
*/


/* global db print */
/* eslint no-restricted-globals: "off" */

// Establish products baseline data
db.products.remove({});
db.deleted_products.remove({});

const producers = ['Producer A', 'Producer B', 'Producer C', 'Producer D', 'Producer E'];
const types = ['Flower', 'Edible', 'Topical', 'PreRoll', 'Concentrate', 'Beverage'];

for (let i = 0; i < 100; i += 1) {
  const randomCreatedDate = (new Date()) - Math.floor(Math.random() * 60) * 1000 * 60 * 60 * 24;
  const created = new Date(randomCreatedDate);
  const poster = producers[Math.floor(Math.random() * 5)];
  const type = types[Math.floor(Math.random() * 6)];
  const quantity = Math.ceil(Math.random() * 20);
  let unit;
  let price;
  switch (type) {
    case 'Flower':
    case 'Concentrate':
    case 'Topical':
      unit = 'oz';
      price = Math.trunc(Math.random() * 75);
      break;
    default:
      unit = 'ea';
      price = Math.trunc(Math.random() * 15);
  }
  const title = `Product: ${type} - Lorem ipsum dolor sit amet, ${i}`;
  const id = i + 1;

  const description = `Description for: ${title}`;

  const product = {
    id, title, type, created, poster, quantity, unit, price, description,
  };

  db.products.insertOne(product);
}

const prodCount = db.products.count();
db.counters.remove({ _id: 'products' });
db.counters.insert({ _id: 'products', current: prodCount });
print('New products count:', prodCount);

db.products.createIndex({ id: 1 }, { unique: true });
db.products.createIndex({ title: 'text', description: 'text' });
db.products.createIndex({ type: 1 });
db.products.createIndex({ poster: 1 });
db.products.createIndex({ created: 1 });

db.deleted_products.createIndex({ id: 1 }, { unique: true });

// Establish requests baseline data
db.requests.remove({});
db.deleted_requests.remove({});

const requestors = ['Requestor A', 'Requestor B', 'Requestor C', 'Requestor D', 'Requestor E'];

for (let i = 0; i < 100; i += 1) {
  const randomCreatedDate = (new Date()) - Math.floor(Math.random() * 60) * 1000 * 60 * 60 * 24;
  const created = new Date(randomCreatedDate);
  const poster = requestors[Math.floor(Math.random() * 5)];
  const type = types[Math.floor(Math.random() * 6)];

  const title = `Request: ${type} - Lorem ipsum dolor sit amet, ${i}`;
  const id = i + 1;

  const description = `Description for: ${title}`;

  const request = {
    id, title, type, created, poster, description,
  };

  db.requests.insertOne(request);
}

const reqCount = db.requests.count();
db.counters.remove({ _id: 'requests' });
db.counters.insert({ _id: 'requests', current: reqCount });
print('New requests count:', reqCount);

db.requests.createIndex({ id: 1 }, { unique: true });
db.requests.createIndex({ title: 'text', description: 'text' });
db.requests.createIndex({ type: 1 });
db.requests.createIndex({ poster: 1 });
db.requests.createIndex({ created: 1 });

db.deleted_requests.createIndex({ id: 1 }, { unique: true });
