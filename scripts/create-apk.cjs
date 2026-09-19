const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
if (args[0] === 'apk') args.shift();
if (args.some((arg) => arg !== '--check')) {
  console.error('Usage: npm run create:apk [-- --check] or npm run create -- apk');
  process.exit(1);
}
const native = pkg.scripts?.['build:apk'] && fs.existsSync(path.join(root, 'android', 'gradlew'));
const sdk = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Android/sdk' : 'Android/Sdk')].find((value) => value && fs.existsSync(value));
const env = { ...process.env, ...(sdk ? { ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk } : {}) };
function run(command, params, options = {}) {
  const result = spawnSync(command, params, { cwd: root, env, stdio: 'inherit', ...options });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || command + ' failed (exit ' + result.status + ')');
}
try {
  if (!fs.existsSync(path.join(root, 'node_modules'))) throw new Error('Install this project’s dependencies first: npm ci (or its existing package-manager install command).');
  if (!sdk) throw new Error('Android SDK not found. Install Android Studio, then set ANDROID_HOME.');
  run('java', ['-version']);
  if (!native) {
    if (!fs.existsSync(path.join(root, 'eas.json'))) throw new Error('Missing eas.json. See APK-BUILD.md.');
    run('eas', ['--version']);
  }
  if (args.includes('--check')) { console.log('Local tools found. Signing/project access is validated when building.'); process.exit(0); }
  const outputDir = path.join(root, 'build');
  fs.mkdirSync(outputDir, { recursive: true });
  const name = pkg.name.replace(/[^a-z0-9-]/gi, '-');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifact = path.join(outputDir, name + '-' + pkg.version + '-' + stamp + '.apk');
  if (native) {
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:apk']);
    fs.copyFileSync(path.join(root, 'android/app/build/outputs/apk/release/app-release.apk'), artifact);
  } else {
    run('eas', ['build', '--platform', 'android', '--profile', 'apk', '--local', '--non-interactive', '--output', artifact]);
  }
  const data = fs.readFileSync(artifact);
  if (data.length < 1024 || data.readUInt32LE(0) !== 0x04034b50) throw new Error('Build did not produce a valid APK archive.');
  const latest = path.join(outputDir, name + '-latest.apk');
  fs.copyFileSync(artifact, latest);
  fs.writeFileSync(path.join(outputDir, 'latest-build.json'), JSON.stringify({
    project: pkg.name, createdAt: new Date().toISOString(), artifact: path.basename(artifact),
    latest: path.basename(latest), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'),
    method: native ? 'existing native release build' : 'EAS local apk profile',
  }, null, 2) + '\n');
  console.log('\nAPK ready: ' + latest + '\nArchived build: ' + artifact);
} catch (error) { console.error('\nAPK build failed: ' + error.message); process.exit(1); }
