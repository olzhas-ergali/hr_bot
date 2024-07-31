const { google } = require('googleapis');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(express.json());

const TOKEN = '7311671854:AAGU0ULdZ8zldqzLvEEX5hWxuqvlRj72NPU';
const bot = new TelegramBot(TOKEN, { webHook: true });

const webhookUrl = 'https://your-vercel-deploy-url.vercel.app/api/telegram-bot';

// Установка нового вебхука
bot.setWebHook(webhookUrl).then(() => {
  console.log(`Webhook установлен на ${webhookUrl}`);
}).catch(err => {
  console.error('Ошибка при установке webhook:', err);
});

app.post('/api/telegram-bot', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

let users = {};

const greetings = {
  en: "Привет!\nСпасибо за интерес к вакансии Продавца-консультанта в Qazaq Republic!\n\n...",
  kz: "Cәлем!\nQazaq Republic-те сатушы-кеңесші бос орынға қызығушылық танытқаның үшін рахмет!\n\n..."
};

const questions = [
  { id: 'name', text: 'Напиши свой ФИО', kaz: 'Сенің аты-жөнің?', type: 'text' },
  { id: 'phone', text: 'Напиши свой сотовый телефон', kaz: 'Ұялы телефон нөмірің?', type: 'text' },
  { id: 'study', text: 'Ты сейчас учишься?', kaz: 'Сен қазір оқып жүрсің ба?', type: 'boolean', options: ['Да', 'Нет'] },
  { id: 'languages', text: 'Ты свободно владеешь казахским и русским языками?', kaz: 'Қазақ және орыс тілдерінді еркін сөйлейсің ба?', type: 'boolean', options: ['Да', 'Нет'] },
  { id: 'schedule', text: 'Сможешь ли ты работать по графику 5/2 с гибкими выходными, 8 часов в день?', kaz: 'Сен 5/2 графикпен 8 сағат күніне жұмыс істей аласың ба?', type: 'boolean', options: ['Да', 'Нет'] },
  { id: 'reason', text: 'Почему ты хочешь работать в Qazaq Republic?', kaz: 'Неге Qazaq Republic-та жұмыс істегің келеді?', type: 'text' }
];

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = { step: 0, answers: {} };
  bot.sendMessage(chatId, 'Выберите язык / Тілді таңдаңыз:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Қазақша', callback_data: 'kz' }, { text: 'Орысша', callback_data: 'en' }]
      ]
    }
  });
});

bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const language = callbackQuery.data;

  if (greetings[language]) {
    users[chatId].language = language;
    bot.sendMessage(chatId, greetings[language]).then(() => {
      askQuestion(chatId);
    }).catch(error => {
      console.error('Ошибка при отправке приветствия:', error);
    });
  }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const user = users[chatId];

  if (!user || !questions[user.step]) return;

  const question = questions[user.step];

  if (question.type === 'text') {
    user.answers[question.id] = msg.text;
    user.step++;
    if (user.step < questions.length) {
      askQuestion(chatId);
    } else {
      bot.sendMessage(chatId, user.language === 'kz' ? 'Өтінім үшін рахмет! Біз саған жақын арада хабарласып, кері байланыс береміз!' : 'Спасибо за заявку! Мы свяжемся с тобой в ближайшее время и дадим обратную связь!');
      saveToGoogleSheets(user.answers);
    }
  }
});

function askQuestion(chatId) {
  const user = users[chatId];
  if (!user || !questions[user.step]) return;

  const question = questions[user.step];
  const text = user.language === 'kz' ? question.kaz : question.text;

  if (question.type === 'boolean') {
    const options = question.options.map(option => ({ text: option, callback_data: option.toLowerCase() }));
    bot.sendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [options]
      }
    });
  } else if (question.type === 'text') {
    bot.sendMessage(chatId, text);
  }
}

bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const user = users[chatId];
  const question = questions[user.step];

  if (question.type === 'boolean') {
    const answer = callbackQuery.data === 'да' ? 'Да' : 'Нет';
    user.answers[question.id] = answer;
    user.step++;
    
    if (user.step < questions.length) {
      askQuestion(chatId);
    } else {
      bot.sendMessage(chatId, user.language === 'kz' ? 'Өтінім үшін рахмет! Біз саған жақын арада хабарласып, кері байланыс береміз!' : 'Спасибо за заявку! Мы свяжемся с тобой в ближайшее время и дадим обратную связь!');
      saveToGoogleSheets(user.answers);
    }
  }
});

async function saveToGoogleSheets(answers) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = '1rG8iYKVDmchE1IHABrj_-S1AF2aKkIX9nShFIaGB0KQ';

  try {
    const getRows = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:F'
    });

    const numRows = getRows.data.values ? getRows.data.values.length : 0;
    const nextRow = numRows + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Sheet1!A${nextRow}:F${nextRow}`,
      valueInputOption: 'RAW',
      resource: {
        values: [
          [
            answers.name,
            answers.phone,
            answers.study,
            answers.languages,
            answers.schedule,
            answers.reason
          ]
        ]
      }
    });

    console.log('Ответы успешно сохранены в Google Sheets');
  } catch (error) {
    console.error('Ошибка при сохранении в Google Sheets:', error);
  }
}
