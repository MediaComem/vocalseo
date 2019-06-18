# Personnal assistants 🤖 || Queries builder

## Start
`npm start`

## Documentation
This tool helps to build queries for Google Assistant, Alexa and Siri. The input queries generate audio files for each assistant.

It use Google Text To Speech [client library](https://cloud.google.com/text-to-speech/docs/quickstart-client-libraries) to generate audio files. This needs Google Cloud Platform specific configuration and authentication.

You can add, update or remove *assistants* on `querybuilder.js` file by updating `assistants` array.

You can add, update or remove *Language Code* on on `index.pug` file by updating `languageCode` select tag.

Voices are retrieved with [Google TTS API](https://cloud.google.com/text-to-speech/docs/reference/rest/v1/voices/list).