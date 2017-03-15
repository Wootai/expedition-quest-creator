const express = require('express');
const fs = require('fs');
const passport = require('passport');
const querystring = require('querystring');
const React = require('react');

const config = require('./config');
const quests = require('./models/quest');
const Mail = require('./mail');
const oauth2 = require('./lib/oauth2');


// Use the oauth middleware to automatically get the user's profile
// information and expose login/logout URLs to templates.
const router = express.Router();
router.use(oauth2.template);

router.get('/', (req, res) => {
  res.render('app', {
    state: JSON.stringify(res.locals),
  });
});


const HTML_REGEX = /<(\w|(\/\w))(.|\n)*?>/igm;
// Joi validation: require title, author, email (valid email), feedback, players, difficulty
// userEmail (valid email), platform, shareUserEmail (default false), version (number)
router.post('/feedback', (req, res) => {
  const params = JSON.parse(req.body);
  // strip all HTML tags for protection, then replace newlines with br's
  const title = params.title.replace(HTML_REGEX, '');
  const htmlFeedback = params.feedback.replace(HTML_REGEX, '').replace(/(?:\r\n|\r|\n)/g, '<br/>');
  let shareUserEmail = '';
  if (params.shareUserEmail && params.userEmail) {
    shareUserEmail = `<p>If you'd like to contact them about their feedback, you can reach them at <a href="mailto:${params.userEmail}">${params.userEmail}</a>.</p>`
  }

  const htmlMessage = `<p>${params.author}, some adventurers sent you feedback on <i>${title}</i>. Hooray! Their feedback:</p>
  <p>"${htmlFeedback}"</p>
  <p>They played with ${params.players} adventurers on ${params.difficulty} difficulty on ${params.platform} v${params.version}.</p>
  ${shareUserEmail}
  <p>If you have questions or run into bugs with the Quest Creator, you can reply directly to this email.</p>
  <p>Happy Adventuring!</p>
  <p>Todd & Scott</p>`;
  // for plaintext version, turn end of paragraphs into double newlines
  const textMessage = htmlMessage.replace(/<\/p>/g, '\r\n\r\n').replace(HTML_REGEX, '');

  res.header('Access-Control-Allow-Origin', req.get('origin'));
  Mail.send(params.email, 'Feedback on your Expedition quest: ' + title, textMessage, htmlMessage, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    } else {
      return res.send(result.response);
    }
  });
});


router.post('/quests', (req, res) => {
  try {
    const token = req.params.token;
    if (!res.locals.id) {
      res.header('Access-Control-Allow-Origin', req.get('origin'));
      res.header('Access-Control-Allow-Credentials', 'true');
      return res.send(JSON.stringify([]));
    }

    const params = req.body;
    quests.search(res.locals.id, params, (err, quests, nextToken) => {
      if (err) {
        res.header('Access-Control-Allow-Origin', req.get('origin'));
        res.header('Access-Control-Allow-Credentials', 'true');
        console.log(err);
        return res.status(500).end("Search Error");
      }
      result = {error: err, quests: quests, nextToken: nextToken};
      console.log("Found " + quests.length + " quests for user " + res.locals.id);
      res.header('Access-Control-Allow-Origin', req.get('origin'));
      res.header('Access-Control-Allow-Credentials', 'true');
      res.send(JSON.stringify(result));
    });
  } catch (e) {
    console.log(e);
    return res.status(500).end("Search Error");
  }
});


router.get('/raw/:quest', (req, res) => {
  quests.getById(req.params.quest, (err, entity) => {
    if (err) {
      return res.status(500).end(err.toString());
    }
    res.header('Access-Control-Allow-Origin', req.get('origin'));
    res.header('Content-Type', 'text/xml');
    res.header('Location', entity.url);
    res.status(301).end();
  });
});


router.post('/publish/:quest', (req, res) => {

  if (!res.locals.id) {
    return res.status(500).end("You are not signed in. Please sign in (by refreshing the page) to save your quest.");
  }

  try {
    quests.publish(res.locals.id, req.params.quest, req.body, (err, id) => {
      if (err) {
        throw new Error(err);
      }
      console.log("Published quest " + id);
      res.end(id);
    });
  } catch(e) {
    console.log(e);
    res.status(500).end(e.toString());
  }
});


router.post('/unpublish/:quest', (req, res) => {

  if (!res.locals.id) {
    return res.status(500).end("You are not signed in. Please sign in (by refreshing the page) to save your quest.");
  }

  try {
    quests.unpublish(res.locals.id, req.params.quest, (err, id) => {
      if (err) {
        throw new Error(err);
      }
      console.log("Unpublished quest " + id);
      res.end(id.toString());
    });
  } catch(e) {
    console.log(e);
    res.status(500).end(e.toString());
  }
});


module.exports = router;
