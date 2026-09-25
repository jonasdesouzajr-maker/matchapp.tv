#!/usr/bin/env bash
# Screenshots and crash checks of the actual repository APKs inside an Android
# emulator. This is NOT a claim of testing a physical phone or Play-signed AAB.
set -euo pipefail
mkdir -p artifacts/android-emulator
adb wait-for-device
adb shell logcat -c || true
# Pixel Launcher can ANR on freshly booted shared runners; dismiss a SYSTEM
# dialog before grading MatchApp visuals. Never treat a blocked screenshot as pass.
dismiss_launcher_anr() {
  local label="$1" tmp="artifacts/android-emulator/${1}-dialog-check.xml" n=0
  for n in 1 2; do
    timeout 15s adb shell uiautomator dump /sdcard/matchapp-dialog-check.xml >/dev/null 2>&1 || true
    timeout 10s adb pull /sdcard/matchapp-dialog-check.xml "$tmp" >/dev/null 2>&1 || true
    if ! grep -qiE 'Launcher isn.t responding|Launcher is not responding' "$tmp" 2>/dev/null; then return 0; fi
    echo "Emulator system launcher ANR detected, dismissing its dialog (attempt $n)"
    local coords
    coords=$(python3 - "$tmp" <<'PY'
import re,sys
text=open(sys.argv[1],encoding='utf-8').read()
m=re.search(r'text="Close app"[^>]*bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]"',text)
if m:
 x1,y1,x2,y2=map(int,m.groups());print((x1+x2)//2,(y1+y2)//2)
PY
)
    if [ -n "$coords" ]; then adb shell input tap $coords; else adb shell input keyevent BACK; fi
    sleep 6
  done
  timeout 15s adb shell uiautomator dump /sdcard/matchapp-dialog-check.xml >/dev/null 2>&1 || true
  timeout 10s adb pull /sdcard/matchapp-dialog-check.xml "$tmp" >/dev/null 2>&1 || true
  if grep -qiE 'Launcher isn.t responding|Launcher is not responding' "$tmp" 2>/dev/null; then
    echo "::error::Emulator launcher remains unresponsive; native UI cannot be visually certified";return 1
  fi
}
dismiss_launcher_anr 'boot'
probe() {
  local name="$1" pkg="$2" apk="$3" activity="$4"
  echo "TEST native $name APK: $pkg"
  adb install -r "$apk"
  adb shell am force-stop "$pkg" || true
  # Launch the tested Activity explicitly. The Pixel launcher/monkey route is
  # runner-dependent and previously returned to Launcher even while the APK
  # itself was valid, producing a false foreground-window failure.
  launch="$(timeout 30s adb shell am start -W -n "$pkg/$activity" 2>&1 || true)"
  printf '%s\n' "$launch" >"artifacts/android-emulator/$name-launch.txt"
  if ! grep -Eq 'Status: ok|ThisTime:|TotalTime:' <<< "$launch"; then
    echo "::error::$name Activity did not report a successful explicit launch."
    return 1
  fi
  sleep 22
  dismiss_launcher_anr "$name"
  # Validate the actually rendered root package. Newer emulator images can
  # return an empty mCurrentFocus/mFocusedApp even while our Activity is plainly
  # foreground, which made the previous dumpsys check a false negative.
  timeout 15s adb shell uiautomator dump "/sdcard/$name-window.xml" >/dev/null 2>&1 || true
  timeout 10s adb pull "/sdcard/$name-window.xml" "artifacts/android-emulator/$name-window.xml" >/dev/null 2>&1 || true
  if ! grep -Fq "package=\"$pkg\"" "artifacts/android-emulator/$name-window.xml" 2>/dev/null; then
    echo "::error::$name rendered hierarchy is not owned by the tested package."
    return 1
  fi
  # A freshly booted shared emulator can report no active network during the
  # Activity's first millisecond and legitimately show MatchApp's offline view.
  # Give Android connectivity time to settle, then use the real Retry control
  # once before deciding that the production WebView could not be exercised.
  if grep -qiE "You.?re offline|You are offline" "artifacts/android-emulator/$name-window.xml" 2>/dev/null; then
    echo "$name opened MatchApp's offline recovery view; retrying once after connectivity settles."
    sleep 8
    coords=$(python3 - "artifacts/android-emulator/$name-window.xml" "$pkg" <<'PY'
import re,sys
text=open(sys.argv[1],encoding='utf-8').read()
pkg=re.escape(sys.argv[2])
m=re.search(r'resource-id="'+pkg+r':id/retry"[^>]*bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]"',text)
if m:
 x1,y1,x2,y2=map(int,m.groups());print((x1+x2)//2,(y1+y2)//2)
PY
)
    if [ -n "$coords" ]; then adb shell input tap $coords; fi
    sleep 16
    timeout 15s adb shell uiautomator dump "/sdcard/$name-window.xml" >/dev/null 2>&1 || true
    timeout 10s adb pull "/sdcard/$name-window.xml" "artifacts/android-emulator/$name-window.xml" >/dev/null 2>&1 || true
    if ! grep -Fq "package=\"$pkg\"" "artifacts/android-emulator/$name-window.xml" 2>/dev/null; then
      echo "::error::$name left the tested Activity during network recovery."
      return 1
    fi
  fi
  if ! adb shell pidof "$pkg" >/dev/null; then
    echo "::error::$name native app crashed or failed to start"
    adb logcat -d -v brief -t 650 >"artifacts/android-emulator/$name-crash.log"
    return 1
  fi
  adb exec-out screencap -p >"artifacts/android-emulator/$name-first-screen.png"
  test "$(stat -c%s "artifacts/android-emulator/$name-first-screen.png")" -gt 6000
  # Android accessibility hierarchy above is retained for manual visual crosscheck.
  # A full swipe should not crash WebView or freeze the owning process.
  adb shell input swipe 450 1500 450 350 650
  sleep 4
  dismiss_launcher_anr "$name-after-swipe"
  adb shell pidof "$pkg" >/dev/null
  adb exec-out screencap -p >"artifacts/android-emulator/$name-after-scroll.png"
  test "$(stat -c%s "artifacts/android-emulator/$name-after-scroll.png")" -gt 6000
  echo "PASS $name starts, remains alive after WebView load and swipe; screenshots captured."
}
probe "adult" "com.jonas.papercup.debug" "android-studio/app/build/outputs/apk/debug/app-debug.apk" "com.jonas.papercup.MainActivity"
adb shell am force-stop com.jonas.papercup.debug || true
probe "kids" "tv.matchapp.kids.debug" "android-studio/kidsapp/build/outputs/apk/debug/kidsapp-debug.apk" "tv.matchapp.kids.MainActivity"
adb shell am force-stop tv.matchapp.kids.debug || true
adb logcat -d -v brief -t 2500 >artifacts/android-emulator/device-last-log.txt || true
if grep -E 'FATAL EXCEPTION|Process: (com\.jonas\.papercup|tv\.matchapp\.kids)([ .]|$)' artifacts/android-emulator/device-last-log.txt |
   grep -Eq 'FATAL EXCEPTION|Process: (com\.jonas\.papercup|tv\.matchapp\.kids)'; then
  echo "::warning::Inspect device-last-log.txt: a native crash-like message was seen."
fi
echo "Android emulator smoke complete (physical handset still unverified)."
