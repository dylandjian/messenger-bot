'use strict'

// Defining all the const for this project
const FB_EMAIL = ''
const FB_PASSWORD = ''
const RECAST_TOKEN = ''

// Getting all the modules
const login = require('facebook-chat-api')
const recastai = require('recastai')
const db = require('monk')('localhost/db')
const Movies = db.get('movies')

const client = new recastai.request(RECAST_TOKEN, 'en')

const greetings = ['Hi ! ', 'Hello ! ', 'Greetings ! ']
const thankings = ['No worries !', 'See you later !', 'Thanks for stopping by']
const genres = {
  sad: ['Comedy', 'Music'],
  happy: ['Thriller, Action', 'Crime', 'Drama', 'Comedy'],
  stressed: ['Comedy', 'Romance', 'Music'] }

const actions = {
  greetings: greet,
  describe: describe,
  thankings: thank,
  find: find }


// Function to process greeting

function greet (intent, api, message) {
  return api.sendMessage(greetings[Math.floor(Math.random() * greetings.length)] +
          'How are you doing today ?', message.threadID)
}

// Function to process thanking

function thank (intent, api, message) {
  return api.sendMessage(thankings[Math.floor(Math.random() * thankings.length)], message.threadID)
}

// Function to process description

function describe (intent, api, message) {
  api.getThreadHistory(message.threadID, 0, 5, undefined, (err, history) => {
    if (err) return console.log(err)
    Movies.findOne({ title: history[history.length - 2].body.split(':')[1].trim() })
      .then(res => {
        if (res)
          return api.sendMessage(`The movie was produced in : ${res.productionYear} by ${res.directors[0]}.\n\n` +
                                 `The main actors are : ${res.actors[0]}, ` +
                                 `${res.actors[1]} and ${res.actors[2]}.\n\n` +
                                 `The summary of the movie is the following :\n${res.summary}\n\n` +
                                 `Have fun watching it!`, message.threadID)
        return api.sendMessage(`Sorry, I couldn't describe that`,
                            message.threadID)
      })
      .catch(err => console.log(err))
  })
}

/* Function to process the intent to find a movie
** matching the intent with a genre
*/

function find (intent, api, message) {
  Movies.find({ genres: genres[intent][Math.floor(Math.random() * genres[intent].length)] })
    .then(res => {
      if (res)
        return api.sendMessage(`You may like : ${res[Math.floor(Math.random() * res.length)].title}`,
                                message.threadID)
      return api.sendMessage(`Sorry, I couldn't find any movie for you`,
                            message.threadID)
    })
    .catch(err => console.log(err))
}

/* Beginning of the bot
** Hook for messages on a given Facebook account
*/

login({ email: FB_EMAIL, password: FB_PASSWORD }, (err, api) => {
  if (err) return console.log(err)
  api.listen((err, message) => {
    if (err) return console.log(err)

    // Ask Recast API to find the intent of the message
    client.analyseText(message.body)
      .then(res => {
        if (res.intent()) {
          let intent = res.intent().slug
          console.log('intent: ', intent)
          if (intent in actions)
            return actions[intent](intent, api, message)
          return actions['find'](intent, api, message)
        } else {
          return api.sendMessage(`Sorry, I didn't quite catch your answer`,
                            message.threadID)
        }
      })
      .catch(err => console.log(err))
  })
})
