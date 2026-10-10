(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const bubble = $("jonas-bubble"), face = $("bubble-face"), sheet = $("chat-sheet");
  const backdrop = $("chat-backdrop"), form = $("chat-form"), input = $("chat-input");
  const log = $("chat-messages"), state = $("chat-state"), micButton = $("mic-button");
  const sendButton = $("send-button"), closeButton = $("close-chat");
  const POS_KEY = "matchapp-jonas-bubble-position-v1";
  const SAVED_KEY = "matchapp-jonas-saved-local-v1";
  let open = false, speaking = false, listening = false, recording = null;
  let busy = false, controller = null, epoch = 0, messageHistory = [], lastReply = "";
  let audioAnimation = null, blinkClock = null, drag = null, ignoreClick = false;
  const shapes = ["aa", "oh", "ee", "rest"];
  const birthday = "October 10";
  // Double-buffered facial frames for smooth crossfades: never flash empty images.
  const avatarPairs = [
    [face, $("bubble-expression")],
    [$("hero-face"), $("hero-expression")],
    [$("sheet-face"), $("sheet-expression")],
  ];
  let activeFrame = 0;
  let faceFrame = "rest";
  const preload = new Map();
  for (const mood of ["rest", "blink", "smile", "aa", "oh", "ee"]) {
    const frame = new Image();
    frame.decoding = "async";
    frame.src = "faces/jonas/" + mood + ".jpg";
    preload.set(mood, frame);
  }
  function setExpression(name) {
    if (document.hidden || !preload.has(name) || faceFrame === name) return;
    faceFrame = name;
    activeFrame = 1 - activeFrame;
    const filename = preload.get(name).src;
    for (const pair of avatarPairs) {
      const incoming = pair[activeFrame], outgoing = pair[1-activeFrame];
      if (!incoming || !outgoing) continue;
      incoming.src = filename;
      incoming.style.opacity = "1";
      outgoing.style.opacity = "0";
    }
  }
  const heroArt = document.querySelector(".hero-art");
  if (heroArt && window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    heroArt.addEventListener("pointermove", (event) => {
      const rect = heroArt.getBoundingClientRect();
      const x = ((event.clientX-rect.left)/rect.width-.5)*2;
      const y = ((event.clientY-rect.top)/rect.height-.5)*2;
      heroArt.style.setProperty("--head-x", (-y*3).toFixed(2)+"deg");
      heroArt.style.setProperty("--head-y", (x*5).toFixed(2)+"deg");
    }, { passive:true });
    heroArt.addEventListener("pointerleave", () => {
      heroArt.style.setProperty("--head-x","0deg");
      heroArt.style.setProperty("--head-y","0deg");
    });
  }

  function setMicGlyph(active) {
    if (active) { micButton.textContent = "■"; return; }
    micButton.innerHTML = "<svg aria-hidden='true' viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='9' y='2' width='6' height='12' rx='3'/><path d='M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8'/></svg>";
  }
  setMicGlyph(false);

  function uiStatus(text) { state.textContent = text; }
  function safeStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function safeLoad(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function addEntry(role, text) {
    const entry = document.createElement("div");
    entry.className = "chat-entry " + (role === "user" ? "user" : "bot");
    const label = document.createElement("span");
    label.textContent = role === "user" ? "You" : "Jonas";
    const p = document.createElement("p");
    p.textContent = String(text);
    entry.append(label, p);
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
    return entry;
  }
  function saveReply() {
    if (!lastReply) { uiStatus("Nothing to save yet."); return; }
    const entries = safeLoad(SAVED_KEY, []);
    if (!Array.isArray(entries)) return;
    entries.unshift({ text: lastReply.slice(0, 3500), savedAt: new Date().toISOString() });
    safeStore(SAVED_KEY, entries.slice(0, 20));
    uiStatus("Reply saved to My space on this device.");
    if (document.querySelector('[data-view="saved"].active')) renderSaved();
  }
  function renderSaved() {
    const root = $("saved-list");
    root.replaceChildren();
    const values = safeLoad(SAVED_KEY, []);
    if (!Array.isArray(values) || !values.length) {
      const p = document.createElement("p");
      p.className = "empty-note"; p.textContent = "No saved replies yet. Ask Jonas a question and tap ☆ to save the answer.";
      root.appendChild(p); return;
    }
    for (const row of values.slice(0, 20)) {
      const div = document.createElement("article");
      div.className = "saved-item";
      const content = document.createElement("p");
      content.className = "saved-item-copy";
      content.textContent = String(row.text || "");
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "saved-item-trash";
      remove.setAttribute("aria-label", "Delete this saved reply");
      remove.title = "Delete saved reply";
      remove.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 4h4M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>';
      let armed = false;
      remove.addEventListener("click", () => {
        if (!armed) {
          armed = true;
          remove.textContent = "Delete?";
          remove.setAttribute("aria-label", "Confirm deleting this saved reply");
          remove.classList.add("is-armed");
          return;
        }
        div.classList.add("is-removing");
        remove.disabled = true;
        const commit = () => {
          const latest = safeLoad(SAVED_KEY, []);
          if (Array.isArray(latest)) {
            // Compare the saved value, not a stale index if another reply arrived.
            const at = latest.findIndex((item) => item.savedAt === row.savedAt && item.text === row.text);
            if (at >= 0) latest.splice(at, 1);
            safeStore(SAVED_KEY, latest);
          }
          renderSaved();
        };
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) commit();
        else window.setTimeout(commit, 270);
      });
      div.append(content, remove);
      root.appendChild(div);
    }
  }
  function go(page) {
    const target = ["home", "discover", "saved"].includes(page) ? page : "home";
    document.querySelectorAll("[data-view]").forEach((view) => {
      view.hidden = view.dataset.view !== target;
      view.classList.toggle("active", view.dataset.view === target);
    });
    document.querySelectorAll(".nav-link").forEach((btn) => {
      const on = btn.dataset.page === target;
      btn.classList.toggle("active", on);
      if (on) btn.setAttribute("aria-current", "page"); else btn.removeAttribute("aria-current");
    });
    if (target === "saved") renderSaved();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function stopVoice() {
    ++epoch;
    speaking = false;
    bubble.classList.remove("is-speaking");
    clearInterval(audioAnimation); audioAnimation = null;
    setExpression("rest");
    try { window.MatchAppJonasSpeech?.stop?.(); } catch {}
    try { speechSynthesis.cancel(); } catch {}
    try { window.MatchAppNativeVoice?.stopSpeaking(); } catch {}
    if (listening) {
      try { if (recording) recording.abort(); else window.MatchAppNativeVoice?.stopListening(); } catch {}
    }
    listening = false; bubble.classList.remove("is-listening");
    setMicGlyph(false); micButton.setAttribute("aria-label", "Start microphone");
  }
  function voiceLanguage() {
    return window.MatchAppJonasLocale?.speech?.() || navigator.language || "en-US";
  }
  function pickVoice(language) {
    // The browser cannot expose reliable gender metadata. Use the reviewed
    // allowlist only; never use the first available voice or the OS default.
    try {
      return window.MatchAppJonasVoicePolicy?.select?.(
        speechSynthesis.getVoices?.() || [], language
      ) || null;
    } catch { return null; }
  }
  function useVoice(text, onDone) {
    if(window.MatchAppJonasSpeech){
      const mine=++epoch;
      window.MatchAppJonasSpeech.unlock();
      speaking=true;
      window.MatchAppJonasSpeech.speak(String(text).slice(0,650),voiceLanguage(),{
        onStart(){if(mine!==epoch)return;bubble.classList.add('is-speaking');uiStatus('Jonas is speaking…')},
        onEnd(){if(mine!==epoch)return;speaking=false;bubble.classList.remove('is-speaking');uiStatus('Ready when you are');if(typeof onDone==='function'&&open)onDone()},
        onError(){if(mine===epoch)uiStatus('Voice temporarily unavailable. You can still type or use the microphone.')}
      });
      return;
    }

    if (window.MatchAppNativeVoice?.speak) {
      const mine = ++epoch;
      speaking = true; bubble.classList.add("is-speaking"); uiStatus("Jonas is speaking…");
      let step = 0;
      audioAnimation = setInterval(() => {
        if (speaking && mine === epoch) setExpression(shapes[(step++) % shapes.length]);
      }, 220);
      const finish = () => {
        if (mine !== epoch || !speaking) return;
        speaking = false; bubble.classList.remove("is-speaking");
        clearInterval(audioAnimation); audioAnimation = null;
        setExpression("rest"); uiStatus("Ready when you are");
        if (typeof onDone === "function" && open) onDone();
      };
      window.matchAppNativeSpeechState = (active) => { if (!active) finish(); };
      document.addEventListener("matchapp:avatar-voice-unavailable", finish, { once: true });
      window.setTimeout(finish, Math.min(60000, 3000 + text.length * 95));
      try { window.MatchAppNativeVoice.speak(String(text).slice(0, 4000), voiceLanguage()); }
      catch { finish(); uiStatus("Voice unavailable; the answer is still visible."); }
      return;
    }
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      uiStatus("Voice unavailable. Text is always available."); return;
    }
    const myEpoch = ++epoch;
    try { speechSynthesis.cancel(); } catch {}
    const utter = new SpeechSynthesisUtterance(String(text).slice(0, 3000));
    utter.lang = voiceLanguage();
    utter.pitch = .89;
    utter.rate = .97;
    const approvedVoice = pickVoice(utter.lang);
    if (!approvedVoice) {
      uiStatus("No approved masculine voice installed. Jonas remains available by text.");
      if (typeof onDone === "function" && open) onDone();
      return;
    }
    utter.voice = approvedVoice;
    utter.pitch = 1; utter.rate = .94; utter.volume = 1;
    let speechStarted = false;
    const done = () => {
      if (myEpoch !== epoch || !speaking) return;
      speaking = false; bubble.classList.remove("is-speaking");
      clearInterval(audioAnimation); audioAnimation = null;
      setExpression("rest"); uiStatus("Ready when you are");
      if (typeof onDone === "function" && open) onDone();
    };
    utter.onstart = () => {
      if (myEpoch !== epoch) return;
      speechStarted = true;
      bubble.classList.add("is-speaking"); uiStatus("Jonas is speaking…");
      let i = 0;
      audioAnimation = setInterval(() => { if (speaking) setExpression(shapes[(i++) % shapes.length]); }, 170);
    };
    utter.onboundary = e => {
      if (myEpoch !== epoch || !speechStarted) return;
      const next = String(text).charAt(e.charIndex || 0).toLowerCase();
      setExpression(/[ou]/.test(next) ? "oh" : /[eiiy]/.test(next) ? "ee" : "aa");
    };
    utter.onend = done; utter.onerror = done;
    speaking = true;
    try { speechSynthesis.speak(utter); speechSynthesis.resume?.(); }
    catch { done(); }
  }
  // Production secrets never live here. The preview Android native bridge talks
  // to the already-metered MatchApp Ai Edge Function using a public anon JWT.
  let pendingNative = null;
  window.matchAppNativeAiResult = (id, reply, error) => {
    if (!pendingNative || pendingNative.id !== String(id)) return;
    const current = pendingNative;
    pendingNative = null;
    if (error) current.reject(new Error(String(error)));
    else current.resolve({ reply: String(reply || "") });
  };
  function askPackagedAI(messages, locale, signal) {
    return new Promise((resolve, reject) => {
      const id = "m" + Date.now().toString(36) + Math.floor(Math.random()*100000).toString(36);
      if (pendingNative) {
        reject(new Error("Please wait for Jonas to finish answering."));
        return;
      }
      pendingNative = { id, resolve, reject };
      const rejectIfAborted = () => {
        if (pendingNative?.id !== id) return;
        pendingNative = null;
        reject(new DOMException("Request timed out", "AbortError"));
      };
      signal.addEventListener("abort", rejectIfAborted, {once:true});
      try {
        window.MatchAppNativeAI.ask(JSON.stringify({id, messages, locale}));
      } catch {
        pendingNative = null;
        reject(new Error("Jonas could not reach the native AI service."));
      }
    });
  }
  // Verified avatar metadata. The Play launch date remains unknown until published.
  function avatarIdentityAnswer(question) {
    const q = String(question || "");
    const birthday = /(your|jonas.s|seu|do jonas).{0,55}(birthday|anivers[aá]rio|date of birth|nascimento)|quando (voc[eê]|jonas) nasceu/i.test(q);
    const creator = /(creator|criador).{0,55}(birthday|anivers[aá]rio|born|nasceu|nascimento)/i.test(q);
    const launch = /(your|jonas.s|app|matchapp ai|google play|official).{0,70}(launch|release|publication|released|published|lan[çc]amento|estreia|publica[çc][aã]o)|(data do lan[çc]amento|quando (o app|jonas) (foi )?lan[çc]ado)/i.test(q);
    if (!birthday && !creator && !launch) return null;
    const pt = voiceLanguage().toLowerCase().startsWith("pt");
    const parts = [];
    if (birthday || creator) parts.push(pt
      ? "Meu aniversário simbólico é 10 de outubro. Meu criador nasceu em 10 de outubro de 1986 e completa 40 anos em 10 de outubro de 2026."
      : "My symbolic birthday is October 10. My creator was born October 10, 1986, and turns 40 on October 10, 2026.");
    if (launch) parts.push(pt
      ? "Minha data oficial de lançamento no Google Play ainda não foi confirmada; só vou informar a data real após a publicação."
      : "My official Google Play launch date is not confirmed yet; I'll give the verified date after publication.");
    return parts.join(" ");
  }
  async function send(message) {
    const text = String(message || "").trim().slice(0, 2000);
    if (!text || busy) return;
    // Browser edition uses the live site's authenticated, metered discovery
    // service. Never call the preview-only /api/ask endpoint or expose API keys.
    if (window.MATCHAPP_BROWSER && !window.MatchAppNativeAI) {
      window.location.assign("/discover.html?q=" + encodeURIComponent(text) + "&focus=start");
      return;
    }
    if (speaking) stopVoice();
    if (!open) showChat();
    addEntry("user", text);
    messageHistory.push({ role: "user", content: text });
    messageHistory = messageHistory.slice(-12);
    const verifiedIdentity = avatarIdentityAnswer(text);
    if (verifiedIdentity) {
      messageHistory.push({ role: "assistant", content: verifiedIdentity });
      messageHistory = messageHistory.slice(-12);
      lastReply = verifiedIdentity;
      addEntry("assistant", verifiedIdentity);
      useVoice(verifiedIdentity);
      return;
    }
    busy = true; sendButton.disabled = true;
    uiStatus("Thinking…");
    const ctrl = new AbortController(); controller = ctrl;
    // MatchApp AI's existing model fallbacks can need up to 60 seconds under load.
    const timeout = setTimeout(() => ctrl.abort(), 75000);
    try {
      let data;
      if (window.MatchAppNativeAI && typeof window.MatchAppNativeAI.ask === "function") {
        data = await askPackagedAI(messageHistory, voiceLanguage(), ctrl.signal);
      } else {
        const response = await fetch("/api/ask", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
          body: JSON.stringify({ messages: messageHistory, locale: voiceLanguage() })
        });
        data = await response.json();
        if (!response.ok) throw new Error(data.error || "Jonas is unavailable.");
      }
      if (!data.reply) throw new Error(data.error || "Jonas is unavailable.");
      const reply = String(data.reply).slice(0, 7000);
      messageHistory.push({ role: "assistant", content: reply.slice(0, 2000) });
      messageHistory = messageHistory.slice(-12);
      lastReply = reply;
      addEntry("assistant", reply);
      useVoice(reply);
    } catch (error) {
      const note = error.name === "AbortError" ? "The request timed out. Try again." : error.message || "Jonas is unavailable.";
      messageHistory.pop();
      const failed = addEntry("assistant", note);
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "retry-ask";
      retry.textContent = "Try again";
      retry.addEventListener("click", () => { retry.disabled = true; void send(text); });
      failed.appendChild(retry);
      uiStatus("Couldn't connect");
    } finally {
      clearTimeout(timeout);
      busy = false; sendButton.disabled = false; controller = null;
      // Do not unexpectedly open the phone's software keyboard after replies/errors.
      if (open && !document.hidden && window.matchMedia('(pointer: fine)').matches) {
        input.focus({ preventScroll: true });
      }
    }
  }
  function startListening() {
    if (listening) {
      try { if (recording) recording.stop(); else window.MatchAppNativeVoice?.stopListening(); } catch {}
      listening = false; bubble.classList.remove("is-listening");
      setMicGlyph(false); uiStatus("Ready when you are");
      return;
    }
    // Android WebView can expose a SpeechRecognition shim that cannot actually listen.
    // Prefer the Kotlin bridge when available, regardless of browser API presence.
    const Engine = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (window.MatchAppNativeVoice?.start) {
      if (speaking) stopVoice();
      listening = true; recording = null;
      bubble.classList.add("is-listening");
      setMicGlyph(true); micButton.setAttribute("aria-label", "Stop microphone");
      uiStatus("Listening with Android…");
      // The native Android bridge performs the permission check and recognition.
      try { window.MatchAppNativeVoice.start(voiceLanguage()); }
      catch { listening = false; bubble.classList.remove("is-listening"); uiStatus("Native microphone unavailable."); }
      return;
    }
    if (!Engine) { uiStatus("Microphone transcription isn't available in this browser. Please type."); input.focus(); return; }
    if (speaking) stopVoice();
    const recognition = new Engine();
    recognition.lang = voiceLanguage(); recognition.interimResults = true; recognition.continuous = false;
    recording = recognition; listening = true;
    let submitted = false, finalText = "";
    recognition.onresult = (event) => {
      const parts = Array.from(event.results || []);
      finalText = parts.map((row) => row[0]?.transcript || "").join(" ").trim();
      input.value = finalText;
      if (!submitted && parts.some((row) => row.isFinal)) {
        submitted = true; listening = false; bubble.classList.remove("is-listening");
        setMicGlyph(false);
        try { recognition.stop(); } catch {}
        void send(finalText);
      }
    };
    recognition.onerror = () => { listening = false; bubble.classList.remove("is-listening"); setMicGlyph(false); uiStatus("Mic unavailable. Please type instead."); };
    recognition.onend = () => {
      listening = false; bubble.classList.remove("is-listening"); setMicGlyph(false);
      if (finalText && !submitted) { submitted = true; void send(finalText); }
      else if (!submitted) uiStatus("Tap the microphone to try again.");
    };
    try {
      // Must be invoked synchronously from the microphone click.
      recognition.start();
      bubble.classList.add("is-listening");
      setMicGlyph(true); micButton.setAttribute("aria-label", "Stop microphone");
      uiStatus("Listening…");
    } catch {
      listening = false; uiStatus("Microphone permission is unavailable.");
    }
  }
  function showChat(greetOnOpen = false) {
    const wasOpen = open;
    open = true; sheet.hidden = false; backdrop.hidden = false;
    bubble.setAttribute("aria-expanded", "true");
    document.body.classList.add("chat-is-open");
    uiStatus(busy ? "Thinking…" : "Ready when you are");
    if (greetOnOpen && !wasOpen && !busy) {
      const greeting = window.MatchAppJonasLocale?.t?.("greeting") || "Hi, I'm Jonas. What would you like to discover?";
      const first = log.querySelector(".chat-entry.bot p");
      if (first) first.textContent = greeting;
      if (speaking || listening) stopVoice();
      useVoice(greeting, () => {
        // Speech comes first. Recognition is activated only after Jonas finishes.
        if (open && !busy && !input.value.trim() && !document.hidden) startListening();
      });
    }
    // Keep the keyboard down until the user explicitly types.
  }
  function hideChat() {
    open = false; sheet.hidden = true; backdrop.hidden = true;
    bubble.setAttribute("aria-expanded", "false");
    document.body.classList.remove("chat-is-open");
    if (controller) controller.abort();
    stopVoice(); bubble.focus({ preventScroll: true });
  }
  function toggleChat() {
    if (open) hideChat();
    else showChat(true);
  }
  function clampPosition(left, top) {
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    return {
      x: Math.max(9, Math.min(window.innerWidth - w - 9, left)),
      y: Math.max(9, Math.min(window.innerHeight - h - 9, top))
    };
  }
  function setPosition(left, top, persist = false) {
    const p = clampPosition(left, top);
    bubble.style.left = p.x + "px"; bubble.style.top = p.y + "px";
    bubble.style.right = "auto"; bubble.style.bottom = "auto";
    if (persist) safeStore(POS_KEY, { x: p.x / Math.max(1, innerWidth - bubble.offsetWidth),
                                      y: p.y / Math.max(1, innerHeight - bubble.offsetHeight) });
  }
  const previous = safeLoad(POS_KEY, null);
  if (previous && Number.isFinite(previous.x) && Number.isFinite(previous.y)) {
    setPosition(previous.x * (innerWidth - bubble.offsetWidth), previous.y * (innerHeight - bubble.offsetHeight));
  }
  bubble.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    // A new pointer gesture must not inherit the click guard from a previous drag.
    ignoreClick = false;
    const rect = bubble.getBoundingClientRect();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
    bubble.setPointerCapture(event.pointerId);
  });
  bubble.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 7) return;
    drag.moved = true; bubble.classList.add("is-dragging");
    setPosition(drag.left + dx, drag.top + dy);
  });
  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.moved) {
      const rect = bubble.getBoundingClientRect();
      setPosition(rect.left, rect.top, true); ignoreClick = true;
    }
    drag = null; bubble.classList.remove("is-dragging");
  }
  bubble.addEventListener("pointerup", endDrag);
  bubble.addEventListener("pointercancel", endDrag);
  bubble.addEventListener("click", () => {
    if (ignoreClick) { ignoreClick = false; return; }
    toggleChat();
  });
  function trackKeyboard() {
    const vv = window.visualViewport;
    const overlap = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    document.documentElement.style.setProperty("--keyboard", overlap + "px");
  }
  trackKeyboard();
  window.visualViewport?.addEventListener("resize", trackKeyboard);
  window.visualViewport?.addEventListener("scroll", trackKeyboard);
  window.addEventListener("resize", () => {
    trackKeyboard();
    if (!bubble.style.left) return;
    const rect = bubble.getBoundingClientRect(); setPosition(rect.left, rect.top);
  });
  blinkClock = setInterval(() => {
    if (speaking || listening) return;
    setExpression("blink");
    setTimeout(() => { if (!speaking && !listening) setExpression("rest"); }, 140);
  }, 3900);

  // Native Android WebView speech callback. Only the trusted debug localhost
  // preview or the first-party app origin can invoke its Kotlin bridge.
  window.matchAppNativeVoiceResult = (result) => {
    if (!listening) return;
    const text = String(result || "").trim();
    listening = false; bubble.classList.remove("is-listening");
    setMicGlyph(false); micButton.setAttribute("aria-label", "Start microphone");
    input.value = text;
    if (text) void send(text);
    else uiStatus("I didn't catch that. Try again or type below.");
  };
  window.matchAppNativeVoiceError = (code) => {
    if (!listening) return;
    listening = false; bubble.classList.remove("is-listening");
    setMicGlyph(false);
    uiStatus("Voice: " + (code === "permission-denied" ? "microphone permission required" : "couldn't understand speech") + ". Try again or type below.");
  };
  document.addEventListener("matchapp:voice-partial", (event) => {
    if (listening) input.value = String(event.detail?.text || "");
  });
  document.addEventListener("matchapp:voice-state", (event) => {
    if (listening && event.detail?.state === "processing") uiStatus("Turning speech into text…");
  });

  document.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault(); go(button.dataset.page);
  }));
  document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => {
    showChat(); void send(button.dataset.prompt);
  }));
  $("talk-hero").addEventListener("click", () => showChat(true));
  closeButton.addEventListener("click", hideChat);
  backdrop.addEventListener("click", hideChat);
  $("save-reply").addEventListener("click", saveReply);
  micButton.addEventListener("click", startListening);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && open) hideChat(); });
  input.addEventListener("beforeinput", (event) => {
    // Typing always wins over an automatic voice greeting.
    if (event.isTrusted && speaking && !busy) stopVoice();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault(); const value = input.value.trim();
    if (!value) return;
    input.value = ""; void send(value);
  });
  go(location.hash.includes("discover") ? "discover" : location.hash.includes("saved") ? "saved" : "home");
})();
