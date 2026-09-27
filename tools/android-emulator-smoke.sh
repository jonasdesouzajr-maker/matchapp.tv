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
# Keep diagnostic evidence whenever the hosted emulator drops ADB or Android
# cannot expose its accessibility tree. Neither failure proves an app crash.
adb_reconnect() {
  # Hosted emulators sometimes drop the ADB transport during WebView startup
  # despite keeping the native process alive. Give transport one bounded
  # recovery opportunity and report transport loss separately from an app crash.
  if timeout 8s adb get-state 2>/dev/null | grep -Fxq device; then return 0; fi
  echo "::warning::Hosted Android ADB transport disconnected; reconnecting once."
  timeout 8s adb kill-server >/dev/null 2>&1 || true
  timeout 8s adb start-server >/dev/null 2>&1 || true
  for attempt in 1 2 3; do
    if timeout 12s adb wait-for-device >/dev/null 2>&1 &&
       timeout 8s adb get-state 2>/dev/null | grep -Fxq device; then
      echo "Hosted ADB transport restored on attempt $attempt"
      return 0
    fi
    sleep 3
  done
  echo "::error::Hosted emulator ADB transport unavailable; no native-app crash is established."
  return 1
}
capture_native_diagnostics() {
  local label="$1"
  timeout 12s adb get-state > "artifacts/android-emulator/${label}-adb-state.txt" 2>&1 || true
  timeout 12s adb shell dumpsys activity activities > "artifacts/android-emulator/${label}-activities.txt" 2>&1 || true
  timeout 15s adb logcat -d -v brief -t 1000 > "artifacts/android-emulator/${label}-logcat.txt" 2>&1 || true
  timeout 15s adb exec-out screencap -p > "artifacts/android-emulator/${label}-screenshot.png" 2>/dev/null || true
}
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
    # am start -W can time out while the startup WebView is still initializing.
    # Do not conflate that with a native process crash: check the real PID.
    sleep 7
    if ! timeout 12s adb shell pidof "$pkg" >/dev/null 2>&1; then
      capture_native_diagnostics "$name-startup-failure"
      echo "::error::$name Activity timed out and the native process is unavailable."
      return 1
    fi
    echo "::warning::$name am start did not finish drawing; process exists, checking native UI."
  fi
  # Capture before UiAutomator; a hosted emulator has previously lost its ADB
  # connection during accessibility inspection, leaving no visual evidence.
  timeout 15s adb exec-out screencap -p > "artifacts/android-emulator/$name-early-screen.png" 2>/dev/null || true
  sleep 12
  dismiss_launcher_anr "$name"
  # Validate the actually rendered root package. Newer emulator images can
  # return an empty mCurrentFocus/mFocusedApp even while our Activity is plainly
  # foreground, which made the previous dumpsys check a false negative.
  timeout 15s adb shell uiautomator dump "/sdcard/$name-window.xml" >/dev/null 2>&1 || true
  timeout 10s adb pull "/sdcard/$name-window.xml" "artifacts/android-emulator/$name-window.xml" >/dev/null 2>&1 || true
  if ! grep -Fq "package=\"$pkg\"" "artifacts/android-emulator/$name-window.xml" 2>/dev/null; then
    # Accessibility may fail on WebView without the app actually leaving the
    # foreground; require an independent RESUMED activity and real screenshot.
    local foreground
    foreground="$(timeout 12s adb shell dumpsys activity activities 2>/dev/null || true)"
    printf '%s\n' "$foreground" > "artifacts/android-emulator/$name-activity-state.txt"
    if grep -E '(mResumedActivity|topResumedActivity|ResumedActivity)' <<< "$foreground" | grep -Fq "$pkg" &&
      test "$(stat -c%s "artifacts/android-emulator/$name-early-screen.png" 2>/dev/null || echo 0)" -gt 6000; then
      echo "::warning::$name UiAutomator hierarchy unavailable; resumed Activity and real screenshot confirmed; inspect visual artifact manually."
    else
      capture_native_diagnostics "$name-foreground-failure"
      echo "::error::$name foreground could not be proven by UI hierarchy or resumed Activity; see emulator evidence."
      return 1
    fi
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
    if ! adb_reconnect; then
      capture_native_diagnostics "$name-adb-loss-after-retry"
      return 1
    fi
    # Remove the old *offline* XML before re-sampling: a failed pull must
    # never fool the test into treating stale accessibility text as current.
    rm -f "artifacts/android-emulator/$name-window.xml"
    timeout 18s adb shell uiautomator dump "/sdcard/$name-window.xml" >/dev/null 2>&1 || true
    timeout 12s adb pull "/sdcard/$name-window.xml" "artifacts/android-emulator/$name-window.xml" >/dev/null 2>&1 || true
    if ! grep -Fq "package=\"$pkg\"" "artifacts/android-emulator/$name-window.xml" 2>/dev/null; then
      # WebView accessibility inspection itself may lose the ADB connection;
      # capture a fresh rendered screenshot plus independent Activity/PID
      # rather than misidentifying instrumentation loss as a process crash.
      adb_reconnect || { capture_native_diagnostics "$name-adb-loss"; return 1; }
      capture_native_diagnostics "$name-recovery-unverified"
      local current
      current="$(timeout 12s adb shell dumpsys activity activities 2>/dev/null || true)"
      if ! grep -E '(mResumedActivity|topResumedActivity|ResumedActivity)' <<< "$current" | grep -Fq "$pkg" ||
         ! timeout 12s adb shell pidof "$pkg" >/dev/null 2>&1 ||
         [ "$(stat -c%s "artifacts/android-emulator/$name-recovery-unverified-screenshot.png" 2>/dev/null || echo 0)" -le 6000 ]; then
        echo "::error::$name recovery could not be proven; emulator evidence saved (not classified as app crash)."
        return 1
      fi
      echo "::warning::$name recovered native Activity and screenshot; WebView accessibility unavailable, inspect captured image."
    elif grep -qiE "You.?re offline|You are offline" "artifacts/android-emulator/$name-window.xml"; then
      capture_native_diagnostics "$name-still-offline"
      echo "::error::$name remains offline after bounded retry; no verified online WebView."
      return 1
    fi
  fi
  adb_reconnect || { capture_native_diagnostics "$name-adb-loss-before-pid"; return 1; }
  if ! timeout 12s adb shell pidof "$pkg" >/dev/null 2>&1; then
    echo "::error::$name native app crashed or failed to start"
    adb logcat -d -v brief -t 650 >"artifacts/android-emulator/$name-crash.log"
    return 1
  fi
  adb_reconnect || { capture_native_diagnostics "$name-adb-loss-before-screenshot"; return 1; }
  timeout 20s adb exec-out screencap -p >"artifacts/android-emulator/$name-first-screen.png" ||
    { capture_native_diagnostics "$name-screenshot-failure"; return 1; }
  test "$(stat -c%s "artifacts/android-emulator/$name-first-screen.png")" -gt 6000
  # Android accessibility hierarchy above is retained for manual visual crosscheck.
  # A full swipe should not crash WebView or freeze the owning process.
  timeout 15s adb shell input swipe 450 1500 450 350 650 ||
    { capture_native_diagnostics "$name-swipe-transport"; return 1; }
  sleep 4
  adb_reconnect || { capture_native_diagnostics "$name-adb-loss-after-swipe"; return 1; }
  dismiss_launcher_anr "$name-after-swipe"
  timeout 12s adb shell pidof "$pkg" >/dev/null ||
    { capture_native_diagnostics "$name-process-exited-after-swipe"; return 1; }
  timeout 20s adb exec-out screencap -p >"artifacts/android-emulator/$name-after-scroll.png" ||
    { capture_native_diagnostics "$name-scroll-screenshot-failure"; return 1; }
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
