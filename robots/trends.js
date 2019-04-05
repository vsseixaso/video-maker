const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function robot() {
  const trends = await fetchAndReturnTrendsOfGoogle()
  
  console.log(trends)
}

async function fetchAndReturnTrendsOfGoogle() {
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments('--headless'))
    .build();

  await driver.get('https://trends.google.com/trends/trendingsearches/daily?geo=BR')
  const list = await driver.findElement(By.xpath("//md-list[@class='md-list-block']"))
  const details = await list.findElements(By.xpath("//div[@class='details']/div[@class='details-top']"))
 
  const searchTerms = []

  await asyncForEach(details, async title => {
    searchTerms.push(await title.getText())
  })

  await driver.close()

  return searchTerms
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

module.exports = robot