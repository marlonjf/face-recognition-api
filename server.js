const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const Clarifai = require('clarifai');

const clarifai = new Clarifai.App({
  apiKey: '90945e092129421ba4a256a756a7781c'
});

const db = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    user: 'user',
    password: '',
    database: 'face-recognition'
  }
});


const app = express ();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());


const database = {
  users: [
    {
      id: '123',
      name: 'John',
      email: 'john@gmail.com',
      password: 'cookies',
      entries: 0,
      joined: new Date()
    },
    {
      id: '124',
      name: 'Sally',
      email: 'sally@gmail.com',
      password: 'bananas',
      entries: 0,
      joined: new Date()
    }
  ],
  login: [
    {
      id: '987',
      hash: '',
      email: 'john@gmail.com'
    }
  ]
}

app.get('/', (req, res)=>{
  res.send(database.users);
})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({
    id: id
  })
    .then(user => {
      if (user.length){
        res.json(user[0])
      } else {
        res.status(400).json('Not Found')
      }
  })
  .catch(err => res.status(400).json('error getting user'))
  // if (!found) {
  //   res.status(400).json('not found');
  // }
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
      res.json(entries[0]);
    })
    .catch(err => res.status(400).json('unable to get entries'))
})

app.post('/signin', (req, res)=>{
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json('invalid data');
  }
  db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data=> {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid){
        return db.select('*').from('users')
        .where('email', '=', email)
        .then(user => {
          res.json(user[0])
        })
        .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong credentials')
      }
  })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res) => {
  const {email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json('invalid data');
  }
  const hash = bcrypt.hashSync(password);
  db.transaction(trx => {
    trx.insert({
      hash: hash,
      email: email
    })
    .into('login')
    .returning('email')
    .then(loginEmail =>{
      return trx('users')
        .returning('*')
        .insert({
          email: loginEmail[0],
          name: name,
          joined: new Date()
        })
        .then(user => {
          res.json(user[0])
        })
    })
    .then(trx.commit)
    .catch(trx.rollback)
  })
  .catch(err => res.status(400).json('unable to register'))
})

app.listen(3000, () => {
  console.log('test');
})

app.post('/imageurl', (req, res) => {
  clarifai.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
    .then(data => {
      res.json(data);
    })
    .catch(err => res.status(400).json('unable api'))
})
