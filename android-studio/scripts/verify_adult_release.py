#!/usr/bin/env python3
"""Static regression guards for the adult Play package. NOT device or AdMob QA."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
def content(relative):
    return (root / relative).read_text(encoding="utf-8")

gradle = content("app/build.gradle.kts")
manifest = content("app/src/main/AndroidManifest.xml")
activity = content("app/src/main/java/com/jonas/papercup/MainActivity.kt")
kids = content("kidsapp/build.gradle.kts")
template = content("play/assetlinks.json")

assert 'namespace = "com.jonas.papercup"' in gradle
assert 'applicationId = "com.jonas.papercup"' in gradle
assert "targetSdk = 36" in gradle and "versionCode = 33" in gradle
assert 'package="tv.matchapp.app"' not in manifest
assert "package com.jonas.papercup" in activity
assert "appBuild=33" in activity
assert "isKidsUri(target)" in activity
assert "child.post { child.destroy() }" in activity
assert 'applicationId = "tv.matchapp.kids"' in kids
assert '"package_name": "com.jonas.papercup"' in template
default = gradle.split("defaultConfig {", 1)[1].split("buildTypes {", 1)[0]
debug = gradle.split("debug {", 1)[1].split("\n        }", 1)[0]
assert "ca-app-pub-9541435081010948/4843348278" in default
assert "ADMOB_REWARDED_ID" in default
assert "ca-app-pub-3940256099942544/5224354917" not in default
assert "ca-app-pub-3940256099942544/5224354917" in debug
assert "com.google.android.gms:play-services-ads" not in gradle, "SDK is blocked until a real AdMob APP ID and consent are provided"
print("Adult Play static package, version, Kids separation and safe ad staging: PASS")
