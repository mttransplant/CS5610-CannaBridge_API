const Router = require('express');
const bodyParser = require('body-parser');
// const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('apollo-server-express');
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

async function register(parent, { username, password }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await add(parent, { username, password: hashedPassword }, collection);
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
  // const googleToken = req.body.google_token;
  // if (!googleToken) {
  //   res.status(400).send({ code: 400, message: 'Missing token' });
  //   return;
  // }

  // const client = new OAuth2Client();
  // let payload;
  // try {
  //   const ticket = await client.verifyIdToken({ idToken: googleToken });
  //   payload = ticket.getPayload();
  // } catch (error) {
  //   res.status(403).send('Invalid credentials');
  // }

  // const { given_name: givenName, name, email } = payload;
  // const credentials = {
  //   signedIn: true, givenName, name, email,
  // };

  // const token = jwt.sign(credentials, JWT_SECRET);

  const { username, password } = req.body.user;
  const db = getDb();
  const user = await db.collection(collection).findOne({ username });
  if (!user) {
    throw new AuthenticationError('Invalid Login');
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new AuthenticationError('Invalid Login');
  }

  const credentials = {
    signedIn: true,
    id: user.id,
    username: user.username,
  };

  const token = jwt.sign(
    credentials,
    JWT_SECRET,
    {
      expiresIn: '30d',
    },
  );

  res.cookie('jwt', token, { httpOnly: true, domain: process.env.COOKIE_DOMAIN });

  res.json(credentials);
});

routes.post('/signout', async (req, res) => {
  res.clearCookie('jwt', { domain: process.env.COOKIE_DOMAIN });
  res.json({ status: 'ok' });
});

routes.post('/user', (req, res) => {
  res.send(getUser(req));
});

function mustBeSignedIn(resolver) {
  // TODO: Re-enable when authentication is implemented

  // return (root, args, { user }) => {
  //   if (!user || !user.signedIn) {
  //     throw new AuthenticationError('You must be signed in');
  //   }
  //   return resolver(root, args, { user });
  // };
  return (root, args, { user }) => resolver(root, args, { user });
}

function resolveUser(_, args, { user }) {
  console.log('In auth.resolveUser, returning:');
  console.log(user);
  return user;
}

module.exports = {
  routes,
  getUser,
  mustBeSignedIn,
  resolveUser,
  register,
};
