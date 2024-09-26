const puppeteer = require('puppeteer-extra');
const anonymizePlugin = require('puppeteer-extra-plugin-anonymize-ua');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');

// Adding plugins
puppeteer.use(anonymizePlugin());
puppeteer.use(stealthPlugin());

async function getBrowser() {
  let executablePath = '/usr/bin/chromium-browser';
  let args = [
    "--incognito",
    "--no-sandbox",
    "--disable-gpu"
  ];
  
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args
  });

  return browser;
}

async function getNewPage(method) {
  const browser = await getBrowser();
  const [page] = await browser.pages();
  
  return page;
}

module.exports = { getBrowser, getNewPage };