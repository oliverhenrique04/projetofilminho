const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('cordova notification config is wired for android build', () => {
  const configXml = fs.readFileSync(path.join(__dirname, '../cordova/config.xml'), 'utf-8');
  const cordovaPackage = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../cordova/package.json'), 'utf-8')
  );
  const googleServicesPath = path.join(__dirname, '../cordova/google-services.json');
  const buildExtrasPath = path.join(__dirname, '../cordova/build-extras.gradle');
  const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf-8');

  assert.match(configXml, /widget id="br\.com\.filminho\.app"/);
  assert.match(configXml, /cordova-plugin-local-notification/);
  assert.match(configXml, /POST_NOTIFICATIONS/);
  assert.match(configXml, /preference name="GradlePluginGoogleServicesEnabled" value="true"/);
  assert.match(configXml, /preference name="GradlePluginGoogleServicesVersion" value="4\.4\.4"/);
  assert.match(configXml, /preference name="AndroidFirebaseBomVersion" value="34\.14\.0"/);
  assert.match(configXml, /resource-file src="google-services\.json" target="app\/google-services\.json"/);

  assert.equal(cordovaPackage.name, 'br.com.filminho.app');
  assert.ok(cordovaPackage.devDependencies['cordova-plugin-local-notification']);
  assert.equal(cordovaPackage.dependencies['cordova-plugin-firebase-messaging'], '8.0.1');
  assert.ok(cordovaPackage.cordova.plugins['cordova-plugin-firebase-messaging']);
  assert.equal(
    cordovaPackage.cordova.plugins['cordova-plugin-firebase-messaging'].ANDROID_FIREBASE_BOM_VERSION,
    '34.14.0'
  );
  assert.ok(cordovaPackage.cordova.plugins['cordova-plugin-local-notification']);

  assert.ok(fs.existsSync(googleServicesPath));
  const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf-8'));
  assert.equal(googleServices.project_info.project_id, 'filminho-4dadc');
  assert.equal(googleServices.client[0].client_info.android_client_info.package_name, 'br.com.filminho.app');

  assert.ok(fs.existsSync(buildExtrasPath));
  const buildExtras = fs.readFileSync(buildExtrasPath, 'utf-8');
  assert.match(buildExtras, /firebase-bom:34\.14\.0/);
  assert.match(buildExtras, /com\.google\.firebase:firebase-analytics/);
  assert.match(buildExtras, /androidx\.localbroadcastmanager:localbroadcastmanager:1\.1\.0/);

  assert.match(readme, /br\.com\.filminho\.app/);
  assert.match(readme, /google-services\.json/);
  assert.match(readme, /build-cordova-android/);
});
