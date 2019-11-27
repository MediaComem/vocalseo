require('dotenv').config();
const tts =  require('@google-cloud/text-to-speech');
const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const app = express();
const { zip } = require('zip-a-folder');
const moment = require('moment');
const CronJob = require('cron').CronJob;

new CronJob('0 0 3 * * *', async function() {
  console.log(moment().format()+' Start CronJob to remove audio files generated');
  await removeFiles('./outputs')
}, null, true, 'Europe/Paris');

const assistants = [{ assistant: 'Nest', ask: 'Hey Google,' }, {assistant:'Google',ask:'Ok Google,'},{assistant:'Alexa',ask:'Alexa,'},{assistant:'Siri',ask:'Hey Siri,'}];

const client = new tts.TextToSpeechClient({
  projectId: 'vocalseo',
  credentials: {
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
  }
});

async function queryBuilder(index,folder,question,voice) {
  // The text to synthesize
  const text = question;

  // Construct the request
  const request = {
    input: {text: text},
    // Select the language and SSML Voice Gender (optional)
    voice: {languageCode: voice.languageCodes[0], languageName: voice.name, ssmlGender: voice.ssmlGender},
    // Select the type of audio encoding
    audioConfig: {audioEncoding: 'MP3'},
  };

  // Performs the Text-to-Speech request
  const [response] = await client.synthesizeSpeech(request);
  // Write the binary audio content to a local file
  await fs.writeFile(folder+'/'+index+'_'+question.replace(/[^A-Z0-9]+/ig, "_").substring(0,255)+'.mp3', response.audioContent, 'binary');
  console.log('Audio content written to file: output-'+question+'.mp3');
  return
}

async function listAvailableVoices(languageCode) {
	const [result] = await client.listVoices({languageCode:languageCode});
	const voices = result.voices;

	return voices
}

app.set('views', './views');
app.set('view engine', 'pug');
app.use(express.urlencoded());
app.use(express.static('outputs'))

app.get('/languages', async function (req, res) {
	const voices = await listAvailableVoices(req.query.lang)
  res.json({voices});
})

app.get('/', function (req, res) {
  res.render('index', {title: 'VocalSEO | Voice generator',assistants: assistants});
})

app.post('/postqueries', async function (req, res) {
	let queries = req.body.textQueries.replace(/\n/g, '').replace(/\r/g, '').split(';');
	console.log(queries)
	queries = queries.filter(function (el) {
  	return el != '';
	});
	console.log(queries)
  const outputs = 'outputs';
  const voices = await listAvailableVoices(req.body.LanguageCode)
  const voice = voices[req.body.VoicesName]
	//Create main folder
	const folderName = moment().format('YYYYMMDDhhmmssSS')
	await fs.mkdir(`${outputs}/${folderName}`)

	for(const assistant of assistants){
		const subFolderName = assistant.assistant;
		await fs.mkdir(`${outputs}/${folderName}/${subFolderName}`)
		for (const [index,query] of queries.entries()) {
			await queryBuilder(index,`${outputs}/${folderName}/${subFolderName}`,`${assistant.ask} ${query}`,voice);
			await zip(`${outputs}/${folderName}`, `${outputs}/${folderName}.zip`);
		}
	}
	console.log(`${outputs}/${folderName}.zip`)
	res.render('download', {title: 'VocalSEO | Download folder', zip:`${folderName}.zip`});
})

const removeFiles = async (directory) => {
  const files = await fs.readdir(directory)
  for (const file of files) {
    const stat = await fs.stat(path.join(directory, file))
    // Do not remove files if they were in the last 10 minutes
    if(file != '.gitignore' && (moment().subtract(10, 'minutes').format('x') > moment(stat.birthtimeMs))){
      await fs.remove(path.join(directory, file))
    }
  }
}

const extendTimeoutMiddleware = (req, res, next) => {
  const space = ' ';
  let isFinished = false;
  let isDataSent = false;

  // Only extend the timeout for API requests
  if (!req.url.includes('/api')) {
    next();
    return;
  }

  res.once('finish', () => {
    isFinished = true;
  });

  res.once('end', () => {
    isFinished = true;
  });

  res.once('close', () => {
    isFinished = true;
  });

  res.on('data', (data) => {
    // Look for something other than our blank space to indicate that real
    // data is now being sent back to the client.
    if (data !== space) {
      isDataSent = true;
    }
  });

  const waitAndSend = () => {
    setTimeout(() => {
      // If the response hasn't finished and hasn't sent any data back....
      if (!isFinished && !isDataSent) {
        // Need to write the status code/headers if they haven't been sent yet.
        if (!res.headersSent) {
          res.writeHead(202);
        }

        res.write(space);

        // Wait another 15 seconds
        waitAndSend();
      }
    }, 15000);
  };

  waitAndSend();
  next();
};

app.use(extendTimeoutMiddleware);

let server_port = process.env.PORT || 3000

removeFiles(`./outputs`);


app.listen(server_port, () => console.log(`Example app listening on port ${server_port}!`));
