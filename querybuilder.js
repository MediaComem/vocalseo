const fetch = require('node-fetch');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');

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
  const writeFile = util.promisify(fs.writeFile);
  await writeFile('outputs/'+question+'.mp3', response.audioContent, 'binary');
  console.log('Audio content written to file: output-'+question+'.mp3');
}

const questionsBuilder = (brands) =>{
	let questions = [];
	brands.forEach((brand) => {
		questions.push(`Can I buy a ${brand} watch online ?`);
		questions.push(`Should I buy a, ${brand} ,watch?`);
		questions.push(`${brand} watch boutique in Lausanne ?`)
		questions.push(`Where is the ${brand} watch boutique in New-York city ?`)
	})
	return questions
}

const questions = questionsBuilder(brands);

assistants.forEach((assistant) => {
	questions.forEach((question) => {
		main(assistant+' '+question);
	})
})