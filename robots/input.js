const readLine = require('readline-sync')
const state = require('./state.js')
const Parser = require('rss-parser')
const imdbScrapper = require('imdb-scrapper')

const TRENDS_URL_GLOBAL = 'https://trends.google.com/trends/trendingsearches/daily/rss'
const TRENDS_URL_BR = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=BR'

async function robot() {
  const content = {
    maximumSentences: 7
  }

  content.language = askAndReturnLanguage()
  content.searchTerm = await askAndReturnSearchTerm()
  content.prefix = askAndReturnPrefix()
  
  state.save(content)

  function askAndReturnLanguage() {
    const language = ['pt','en']
    const selectedLangIndex = readLine.keyInSelect(language,'Choose a language: ')
    const selectedLangText = language[selectedLangIndex]
    
    return selectedLangText
  }

  async function askAndReturnSearchTerm() {
    const response = readLine.question('Type a Wikipedia search term or [G] to fetch Google Trends or [I] to fetch IMDb Trends: ')
    return (response.toUpperCase() === 'G') 
      ? await askAndReturnTrend('google') 
      : (response.toUpperCase() === 'I') 
      ? await askAndReturnTrend('trends')
      : response
  }

  async function askAndReturnTrend(source) {
    console.log('Please Wait...')
    const trends = (source === 'google') ? await getGoogleTrends() : await getImdbTrends()
    const choice = readLine.keyInSelect(trends, 'Choose your trend:')

    return trends[choice] 
  }

  async function getGoogleTrends () {
    const trendsUrl = (content.language === 'en') ? TRENDS_URL_GLOBAL : TRENDS_URL_BR

    const parser = new Parser()
    const trends = await parser.parseURL(trendsUrl)
    return trends.items.map(({title}) => title)
  }

  async function getImdbTrends(how_many = 9) {
    return imdbScrapper
      .getTrending(how_many)
      .then(movies => movies.trending.map(movie => movie.name))
  }

  function askAndReturnPrefix() {
    const prefixesEn = ['Who is', 'What is', 'The history of']
    const prefixesBr = ['Quem é', 'O que é', 'A história de']

    const prefixes = (content.language === 'en') ? prefixesEn : prefixesBr

    const selectedPrefixIndex = readLine.keyInSelect(prefixes, 'Choose one option: ')
    const selectedPrefixText = prefixes[selectedPrefixIndex]

    return selectedPrefixText
  }

}

module.exports = robot