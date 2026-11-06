# Dena Student — Android app

This is a **native Android APK container** for the existing Dena Student Next.js application.
It does not duplicate courses, exams, authorization, profiles, or entitlements.
The Android app hosts the same-origin Dena student pages using an Android WebView.
The backend and a reachable HTTPS domain are **required** for live functionality.

## What is implemented

- Java-based Android Activity and Android Studio / Gradle project (Android 8+).
- Same-origin HTTPS navigation, JavaScript and first-party cookies for the existing web app.
- Reject HTTP, mixed content, SSL errors, local files, third-party cookies and injected JS bridges.
- No SMS, payment, camera, microphone, file-system, location or notification permissions.
- Generic connection-error/retry UI; Android hardware back support.
- Unit tests for URL configuration and origin isolation.
- GitHub Actions that compile an unsigned **debug APK** and upload a build artifact.

## Build an APK

Install Android Studio / Android SDK platform 35, JDK 17 and Gradle 8.11.1.
From this repository:

```sh
gradle -p android-student testDebugUnitTest assembleDebug
```

The APK is at `android-student/app/build/outputs/apk/debug/app-debug.apk`.

When a dedicated HTTPS Dena Stage instance is available, build with its approved
exact URL (for instance the **format** `https://stage.edu-example.org/student/demo`
is illustrative, not a known deployed Dena server):

```sh
gradle -p android-student -PdenaStudentUrl="https://<approved-domain>/student/demo" testDebugUnitTest assembleDebug
```

**Without** `denaStudentUrl`, the debug APK is installable but displays a
configuration-required screen rather than suggesting any successful backend
connection. For release builds the URL is mandatory. Do not point release
builds at the synthetic demo route or enable the demo on Production.

The Next.js server is responsible for authenticating users, serving course
data and authorizing every operation. Demo screens require `DENA_DEMO_MODE`
and the server-side demo signing key in an isolated environment. Real student
routes continue to require real sessions, PostgreSQL and role checks.

## Product and release boundaries

The app is Android only; **no iOS project or installer**. It is not an
offline-learning engine, Play Store package, final signed release or standalone
native reimplementation of Dena's educational screens. It must be manually
tested on an Android device and connected to an independently approved HTTPS
Stage server before any rollout. The debug APK is signed by Android's ephemeral
debug key, which must never be used for a production release. A proper release
keystore and signing process are deliberately not supplied or invented.

The icon uses the Dena color and a simple book glyph until the approved,
raster/vector Android launcher icon is made available in buildable form.

## Existing synthetic Render showcase APK

A separate already-live Dena Render service exists at
`https://dena-student-demo.onrender.com`. Its deployed branch is
`demo/student-app-showcase` (November 4), with a versioned
`/student-demo` route using synthetic student data. The CI builds a
**showcase debug APK** pinned to this explicit endpoint. This permits
a useful online demo without SMS, payments, real student accounts or
deploying PR #45 or #46. It is **not** the newer signed-cookie demo
API or operational student backend on the newer PR branch. The service
was reported `live` in Render; independent end-to-end Android
reachability and real-device interaction still require validation.

To rebuild the current showcase target explicitly:

```sh
gradle -p android-student -PdenaStudentUrl="https://dena-student-demo.onrender.com/student-demo" testDebugUnitTest assembleDebug
```

To target the newer official student route instead, substitute the
independently approved HTTPS server URL containing `/student`.
