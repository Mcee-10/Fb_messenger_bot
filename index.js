require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Middleware
app.use(bodyParser.json());

// Vérification du webhook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook vérifié avec succès');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
  return res.sendStatus(400);
});

// Gestion des messages entrants
app.post('/webhook', (req, res) => {
  try {
    const body = req.body;

    // Vérifie qu'il s'agit bien d'une requête du webhook
    if (body.object !== 'page') {
      return res.sendStatus(404);
    }

    // Traite chaque entrée (il peut y en avoir plusieurs si batch)
    body.entry.forEach(entry => {
      // Traite chaque événement de messagerie
      entry.messaging.forEach(event => {
        if (event.message) {
          handleMessage(event);
        } else if (event.postback) {
          handlePostback(event);
        }
      });
    });

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Erreur dans le webhook:', error);
    res.sendStatus(500);
  }
});

// Fonction pour gérer les messages
function handleMessage(event) {
  const senderId = event.sender.id;
  const message = event.message;

  console.log(`Message reçu de ${senderId}:`, message);

  // Réponse automatique simple
  if (message.text) {
    sendTextMessage(senderId, `Vous avez dit: "${message.text}"`);
  }
}

// Fonction pour gérer les postbacks
function handlePostback(event) {
  const senderId = event.sender.id;
  const payload = event.postback.payload;

  console.log(`Postback reçu de ${senderId} avec payload: ${payload}`);

  // Vous pouvez ajouter ici la logique pour différents postbacks
  sendTextMessage(senderId, `Action reçue: ${payload}`);
}

// Fonction pour envoyer un message texte
async function sendTextMessage(recipientId, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: { text }
      }
    );
    console.log(`Message envoyé à ${recipientId}: ${text}`);
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error.response?.data || error.message);
  }
}

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
