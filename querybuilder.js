const fetch = require('node-fetch');
const textToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');
const fs = require('fs-extra');
const express = require('express');
const app = express();
const port = 3000;
const { zip } = require('zip-a-folder');
const moment = require('moment');

const brands = ['Rolex','Omega','Cartier'];
const assistants = ['Ok Google,','Alexa,','Hey Siri,'];

const languageCode = 'en-GB';
const languageName = 'en-GB-Wavenet-C';


async function buildQueries(folder,question) {
  // Creates a client
  const client = new textToSpeech.TextToSpeechClient();

  // The text to synthesize
  const text = question;

  // Construct the request
  const request = {
    input: {text: text},
    // Select the language and SSML Voice Gender (optional)
    voice: {languageCode: languageCode, languageName: languageName, ssmlGender: 'FEMALE'},
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

app.set('views', './views');
app.set('view engine', 'pug');
app.use(express.urlencoded());

app.get('/', function (req, res) {
  res.render('index', {});
})

app.post('/postqueries', async function (req, res) {
	const queries = req.body.textQueries.split(';');
	const outputs = 'outputs';
	//Create main folder
	const folderName = moment().format('YYYYMMDDhhmmssSS')
	await fs.mkdir(`${outputs}/${folderName}`)
	
	for(const assistant of assistants){
		const subFolderName = assistant;
		await fs.mkdir(`${outputs}/${folderName}/${subFolderName}`)
		for (const query of queries) {
			await buildQueries(`${outputs}/${folderName}/${subFolderName}`,assistant+' '+query);
			await zip(`${outputs}/${folderName}`, `${outputs}/${folderName}.zip`);
		}
	}
	console.log(`${outputs}/${folderName}.zip`)
	res.send({response:`${outputs}/${folderName}.zip`});
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`));