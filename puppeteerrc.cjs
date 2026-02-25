// ברמת האפליקציה puppeteerrc.cjs

const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // חשוב: לשמור את הדפדפן בתוך הפרויקט כדי שייכנס ל-deploy artifact
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};