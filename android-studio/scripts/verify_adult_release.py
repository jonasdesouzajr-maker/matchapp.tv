#!/usr/bin/env python3
"""Static regression guards for the adult Play package. NOT device or AdMob QA."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET

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
assert "targetSdk = 36" in gradle and "versionCode = 41" in gradle
assert 'package="tv.matchapp.app"' not in manifest
assert "package com.jonas.papercup" in activity
assert "appBuild=41" in activity
assert "isKidsUri(target)" in activity
assert "child.post { child.destroy() }" in activity
assert 'applicationId = "tv.matchapp.kids"' in kids
assert '"package_name": "com.jonas.papercup"' in template

# The Play DISTRIBUTION signing certificate, not the upload key, owns Android
# App Links. Compare the full website file and staged Play template so neither
# variant can silently diverge while a native AAB is being prepared.
website_assetlinks = (root.parent / ".well-known/assetlinks.json").read_text(encoding="utf-8")
assert json.loads(template) == json.loads(website_assetlinks), "Hosted App Links template differs from Android release"
links = json.loads(template)
play_cert = "66:EB:B2:FF:31:C6:57:42:FB:D9:9E:0D:89:0A:B2:F1:56:E4:DA:5C:19:1A:AF:67:5A:DA:4E:D5:FF:EE:74:B8"
assert isinstance(links,list) and any(
    "delegate_permission/common.handle_all_urls" in x.get("relation", [])
    and x.get("target",{}).get("package_name") == "com.jonas.papercup"
    and play_cert in x.get("target",{}).get("sha256_cert_fingerprints",[])
    for x in links
), "App Links does not bind the confirmed Play signing certificate"
android_ns="{http://schemas.android.com/apk/res/android}"
manifest_xml=ET.fromstring(manifest)
app_link_filters=[
    f for f in manifest_xml.findall(".//intent-filter")
    if f.attrib.get(android_ns+"autoVerify")=="true"
]
assert any(any(d.attrib.get(android_ns+"host")=="matchapp.tv"
               and d.attrib.get(android_ns+"scheme")=="https"
               for d in f.findall("data")) for f in app_link_filters), "Adult app misses verified HTTPS App Links"
assert not any(d.attrib.get(android_ns+"host")=="www.matchapp.tv" for f in app_link_filters for d in f.findall("data")), "Do not declare www.matchapp.tv: it redirects and cannot pass Android domain verification"
# No native routing edits: a verified host-only filter covers all six requested
# same-origin paths. Real Play-signed install verification remains a separate gate.
default = gradle.split("defaultConfig {", 1)[1].split("buildTypes {", 1)[0]
debug = gradle.split("debug {", 1)[1].split("\n        }", 1)[0]
assert "ca-app-pub-9541435081010948/4843348278" in default
assert "ADMOB_REWARDED_ID" in default
assert "ca-app-pub-3940256099942544/5224354917" not in default
assert "ca-app-pub-3940256099942544/5224354917" in debug
assert "com.google.android.gms:play-services-ads" not in gradle, "SDK is blocked until a real AdMob APP ID and consent are provided"
print("Adult Play static package, version, Kids separation and safe ad staging: PASS")
