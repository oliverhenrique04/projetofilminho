const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('cordova notification config is wired for android build', () => {
  const configXml = fs.readFileSync(path.join(__dirname, '../cordova/config.xml'), 'utf-8');
  const cordovaPackage = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../cordova/package.json'), 'utf-8')
  );
  const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf-8');

  assert.match(configXml, /widget id="br\.com\.filminho\.app"/);
  assert.match(configXml, /cordova-plugin-local-notification/);
  assert.match(configXml, /POST_NOTIFICATIONS/);

  assert.equal(cordovaPackage.name, 'br.com.filminho.app');
  assert.ok(cordovaPackage.devDependencies['cordova-plugin-local-notification']);
  assert.ok(cordovaPackage.cordova.plugins['cordova-plugin-local-notification']);

  assert.match(readme, /br\.com\.filminho\.app/);
  assert.match(readme, /google-services\.json/);
  assert.match(readme, /build-cordova-android/);
});
