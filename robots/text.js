const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey
const sentenceBoundaryDetection = require('sbd')

const watsonApiKey = require('../credentials/watson-nlu.json').apikey
const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js')
 
const nlu = new NaturalLanguageUnderstandingV1({
  iam_apikey: watsonApiKey,
  version: '2018-04-05',
  url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
});

const state = require('./state.js')

async function robot() {
  const content = state.load()

  await fetchContentFromWikipedia(content)
  sanitizeContent(content)
  breakContentIntoSentences(content)
  limitMaximumSentences(content)
  await fetchKeywordsOfAllSentences(content)

  state.save(content)

  async function fetchContentFromWikipedia(content) {
    const algorithmiaAutenticated = algorithmia(algorithmiaApiKey)
    const wikipediaAlgorithm = algorithmiaAutenticated.algo('web/WikipediaParser/0.1.2')
    const wikipediaResponse = await wikipediaAlgorithm.pipe({
      "lang": content.language,
      "articleName": content.searchTerm
    })
    const wikipediaContent = wikipediaResponse.get()
    
    content.sourceContentOriginal = wikipediaContent.content
  }

  function sanitizeContent(content) {
    const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal)
    const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown)

    content.sourceContentSanitized = withoutDatesInParentheses
  }

  function removeBlankLinesAndMarkdown(text) {
    const allLines = text.split('\n')

    const withoutBlankLinesAndMarkdown = allLines.filter(
      line => line.trim() && !line.trim().startsWith('=')
    )

    return withoutBlankLinesAndMarkdown.join(' ')
  }

  function removeDatesInParentheses(text) {
    return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g,' ')
  }

  async function breakContentIntoSentences(content) {
    content.sentences = []

    const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)
    sentences.forEach(sentence => {
      content.sentences.push({
        text: sentence,	
        keywords: [],	
        images: []
      })
    })
  }

  function limitMaximumSentences(content) {
    content.sentences = content.sentences.slice(0, content.maximumSentences)
  }

  async function fetchKeywordsOfAllSentences(content) {
    const listOfKeywordsToFetch = []

    for (const sentence of content.sentences) {
      listOfKeywordsToFetch.push(
        fetchWatsonAndReturnKeywords(sentence)
      )
    }

    await Promise.all(listOfKeywordsToFetch)
  }

  async function fetchWatsonAndReturnKeywords(sentence) {
    return new Promise((resolve, reject) => {
      nlu.analyze({
        text: sentence.text,
        features: {
          keywords: {}
        }
      }, (error, response) => {
        if (error) {
          reject(error)
          return
        }
  
        const keywords = response.keywords.map((keyword) => {
          return keyword.text
        })
  
        sentence.keywords = keywords

        resolve(keywords)
      })
    })
  }
}

module.exports = robot