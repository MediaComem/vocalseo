const fetch = require('node-fetch');
const textToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');
const fs = require('fs-extra');
const express = require('express');
const app = express();
const port = 3000;

const brands = ['Rolex','Omega','Cartier'];
const assistants = ['Ok Google,','Alexa,','Hey Siri,'];

const languageCode = 'en-GB';
const languageName = 'en-GB-Wavenet-C';


async function main(question) {
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
  await fs.writeFile('outputs/'+question+'.mp3', response.audioContent, 'binary');
  console.log('Audio content written to file: output-'+question+'.mp3');
}

app.set('views', './views');
app.set('view engine', 'pug');
app.use(express.urlencoded());

app.get('/', function (req, res) {
  res.render('index', {});
})

app.post('/postqueries', function (req, res) {
	const queries = req.body.textQueries.split(';');
	for(const assistant of assistants){
		for (const query of queries) {
			main(assistant+' '+query);
		}
	}
	console.log('Finish')
	res.send({response:'ok'});
})
app.listen(port, () => console.log(`Example app listening on port ${port}!`));