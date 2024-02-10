
const TelegramBot = require('node-telegram-bot-api');
const igdl = require("@sasmeee/igdl");
const chalk = require('chalk')
const path = require("path")
const fs = require('fs')
const axios = require('axios')
const getFBInfo = require("@xaviabot/fb-downloader");
const { TiktokDL } = require("@tobyg74/tiktok-api-dl")
const ytdl = require('ytdl-core')
const bot = new TelegramBot('6564925885:AAHWKiO7oBsMf9SAJXw1X9zI3yWmO70zvHE', { polling: true });
const commands = [
  { command: 'start', description: 'Start the bot' },
  { command: 'help', description: 'Help Bot' },
];
bot.setMyCommands(commands);
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Hello! Welcome to musanto lite budget, type /help to get started');
});
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Musanto adalah bot downloader yang diciptakan @aisbirkoenz dan sedang dalam beta version

Kamu cukup mengirim url video yang ingin kamu download maka akan kami proses secara otomatis`);
})
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text && msg.text.match(/https?:\/\/(?:www\.)?instagram\.com\/reel\S+/)) {
    bot.sendMessage(chatId, '⌛ Downloading Instagram content. Please wait...');
    
    try {
        const down = await igdl(msg.text);

        if (down.length > 0) {
            const firstObject = down[0];
            const downloadLink = firstObject.download_link;

            const videoStream = await axios.get(downloadLink, { responseType: 'stream' });

            if (videoStream.data) {
                bot.sendVideo(chatId, videoStream.data);
            } else {
                bot.sendMessage(chatId, "Video not found");
            }
        } else {
            bot.sendMessage(chatId, "No downloadable content found");
        }
    } catch (error) {
        console.error("Error:", error);
        bot.sendMessage(chatId, "An error occurred while downloading the content");
    }
}


  else if (msg.text && msg.text.match(/https?:\/\/(?:www\.)?instagram\.com\/p\S+/)) {
    bot.sendMessage(chatId, '⌛ Downloading Instagram content. Please wait...');

    try {
        const response = await axios.get(`https://dnmapi.cyclic.app/api/instagram?url=${msg.text}`);
        if (response.status === 200) {
            const results = response.data;
            
            for (const key in results) {
                if (results.hasOwnProperty(key)) {
                    const post = results[key];
                    const photoUrl = post.url;
                    const counting = Number(key) + 1;
                    setTimeout(() => {
                        bot.sendPhoto(chatId, photoUrl, { caption: `Instagram post: ${counting}_${getCurrentDate()}`}).catch(() => {
                          return false;
                        })
                    }, key * 1000);
                }
            }
        } else {
            bot.sendMessage(chatId, 'Something went wrong');
        }
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'An error occurred while processing the request.');
    }
}
else if (msg.text && msg.text.match(/^.*https:\/\/(?:m|www|vm|vt)?\.?tiktok\.com\/((?:.*\b(?:(?:usr|v|embed|user|video)\/|\?shareId=|\&item_id=)(\d+))|\w+)/)) {
  bot.sendMessage(chatId, '⌛ Downloading Tiktok content. Please wait...');

  try {
      const response = await TiktokDL(msg.text, {
        version: "v1"
      })
     if (response.status === "success") {
        const results = response.result.video[0];
        const videoStream = await axios.get(results, { responseType: 'stream' });
        bot.sendVideo(chatId, videoStream.data, { caption: `Title: ${response.result.music.title}\nAuthor: ${response.result.music.author}`});

      } else {
          bot.sendMessage(chatId, 'Something went wrong');
      }
  } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, 'An error occurred while processing the request.');
  }
}

else if (msg.text && msg.text.match(/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|live\/|v\/)?)([\w\-]+)(\S+)?$/)) {
  bot.sendMessage(chatId, '*Youtube Url Detected*', { parse_mode: "Markdown"}).then((data) => {
    bot.deleteMessage(chatId, data.message_id)
    const keyboard = {
      inline_keyboard: [
          [{ text: 'MP3', callback_data: `yt_mp3_${msg.text}` }, { text: 'MP4', callback_data: `yt_mp4_${msg.text}` }]
      ]
  };
    bot.sendMessage(chatId, "Select Your Option\n*Mp3 / Mp4*", {parse_mode: "Markdown", reply_markup: JSON.stringify(keyboard)})
  })
  
}

