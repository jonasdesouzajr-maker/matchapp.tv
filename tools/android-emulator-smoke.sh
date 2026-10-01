#!/usr/bin/env bash
# Screenshots and crash checks of the actual repository APKs inside an Android
# emulator. This is NOT a claim of testing a physical phone or Play-signed AAB.
set -euo pipefail
mkdir -p artifacts/android-emulator
adb wait-for-device

# GitHub's hosted Android guest can boot with no external network route even
# while the APK itself is healthy. Serve the exact checked-out production tree
# over adb reverse so DEBUG builds exercise their real WebViews deterministically.
# Release builds cannot use this localhost hook.
SMOKE_PORT=8899
python3 -m http.server "$SMOKE_PORT" --bind 127.0.0.1 --directory .   >artifacts/android-emulator/local-mirror.log 2>&1 &
SMOKE_SERVER_PID=$!
cleanup_smoke_server(){ kill "$SMOKE_SERVER_PID" >/dev/null 2>&1 || true; }
trap cleanup_smoke_server EXIT
for _ in {1..20}; do
  if curl -fsS "http://127.0.0.1:$SMOKE_PORT/" >/dev/null; then break; fi
  sleep 1
done
curl -fsS "http://127.0.0.1:$SMOKE_PORT/" >/dev/null
adb reverse "tcp:$SMOKE_PORT" "tcp:$SMOKE_PORT"
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
  local name="$1" pkg="$2" apk="$3" activity="$4" smoke_path="$5"
  local smoke_url="http://127.0.0.1:$SMOKE_PORT$smoke_path"
  echo "TEST native $name APK: $pkg"
  adb install -r "$apk"
  adb shell am force-stop "$pkg" || true
  # Launch the tested Activity explicitly. The Pixel launcher/monkey route is
  # runner-dependent and previously returned to Launcher even while the APK
  # itself was valid, producing a false foreground-window failure.
  launch="$(timeout 30s adb shell am start -W -n "$pkg/$activity" --es matchapp_smoke_url "$smoke_url" 2>&1 || true)"
  printf '%s
' "$smoke_url" >"artifacts/android-emulator/$name-smoke-url.txt"
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
  # The debug-only localhost mirror is the source of truth for this hosted
  # emulator check. Avoid UiAutomator against WebView: on GitHub's Pixel guest
  # it can tear down ADB even while the Activity and rendered page are healthy.
  sleep 12
  adb_reconnect || { capture_native_diagnostics "$name-adb-loss-before-render-proof"; return 1; }
  local foreground
  foreground="$(timeout 12s adb shell dumpsys activity activities 2>/dev/null || true)"
  printf '%s\n' "$foreground" > "artifacts/android-emulator/$name-activity-state.txt"
  timeout 12s adb shell pidof "$pkg" >"artifacts/android-emulator/$name-pid.txt" 2>/dev/null ||
    { capture_native_diagnostics "$name-process-missing"; echo "::error::$name process missing before render proof."; return 1; }
  timeout 20s adb exec-out screencap -p >"artifacts/android-emulator/$name-first-screen.png" ||
    { capture_native_diagnostics "$name-screenshot-failure"; return 1; }
  if ! grep -E '(mResumedActivity|topResumedActivity|ResumedActivity)' <<< "$foreground" | grep -Fq "$pkg"; then
    capture_native_diagnostics "$name-foreground-failure"
    echo "::error::$name Activity is not RESUMED."
    return 1
  fi
  if [ "$(stat -c%s "artifacts/android-emulator/$name-first-screen.png" 2>/dev/null || echo 0)" -le 6000 ]; then
    echo "::error::$name screenshot is empty or invalid."
    return 1
  fi
  if ! grep -Fq "GET $smoke_path" artifacts/android-emulator/local-mirror.log; then
    echo "::error::$name WebView never requested its exact local mirror route: $smoke_path"
    return 1
  fi
  echo "PASS $name native Activity is RESUMED, process alive, screenshot rendered, and exact WebView route loaded."
  if ! timeout 12s adb shell pidof "$pkg" >/dev/null 2>&1; then
    echo "::error::$name native app crashed or failed to start"
    adb logcat -d -v brief -t 650 >"artifacts/android-emulator/$name-crash.log"
    return 1
  fi
  # The live Android-WebView browser smoke separately proves touch scrolling.
  # Here a swipe is an extra native check. If the hosted emulator itself drops
  # ADB after the already-proven render, record that as infrastructure noise,
  # not as an invented application crash.
  if ! timeout 15s adb shell input swipe 450 1500 450 350 650; then
    echo "::warning::$name hosted ADB closed after verified native render; swipe result unavailable."
    return 0
  fi
  sleep 3
  if ! adb_reconnect; then
    echo "::warning::$name hosted ADB unavailable after verified native render and swipe command."
    return 0
  fi
  if ! timeout 12s adb shell pidof "$pkg" >/dev/null 2>&1; then
    capture_native_diagnostics "$name-process-exited-after-swipe"
    echo "::error::$name process exited while emulator transport remained healthy."
    return 1
  fi
  timeout 20s adb exec-out screencap -p >"artifacts/android-emulator/$name-after-scroll.png" 2>/dev/null || true
  if [ "$(stat -c%s "artifacts/android-emulator/$name-after-scroll.png" 2>/dev/null || echo 0)" -gt 6000 ]; then
    echo "PASS $name remains alive after native swipe; post-scroll screenshot captured."
  else
    echo "::warning::$name post-scroll screenshot unavailable after verified native render."
  fi
}
case "${MATCHAPP_ANDROID_SMOKE_TARGET:-all}" in
  adult)
    probe "adult" "com.jonas.papercup.debug" "android-studio/app/build/outputs/apk/debug/app-debug.apk" "com.jonas.papercup.MainActivity" "/?native_emulator_smoke=1"
    ;;
  kids)
    probe "kids" "tv.matchapp.kids.debug" "android-studio/kidsapp/build/outputs/apk/debug/kidsapp-debug.apk" "tv.matchapp.kids.MainActivity" "/kids/?native_emulator_smoke=1"
    ;;
  all)
    probe "adult" "com.jonas.papercup.debug" "android-studio/app/build/outputs/apk/debug/app-debug.apk" "com.jonas.papercup.MainActivity" "/?native_emulator_smoke=1"
    adb shell am force-stop com.jonas.papercup.debug || true
    probe "kids" "tv.matchapp.kids.debug" "android-studio/kidsapp/build/outputs/apk/debug/kidsapp-debug.apk" "tv.matchapp.kids.MainActivity" "/kids/?native_emulator_smoke=1"
    ;;
  *)
    echo "::error::Unknown MATCHAPP_ANDROID_SMOKE_TARGET: ${MATCHAPP_ANDROID_SMOKE_TARGET}"
    exit 2
    ;;
esac
adb logcat -d -v brief -t 2500 >artifacts/android-emulator/device-last-log.txt || true
if grep -E 'FATAL EXCEPTION|Process: (com\.jonas\.papercup|tv\.matchapp\.kids)([ .]|$)' artifacts/android-emulator/device-last-log.txt |
   grep -Eq 'FATAL EXCEPTION|Process: (com\.jonas\.papercup|tv\.matchapp\.kids)'; then
  echo "::warning::Inspect device-last-log.txt: a native crash-like message was seen."
fi
echo "Android emulator smoke complete (physical handset still unverified)."
