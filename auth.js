const Router = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('apollo-server-express');
const { UserInputError } = require('apollo-server-express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { add } = require('./item.js');
const { getDb } = require('./db.js');

let { JWT_SECRET } = process.env;
const collection = 'users';

if (!JWT_SECRET) {
  if (process.env.NODE_ENV !== 'production') {
    JWT_SECRET = 'tempjwtsecretfordevonly';
    console.log('Missing env var JWT_SECRET. Using unsafe dev secret');
  } else {
    console.log('Missing env var JWT_SECRET. Authentication disabled.');
  }
}

const routes = new Router();

routes.use(bodyParser.json());
const origin = process.env.UI_SERVER_ORIGIN || 'http://localhost:8000';
routes.use(cors({ origin, credentials: true }));

function validate(newUser) {
  // console.log('Entered validate');
  const errors = [];
  // console.log('data of newAccount inside validate');
  // console.log(newUser);

  function validateEmail(email) {
    // the following line apparently has unnecessary escape characters
    // if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    if (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return (true);
    }
    return (false);
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of Object.entries(newUser)) {
    // console.log(`Evaluating key ${key} and value ${value}`);
    if (value === null || value.trim().length === 0) {
      errors.push(`Field "${key}" cannot be empty.`);
    }
  }

  if (newUser.password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  if (!validateEmail(newUser.email)) {
    errors.push('Please enter a valid email address.');
  }
  // console.log(`finished validation with ${errors.length} errors.`);
  if (errors.length > 0) {
    throw new UserInputError('Invalid input(s)', { errors });
  }
}

async function register(parent, { newAccount: newUser }) {
  // console.log('data of newUser');
  // console.log(newUser);
  validate(newUser);
  // console.log('have returned to "register" from "validate"');
  const {
    username, password, firstName, lastName, phone,
    email, businessName, businessWebsite, businessType,
  } = newUser;

  // console.log(`about to hash password: ${password}`);
  const hashedPassword = await bcrypt.hash(password, 10);
  // console.log('password has been hashed');
  const user = await add(parent,
    {
      username,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      email,
      businessName,
      businessWebsite,
      businessType,
    },
    collection);
  return user;
}

function getUser(req) {
  const token = req.cookies.jwt;
  if (!token) return { signedIn: false };

  try {
    const credentials = jwt.verify(token, JWT_SECRET);
    return credentials;
  } catch (error) {
    return { signedIn: false };
  }
}

routes.post('/signin', async (req, res) => {
  if (!JWT_SECRET) {
    res.status(500).send('Missing JWT_SECRET. Refusing to authenticate.');
  }

  const { username, password } = req.body.user;
  const db = getDb();

  const user = await db.collection(collection).findOne({ username });
  if (!user) {
    // return res.status(400).json({ error: 'Invalid Username or Password' });
    // throw new Error('Invalid Username');
    // throw new AuthenticationError('Invalid User or Password');
    return res.status(401).send({ error: 'Invalid Username or Password' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    // throw new Error('Invalid Password');
    // return res.status(400).json({ error: 'Invalid Username or Password' });
    // throw new AuthenticationError('Invalid User or Password');
    return res.status(401).send({ error: 'Invalid Username or Password' });
  }

  const credentials = {
    signedIn: true,
    firstName: user.firstName,
  };

  const token = jwt.sign(
    credentials,
    JWT_SECRET,
    {
      expiresIn: '30d',
    },
  );

  res.cookie('jwt', token, { httpOnly: true, domain: process.env.COOKIE_DOMAIN });

  return res.json(credentials);
});

routes.post('/signout', async (req, res) => {
  res.clearCookie('jwt', { domain: process.env.COOKIE_DOMAIN });
  res.json({ status: 'ok' });
});

routes.post('/user', (req, res) => {
  res.send(getUser(req));
});

function mustBeSignedIn(resolver) {
  return (root, args, { user }) => {
    if (!user || !user.signedIn) {
      throw new AuthenticationError('You must be signed in');
    }
    return resolver(root, args, { user });
  };
}

function resolveUser(_, args, { user }) {
  return user;
}

module.exports = {
  routes,
  getUser,
  mustBeSignedIn,
  resolveUser,
  register,
};
