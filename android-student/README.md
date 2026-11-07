# Dena Student Android Preview

The Android launcher icon follows the approved Dena mark-only app tile in the Dena Figma file:
- Figma file: `8Bo8BNS5LVQfTJhxwCYQmo`
- Logo mark: `03A.H / Hybrid Ridge-D Mark`, node `17:7`
- App tile: `Dena / Mark Only App Tile`, node `14:39`
- Student app design page: `03 - Student App V2`

The Activity is intentionally a thin host. It must not add a native title bar or duplicate navigation; the first-party student web app owns the Figma-aligned header, bottom navigation and screens.

The preview APK opens `https://dena-student-demo.onrender.com/student-demo`. This is a synthetic showcase and requires internet access. It is not a production APK and does not connect to real student accounts.

CI runs unit tests, checks the preview route, installs and launches the APK on Android API 28 and API 35 emulators, and verifies that the student home screen is rendered without a process crash.
