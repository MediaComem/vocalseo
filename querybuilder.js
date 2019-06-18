const fetch = require('node-fetch');
const textToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');
const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const app = express();
const port = 3000;
const { zip } = require('zip-a-folder');
const moment = require('moment');
const CronJob = require('cron').CronJob;

new CronJob('0 */1 * * * *', async function() {
  console.log(moment().format()+' Start CronJob to remove audio files generated');
  await removeFiles('./outputs')
}, null, true, 'Europe/Paris');

const assistants = [{assistant:'Google',ask:'Ok Google,'},{assistant:'Alexa',ask:'Alexa,'},{assistant:'Siri',ask:'Hey Siri,'}];

async function buildQueries(folder,question,voice) {
  // Creates a client
  const client = new textToSpeech.TextToSpeechClient();

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
  await fs.writeFile(folder+'/'+question+'.mp3', response.audioContent, 'binary');
  console.log('Audio content written to file: output-'+question+'.mp3');
  return
}

async function listAvailableVoices(languageCode) {
  const textToSpeech = require('@google-cloud/text-to-speech');
	const client = new textToSpeech.TextToSpeechClient();

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
	const voice = voices[req.body.LanguageName]
	//Create main folder
	const folderName = moment().format('YYYYMMDDhhmmssSS')
	await fs.mkdir(`${outputs}/${folderName}`)
	
	for(const assistant of assistants){
		const subFolderName = assistant.assistant;
		await fs.mkdir(`${outputs}/${folderName}/${subFolderName}`)
		for (const query of queries) {
			await buildQueries(`${outputs}/${folderName}/${subFolderName}`,`${assistant.ask} ${query}`,voice);
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

app.listen(port, () => console.log(`Example app listening on port ${port}!`));