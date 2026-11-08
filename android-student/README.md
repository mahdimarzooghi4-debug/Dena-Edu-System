# Dena Student Android preview

This Android application is a small, first-party WebView host for the Dena Student V2 experience. The actual student screens are served by the Figma-aligned Dena student preview at `https://dena-student-demo.onrender.com/student-demo`.

## Launcher icon

The launcher uses the exact transparent PNG supplied by the owner on 2026-11-08 (`dena_user_mark.png`), without redrawing, recoloring, or altering the source image. Both standard and round Android adaptive icons reference the same padded bitmap foreground on the existing white background. The XML inset keeps the mark inside the adaptive icon safe area.

Version 0.1.4 contains this icon; earlier APK files keep their previous icon until rebuilt and reinstalled.

## Build

Debug builds without a configured URL intentionally show a configuration notice. The distributable preview must be built with an approved HTTPS student route:

```sh
gradle -p android-student assembleDebug -PdenaStudentUrl=https://dena-student-demo.onrender.com/student-demo
```

The app requires internet access. It uses synthetic preview data only; it is not a production account or payment app.