else if (msg.text && msg.text.match(/(?:(?:http|https):\/\/)?(?:www.)?facebook.com\/(?:(?:\w)*#!\/)?(?:pages\/)?(?:[?\w\-]*\/)?(?:profile.php\?id=(?=\d.*))?([\w\-]*)?/) || msg.text.match(/(?:(?:http|https):\/\/)?(?:www.)?fb.watch\/*/)) {
  bot.sendMessage(chatId, '⌛ Downloading Facebook content. Please wait...');
  try {
    const result = await getFBInfo(msg.text);

    if(result.title) {
    const videoStreamUrl = result.hd ? result.hd : result.sd;
    
    const videoStream = await axios.get(videoStreamUrl, { responseType: 'stream' });
    
    bot.sendVideo(chatId, videoStream.data);
    }
    else {
      bot.sendMessage(chatId, "Failed to get video data!")
    }
} catch (error) {
    console.log("Error:", error);
}
}
});

bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  if (data.startsWith('yt_mp3_')) {
    bot.deleteMessage(chatId, messageId);
      const option = data.replace('yt_mp3_', '');
      await bot.sendMessage(chatId, `MP3 Option Selected, Please Wait...`);

      try {
        const videoInfo = await ytdl.getInfo(option);
        const videoTitle = videoInfo.videoDetails.title;
        const videoPath = path.join(__dirname, 'temp', `${videoTitle}.mp3`);
  
        const videoStream = ytdl(option, { filter: "audioonly", format: "MP3" });
        const writeStream = fs.createWriteStream(videoPath);
  
        videoStream.pipe(writeStream);
  
        writeStream.on('finish', async() => {
          bot.sendMessage(chatId, "Download Server Berhasil! sedang menuju mengirim file...")
          const opsi = {
            filename: videoTitle+".mp3",
            contentType: 'audio/mpeg',
          };
       bot.sendAudio(chatId, fs.readFileSync(videoPath), { caption: videoTitle}, opsi).then(() => {
        fs.unlinkSync(videoPath);
       }).catch(() => {
        bot.sendMessage(chatId, "Error: File Bigger")
       })
        });
  
      } catch (error) {
        console.error('Error downloading or sending video:', error);
        bot.sendMessage(chatId, 'Error processing the video. Please try again.');
      }
  } else if (data.startsWith('yt_mp4_')) {
    bot.deleteMessage(chatId, messageId);
    const option = data.replace('yt_mp4_', '');
    await bot.sendMessage(chatId, `MP4 Option Selected, Please Wait...`);

    try {
      const videoInfo = await ytdl.getInfo(option);
      const videoTitle = videoInfo.videoDetails.title;
      const videoPath = path.join(__dirname, 'temp', `${videoTitle}.mp4`);

      const videoStream = ytdl(option, { filter: "audioandvideo", format: "MP4", quality: "highestvideo" });
      const writeStream = fs.createWriteStream(videoPath);

      videoStream.pipe(writeStream);

      writeStream.on('finish', async() => {
        bot.sendMessage(chatId, "Download Berhasil! Sedang mengirim file ke tujuan...")
        const opsi = {
          filename: videoTitle+".mp4",
          contentType: 'video/mp4',
        };
     bot.sendVideo(chatId, fs.readFileSync(videoPath), { caption: videoTitle }, opsi).then(() => {
      fs.unlinkSync(videoPath);
     })
     .catch(() => {
      bot.sendMessage(chatId, "Error: FIle Bigger")
     })
      })

    } catch (error) {
      console.error('Error downloading or sending video:', error);
    }

  }
});
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const formatDate = (date) => {
      const options = {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
    
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(date);
    
      const formattedDate = parts
        .map((part) => (part.type === 'literal' ? part.value : part.value.padStart(2, '0')))
        .join('');
    
      return formattedDate;
    };
    
    const now = new Date();
    const formattedDateTime = formatDate(now);
    console.log(chalk.black.bgWhite(" [CMD] ")+' '+ chalk.bgGreen.black(formattedDateTime+ ' ')+ ' ' + chalk.bgBlue(messageText) +chalk.magenta('\n=> From ') + chalk.yellow(msg.from.username + " - "+  chatId) + '\n');// idk
})

console.log('Bot is running...\n');
