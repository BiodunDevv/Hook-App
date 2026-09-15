# Android APK builds — hook

Run from this project folder:

```sh
npm run create:apk
# Equivalent:
npm run create -- apk
# Check local prerequisites without creating a build:
npm run create:apk -- --check
```

The APK is saved in `build/hook-latest.apk`. Each successful build also
keeps a timestamped APK and `build/latest-build.json` with its SHA-256 checksum.
Failed builds never replace the last successful APK. Output is for Android only.

## Requirements

- Install this project's dependencies using its existing lockfile/package manager.
- Node matching this Expo SDK, Java 17, Android Studio SDK/NDK, and EAS CLI
  (`npm install -g eas-cli`) for EAS projects.
- EAS projects: `eas login`, link the correct existing project with `eas init`
  if needed, and configure the existing Android signing key with
  `eas credentials --platform android`. Do not replace a store application's key.
- The script uses the `apk` EAS profile locally, not a paid cloud build. Projects
  with an existing native `build:apk` command retain that native build workflow.
- Confirm public API URLs point to a backend reachable from the phone (not
  localhost). Local EAS builds do not automatically supply EAS secret variables;
  configure required local variables without putting secrets in client code.

## Install and troubleshoot

Copy the latest APK to an Android phone and allow installation from that source,
or use `adb install -r build/hook-latest.apk` with an authorised device.
An APK signed with a different key cannot update an existing installation.
Google Play uploads normally use a production AAB, not this APK command.

Missing signing/project access requires EAS setup above. Native/Metro compilation
errors must be resolved in the affected project; the script reports failure and
does not label an older APK as a new build. Nothing is uploaded to app stores.

See the Desktop index: [All mobile projects](</Users/biodundev/Desktop/MOBILE-APK-BUILDS.md>).
