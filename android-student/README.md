# Dena Student Android preview

This Android application is a small, first-party WebView host for the Dena Student V2 experience. The actual student screens are served by the Figma-aligned Dena student preview at `https://dena-student-demo.onrender.com/student-demo`.

## Launcher icon

The launcher uses the mark-only Dena symbol from the supplied brand mark, with the white rounded app tile shown in Figma's **Dena / Mark Only App Tile** (node `14:39`). The purple and mint colors are preserved; no wordmark or purple square is placed behind the symbol. Android adaptive icons use a vector foreground and white background.

## Build

Debug builds without a configured URL intentionally show a configuration notice. The distributable preview must be built with an approved HTTPS student route:

```sh
gradle -p android-student assembleDebug -PdenaStudentUrl=https://dena-student-demo.onrender.com/student-demo
```

The app requires internet access. It uses synthetic preview data only; it is not a production account or payment app.
