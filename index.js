const { google } = require('googleapis');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const axios = require('axios');
const express = require('express');

const bot = new TelegramBot('6741457660:AAFaWvRJX0kj5UK2UggWWXdZBAO2eGC22nw', { polling: true });


let users = {};

const greetings = {
  en: "Привет!\nСпасибо за интерес к вакансии Продавца-консультанта в Qazaq Republic!\n\nДавай расскажу немного о вакансии:\n\nЧто мы ожидаем с кандидата?\n- Знание казахского и русского;\n- Возраст – от 18 лет;\n- Внимание к деталям, пунктуальность, ответственность, стрессоустойчивость, эффективность, лояльность к компании, работа с клиентами и работа в команде.\n\nЧто нужно будет делать?\n- Работа с клиентами;\n- Обслуживание на кассе;\n- Работа на складе.\n\nКакие условия мы предлагаем?\n- Профессиональное развитие (обучение, тренинги, корпоративная библиотека);\n- Карьерный рост;\n- Официальное трудоустройство, отпуск 24 календарных дня;\n- Комфортное рабочее пространство и дружелюбный коллектив;\n- Ежемесячные тимбилдинги с командой;\n- Снэки и скидки для сотрудников;\n- Зарплату в размере 180 000 – 190 000 тенге в месяц (после вычета налогов).\n\nИнтересно?)\n\nОтветь ниже на несколько вопросов, чтобы мы смогли получше узнать тебя…",
  kz: "Cәлем!\nQazaq Republic-те сатушы-кеңесші бос орынға қызығушылық танытқаның үшін рахмет!\n\nЖұмыс туралы қысқаша айтып берейін:\n\nҮміткерден не күтеміз?\n- Қазақ және орыс тілдерін білу;\n- 18 жастан асқан;\n- Егжей-тегжейге назар аудару, ұқыптылық, жауапкершілік, стресске төзімділік, тиімділік, компанияға адалдық, клиенттермен жұмыс және командамен жұмыс істеу қабілеті бар.\n\nНе істеу керек?\n- Клиенттермен жұмыс;\n- Кассада қызмет көрсету;\n- Қоймадағы жұмыс.\n\nБіз қандай шарттарды ұсынамыз?\n- Кәсіби даму (оқыту, тренингтер, корпоративтік кітапхана);\n- Мансаптық өсу;\n- Ресми жұмысқа орналасу, 24 күнтізбелік демалыс күндері;\n- Ыңғайлы жұмыс кеңістігі және достық ұжым;\n- Командамен ай сайынғы тимбилдинг;\n- Қызметкерлерге арналған снэктер мен жеңілдіктер;\n- Жалақы мөлшерінде 180 000 – 190 000 айына теңге (салықтарды шегергеннен кейін).\n\nҚызық па?)\n\nСенімен жақынырақ танысу үшін төмендегі бірнеше сұрақтарға жауап бер…"
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
      range: 'Sheet1!A:A'
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

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const webhookUrl = 'https://hr-bot-five.vercel.app/api/telegram-bot';

bot.setWebHook(webhookUrl);

app.post('/api/telegram-bot', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
