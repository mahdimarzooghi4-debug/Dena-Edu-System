#!/usr/bin/env bash
set -euo pipefail
api="${1:?Android API level is required}"
[[ "$api" =~ ^(28|35)$ ]]
apk="${DENA_SMOKE_APK:-android-student/app/build/outputs/apk/debug/app-debug.apk}"
package=ir.dena.student.debug
window="${RUNNER_TEMP:-/tmp}/dena-window-api${api}.xml"
cleanup() {
  adb shell screencap -p "/sdcard/dena-api${api}.png" >/dev/null 2>&1 || true
  adb pull "/sdcard/dena-api${api}.png" "dena-android-api${api}.png" >/dev/null 2>&1 || true
  adb logcat -d -s AndroidRuntime:E chromium:E > "dena-android-api${api}-runtime.log" 2>&1 || true
}
trap cleanup EXIT
adb logcat -c
# Avoid the streamed-install stall observed on the API 28 runner.
timeout 180 adb install --no-streaming -r "$apk"
adb shell am start -W -n "$package/ir.dena.student.MainActivity"
rendered=false
for attempt in $(seq 1 18); do
  adb shell pidof "$package" >/dev/null
  if timeout 20 adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 &&
     adb pull /sdcard/window.xml "$window" >/dev/null 2>&1 &&
     grep -Fq 'سلام محمد' "$window"; then
    rendered=true
    break
  fi
  sleep 5
done
if [ "$rendered" != true ]; then
  test ! -f "$window" || cat "$window"
  echo "Dena student home did not render on Android API $api"
  exit 1
fi
adb shell dumpsys activity activities | grep -F "$package"
log="${RUNNER_TEMP:-/tmp}/dena-api${api}-runtime.log"
adb logcat -d -s AndroidRuntime:E > "$log"
if grep -Fq "$package" "$log"; then
  cat "$log"
  exit 1
fi
echo "Dena student home rendered on Android API $api"
