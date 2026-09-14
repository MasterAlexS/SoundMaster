globalThis.browser = globalThis.browser || chrome;
document.addEventListener("DOMContentLoaded", async () => {
  const masterToggle = document.getElementById("masterToggle");
  const limitToggle = document.getElementById("limitToggle");
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const applyLastBtn = document.getElementById("applyLastBtn");
  const syncTabsBtn = document.getElementById("syncTabsBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resetVolumeBtn = document.getElementById("resetVolumeBtn");
  const activeTabInfo = document.getElementById("activeTabInfo");
  const themeToggle = document.getElementById("themeToggle");
  const lastVolText = document.getElementById("lastVolText");
  const langSelect = document.getElementById("langSelect");

  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const bassSlider = document.getElementById("bassSlider");
  const bassValue = document.getElementById("bassValue");
  const bassToggle = document.getElementById("bassToggle");
  const eqToggle = document.getElementById("eqToggle");
  const eqSection = document.querySelector(".eq-sliders");
  const eqSliders = document.querySelectorAll(".eq-slider");
  const eqNums = document.querySelectorAll(".eq-num");
  const resetEqBtn = document.getElementById("resetEqBtn");
  const importEqBtn = document.getElementById("importEqBtn");
  const exportEqBtn = document.getElementById("exportEqBtn");
  const importEqFile = document.getElementById("importEqFile");
  const balanceSlider = document.getElementById("balanceSlider");
  const balanceValue = document.getElementById("balanceValue");
  const balanceToggle = document.getElementById("balanceToggle");
  const monoToggle = document.getElementById("monoToggle");
  const compressorToggle = document.getElementById("compressorToggle");
  const panicMuteBtn = document.getElementById("panicMuteBtn");

  const eqPresetSelect = document.getElementById("eqPresetSelect");
  const customPresetsGroup = document.getElementById("customPresetsGroup");
  const savePresetBtn = document.getElementById("savePresetBtn");
  const deletePresetBtn = document.getElementById("deletePresetBtn");
  const compareBtn = document.getElementById("compareBtn");
  const speedToggle = document.getElementById("speedToggle");
  const speedSlider = document.getElementById("speedSlider");
  const speedValue = document.getElementById("speedValue");
  const resetSpeedBtn = document.getElementById("resetSpeedBtn");
  const pitchSlider = document.getElementById("pitchSlider");
  const pitchValue = document.getElementById("pitchValue");
  const resetPitchBtn = document.getElementById("resetPitchBtn");
  const pitchToggle = document.getElementById("pitchToggle");
  const resetBassBtn = document.getElementById("resetBassBtn");
  const resetBalanceBtn = document.getElementById("resetBalanceBtn");
  const reverbToggle = document.getElementById("reverbToggle");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.getAttribute("data-target")).classList.add("active");
    });
  });

  let manageShortcutsLink = document.getElementById("manageShortcutsLink");
  if (manageShortcutsLink) {
    manageShortcutsLink.addEventListener("click", () => {
      const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
      if (isFirefox) {
        const msg = document.getElementById("firefoxShortcutsMsg");
        if (msg) msg.style.display = msg.style.display === "none" ? "block" : "none";
      } else {
        browser.tabs.create({ url: "chrome://extensions/shortcuts" }).catch(() => {
          const msg = document.getElementById("firefoxShortcutsMsg");
          if (msg) {
            msg.innerHTML = "Please go to <b>chrome://extensions/shortcuts</b> to manage them.";
            msg.style.display = "block";
          }
        });
      }
    });
  }

  async function loadShortcutsUI() {
    let disabledCommands = {};
    const res = await browser.storage.local.get(["disabledCommands"]);
    if (res.disabledCommands) disabledCommands = res.disabledCommands;

    try {
      const commands = await browser.commands.getAll();
      const list = document.getElementById("shortcutsList");
      if (list && commands && commands.length > 0) {
        list.innerHTML = "";
        commands.forEach(cmd => {
          if (cmd.name === "_execute_action" || cmd.name === "_execute_browser_action") return;
          const li = document.createElement("li");
          const shortcutText = cmd.shortcut ? cmd.shortcut : "Not set";
          const keysHtml = shortcutText === "Not set" ? "Not set" : shortcutText.split("+").map(k => `<kbd>${k.trim()}</kbd>`).join("+");

          let desc = cmd.description;
          if (cmd.name === "volume-up") desc = getMessage("shortcutVolUp") || "Vol +";
          if (cmd.name === "volume-down") desc = getMessage("shortcutVolDown") || "Vol -";
          if (cmd.name === "panic-mute") desc = getMessage("shortcutPanicMute") || "Panic Mute";
          if (cmd.name === "toggle-boost") desc = getMessage("shortcutToggle") || "Toggle";

          const isEnabled = !disabledCommands[cmd.name];

          li.innerHTML = `
            <div class="shortcut-info" style="opacity: ${isEnabled ? '1' : '0.5'}">
              <span>${keysHtml}: ${desc}</span>
            </div>
            <label class="switch small" title="Toggle this shortcut">
              <input type="checkbox" data-cmd="${cmd.name}" ${isEnabled ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
          `;
          list.appendChild(li);
        });

        list.querySelectorAll("input[type='checkbox']").forEach(input => {
          input.addEventListener("change", (e) => {
            const cmdName = e.target.getAttribute("data-cmd");
            const enabled = e.target.checked;
            if (enabled) {
              delete disabledCommands[cmdName];
            } else {
              disabledCommands[cmdName] = true;
            }
            e.target.closest("li").querySelector(".shortcut-info").style.opacity = enabled ? "1" : "0.5";
            browser.storage.local.set({ disabledCommands });
            browser.runtime.sendMessage({ action: "updateShortcutsState", disabledCommands });
          });
        });
      }
    } catch (e) { }
  }

  function eqArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    return true;
  }

  function getEqValues() {
    return Array.from(eqSliders).map(slider => parseInt(slider.value, 10));
  }

  function setEqValues(values) {
    if (!values || values.length !== 10) values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    eqSliders.forEach((slider, i) => {
      slider.value = values[i];
      eqNums[i].value = values[i];
    });
  }

  function isProcessingNeeded(vol = null) {
    const currentVol = vol !== null ? vol : parseInt(volumeSlider.value, 10);
    const bass = bassToggle.checked ? parseInt(bassSlider.value, 10) : 0;
    const eq = getEqValues();
    const hasEq = eqToggle.checked && eq.some(v => v !== 0);
    const balance = balanceToggle.checked ? parseFloat(balanceSlider.value) : 0;
    const mono = monoToggle.checked;
    const compressor = compressorToggle.checked;
    const currentSpeed = parseFloat(speedSlider.value);
    const isSpeedEnabled = speedToggle.checked;
    const currentPitch = parseInt(pitchSlider.value, 10);
    const isPitchEnabled = pitchToggle.checked;
    const reverb = reverbToggle.checked;
    return currentVol !== 100 || bass !== 0 || (currentSpeed !== 1.0 && isSpeedEnabled) || (currentPitch !== 0 && isPitchEnabled) || reverb || hasEq || balance !== 0 || mono || compressor;
  }

  let panicMuteTimeout;
  panicMuteBtn.addEventListener("click", () => {
    panicMuteBtn.disabled = true;
    browser.runtime.sendMessage({ action: "panicMute" }, (isMuted) => {
      panicMuteBtn.disabled = false;
      if (panicMuteTimeout) clearTimeout(panicMuteTimeout);

      if (isMuted) {
        panicMuteBtn.textContent = getMessage("muted") || "Muted!";
        panicMuteBtn.style.backgroundColor = "";
      } else {
        panicMuteBtn.textContent = getMessage("unmuted") || "Unmuted!";
        panicMuteBtn.style.backgroundColor = "var(--accent-color)";
      }

      panicMuteTimeout = setTimeout(() => {
        if (isMuted) {
          panicMuteBtn.textContent = getMessage("panicUnmute") || "Panic Unmute (Others)";
          panicMuteBtn.style.backgroundColor = "var(--accent-color)";
        } else {
          panicMuteBtn.textContent = getMessage("panicMute") || "Panic Mute (Others)";
          panicMuteBtn.style.backgroundColor = "";
        }
      }, 1500);
    });
  });

  const availableLangs = {
    "auto": "🌐 Auto (Browser)", "en": "🇬🇧 English", "ro": "🇷🇴 Română", "es": "🇪🇸 Español", "fr": "🇫🇷 Français",
    "de": "🇩🇪 Deutsch", "it": "🇮🇹 Italiano", "pt_BR": "🇧🇷 Português", "ru": "🇷🇺 Русский", "zh_CN": "🇨🇳 中文",
    "ja": "🇯🇵 日本語", "ko": "🇰🇷 한국어", "ar": "🇸🇦 العربية", "hi": "🇮🇳 हिन्दी", "tr": "🇹🇷 Türkçe",
    "nl": "🇳🇱 Nederlands", "pl": "🇵🇱 Polski", "sv": "🇸🇪 Svenska", "fi": "🇫🇮 Suomi", "da": "🇩🇰 Dansk",
    "no": "🇳🇴 Norsk", "el": "🇬🇷 Ελληνικά", "cs": "🇨🇿 Čeština", "hu": "🇭🇺 Magyar", "bg": "🇧🇬 Български",
    "uk": "🇺🇦 Українська", "hr": "🇭🇷 Hrvatski", "sk": "🇸🇰 Slovenčina", "sl": "🇸🇮 Slovenščina", "sr": "🇷🇸 Српски",
    "id": "🇮🇩 Bahasa Indonesia", "ms": "🇲🇾 Bahasa Melayu", "th": "🇹🇭 ไทย", "vi": "🇻🇳 Tiếng Việt", "he": "🇮🇱 עברית",
    "fa": "🇮🇷 فارسی", "ca": "🇦🇩 Català", "et": "🇪🇪 Eesti", "lt": "🇱🇹 Lietuvių", "lv": "🇱🇻 Latviešu",
    "sw": "🇰🇪 Kiswahili", "am": "🇪🇹 አማርኛ", "bn": "🇧🇩 বাংলা", "fil": "🇵🇭 Filipino", "gu": "🇮🇳 ગુજરાતી",
    "kn": "🇮🇳 ಕನ್ನಡ", "ml": "🇮🇳 മലയാളം", "mr": "🇮🇳 मराठी", "ta": "🇮🇳 தமிழ்", "te": "🇮🇳 తెలుగు"
  };

  // Populate langSelect
  for (const [code, name] of Object.entries(availableLangs)) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = name;
    langSelect.appendChild(opt);
  }

  const storageData = await browser.storage.local.get(["globalLastVolume", "themePreference", "languagePreference"]);
  let globalLastVolume = storageData.globalLastVolume || 100;
  let isLightMode = storageData.themePreference === "light";
  let langPref = storageData.languagePreference || "auto";

  langSelect.value = langPref;

  if (isLightMode) document.body.classList.add("light-mode");

  let customMessages = null;

  browser.runtime.onMessage.addListener((msg) => {
    if (msg.action === "stateUpdatedFromBackground" && msg.state) {
      const state = msg.state;
      masterToggle.checked = state.enabled;
      limitToggle.checked = state.extremeMode;
      volumeSlider.max = state.extremeMode ? "1000" : "600";
      volumeSlider.value = state.volume;
      bassSlider.value = state.bass || 0;
      bassToggle.checked = state.bassEnabled !== false;
      setEqValues(state.eq || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      eqToggle.checked = state.eqEnabled !== false;
      eqSection.style.opacity = eqToggle.checked ? "1" : "0.5";
      eqSliders.forEach(s => s.disabled = !eqToggle.checked);
      eqNums.forEach(n => n.disabled = !eqToggle.checked);
      balanceSlider.value = state.balance || 0;
      balanceToggle.checked = state.balanceEnabled !== false;
      monoToggle.checked = state.mono || false;
      compressorToggle.checked = state.compressor || false;
      speedSlider.value = state.speed || 1.0;
      speedValue.textContent = (state.speed || 1.0).toFixed(1) + "x";
      speedToggle.checked = state.speedEnabled !== false && state.speed !== 1.0;
      pitchSlider.value = state.pitch || 0;
      let pVal = state.pitch || 0;
      pitchValue.textContent = (pVal > 0 ? "+" + pVal : pVal) + "st";
      pitchToggle.checked = state.pitchEnabled !== false && state.pitch !== 0;
      reverbToggle.checked = state.reverb || false;
      updateUIText();
    }
  });

  async function loadTranslations(lang) {
    if (lang === "auto") {
      customMessages = null;
      return;
    }
    try {
      const url = browser.runtime.getURL("_locales/" + lang + "/messages.json");
      const response = await fetch(url);
      customMessages = await response.json();
    } catch (e) {
      console.error("Failed to load language:", lang, e);
      customMessages = null;
    }
  }

  function getMessage(key) {
    if (customMessages && customMessages[key] && customMessages[key].message) {
      return customMessages[key].message;
    }
    return globalThis.browser.i18n.getMessage(key);
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const msg = getMessage(el.getAttribute('data-i18n'));
      if (msg) {
        if (el.tagName === 'OPTGROUP') {
          el.label = msg;
        } else {
          el.textContent = msg;
        }
      }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const msg = getMessage(el.getAttribute('data-i18n-title'));
      if (msg) el.title = msg;
    });

    browser.runtime.sendMessage({ action: "getPanicState" }, (isMutedByPanic) => {
      if (isMutedByPanic) {
        panicMuteBtn.textContent = getMessage("panicUnmute") || "Panic Unmute (Others)";
        panicMuteBtn.style.backgroundColor = "var(--accent-color)";
      } else {
        panicMuteBtn.textContent = getMessage("panicMute") || "Panic Mute (Others)";
        panicMuteBtn.style.backgroundColor = "";
      }
    });

    loadShortcutsUI();
  }

  await loadTranslations(langPref);
  applyTranslations();

  langSelect.addEventListener("change", async () => {
    langPref = langSelect.value;
    await browser.storage.local.set({ languagePreference: langPref });
    await loadTranslations(langPref);
    applyTranslations();
    updateTabInfoDisplay(); // refresh dynamic domain text
  });

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  let tabId = null;
  let storageKey = null;
  let domainKey = null;
  let urlObj = null;

  function updateTabInfoDisplay() {
    if (!currentTab) {
      activeTabInfo.textContent = getMessage("errorNoTab") || "Error: No active tab found";
      return;
    }
    const activeOnMsg = getMessage("activeOn") || "Active on: ";
    const activeCurrentMsg = getMessage("activeCurrent") || "Active on: current page";
    if (urlObj && urlObj.hostname) {
      activeTabInfo.textContent = activeOnMsg + urlObj.hostname.replace(/^www\./, '');
    } else {
      activeTabInfo.textContent = activeCurrentMsg;
    }
  }

  if (currentTab) {
    tabId = currentTab.id;
    storageKey = "tab_" + tabId;
    try {
      urlObj = new URL(currentTab.url);
      if (urlObj.hostname) {
        domainKey = "domain_" + urlObj.hostname;
      }
    } catch (e) { }
  }

  if (!domainKey && syncTabsBtn) {
    syncTabsBtn.parentElement.style.display = "none";
  }

  updateTabInfoDisplay();

  let tabState = { enabled: false, volume: 100, extremeMode: false, bass: 0, bassEnabled: false, eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], eqEnabled: false, balance: 0, balanceEnabled: false, mono: false, compressor: false, speed: 1.0, speedEnabled: false, pitch: 0, pitchEnabled: false, reverb: false };
  let domainState = null;

  if (storageKey) {
    const tabData = await browser.storage.local.get([storageKey]);
    if (tabData[storageKey]) {
      tabState = { ...tabState, ...tabData[storageKey] };
    }
  }

  if (domainKey) {
    const dData = await browser.storage.local.get([domainKey]);
    if (dData[domainKey]) {
      domainState = dData[domainKey];
    }
  }

  masterToggle.checked = tabState.enabled;
  limitToggle.checked = tabState.extremeMode;
  volumeSlider.max = tabState.extremeMode ? "1000" : "600";
  volumeSlider.value = tabState.volume;
  bassSlider.value = tabState.bass || 0;
  bassToggle.checked = tabState.bassEnabled !== false;
  setEqValues(tabState.eq || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  eqToggle.checked = tabState.eqEnabled !== false;
  eqSection.style.opacity = eqToggle.checked ? "1" : "0.5";
  balanceSlider.value = tabState.balance || 0;
  balanceToggle.checked = tabState.balanceEnabled !== false;
  monoToggle.checked = tabState.mono || false;
  compressorToggle.checked = tabState.compressor || false;
  speedSlider.value = tabState.speed || 1.0;
  speedValue.textContent = (tabState.speed || 1.0).toFixed(1) + "x";
  speedToggle.checked = tabState.speedEnabled !== false && tabState.speed !== 1.0;
  pitchSlider.value = tabState.pitch || 0;
  let pVal = tabState.pitch || 0;
  pitchValue.textContent = (pVal > 0 ? "+" + pVal : pVal) + "st";
  pitchToggle.checked = tabState.pitchEnabled !== false && tabState.pitch !== 0;
  reverbToggle.checked = tabState.reverb || false;

  updateUIText();

  function updateBalanceText() {
    let balVal = parseFloat(balanceSlider.value);
    if (balVal === 0) balanceValue.textContent = "C";
    else if (balVal < 0) balanceValue.textContent = "L" + Math.round(Math.abs(balVal) * 100);
    else balanceValue.textContent = "R" + Math.round(balVal * 100);
  }

  function formatStateSummary(state) {
    if (!state) return "100%";
    let parts = [];
    if (state.volume !== 100) parts.push(state.volume + "%");
    if (state.compressor) parts.push("AD");
    if (state.bassEnabled !== false && state.bass > 0) parts.push("BB " + state.bass + "dB");
    if (state.eqEnabled !== false && state.eq && state.eq.some(v => v !== 0)) parts.push("CEQ");
    if (state.balanceEnabled !== false && state.balance !== 0) {
      let b = state.balance;
      parts.push("B " + (b < 0 ? "L" + Math.round(Math.abs(b) * 100) : "R" + Math.round(b * 100)));
    }
    if (state.mono) parts.push("MM");
    if (state.speedEnabled !== false && state.speed && state.speed !== 1.0) parts.push(state.speed.toFixed(1) + "xS");
    if (state.pitchEnabled !== false && state.pitch && state.pitch !== 0) parts.push((state.pitch > 0 ? "+" + state.pitch : state.pitch) + "stP");
    if (state.reverb) parts.push("3DR");

    if (parts.length === 0) return "100%";
    return parts.join(", ");
  }

  function updateUIText(val = null) {
    const currentVol = val !== null ? val : parseInt(volumeSlider.value, 10);
    volumeValue.textContent = currentVol + "%";

    let hue;
    if (currentVol <= 100) {
      hue = 150;
    } else if (currentVol <= 600) {
      hue = 150 - ((currentVol - 100) / 500) * 90;
    } else {
      hue = 60 - ((currentVol - 600) / 400) * 60;
    }

    const lightness = isLightMode ? 35 : 50;
    const dynamicColor = `hsl(${hue}, 100%, ${lightness}%)`;
    volumeValue.style.color = dynamicColor;
    volumeValue.style.textShadow = `0 0 12px hsla(${hue}, 100%, ${lightness}%, 0.4)`;
    volumeValue.className = "";
    document.documentElement.style.setProperty('--dynamic-accent', dynamicColor);

    if (lastVolText) {
      if (domainState) {
        lastVolText.textContent = formatStateSummary(domainState);
      } else {
        lastVolText.textContent = globalLastVolume === 100 ? (getMessage("resetBtn") || "Reset") : globalLastVolume + "%";
      }
    }

    bassValue.textContent = bassSlider.value + "dB";
    updateBalanceText();
  }

  async function syncState() {
    if (!storageKey) return;
    const currentVol = parseInt(volumeSlider.value);
    const isEnabled = masterToggle.checked;
    const isExtreme = limitToggle.checked;
    const currentBass = parseInt(bassSlider.value);
    const isBassEnabled = bassToggle.checked;
    const currentEq = getEqValues();
    const isEqEnabled = eqToggle.checked;
    const currentBalance = parseFloat(balanceSlider.value);
    const isBalanceEnabled = balanceToggle.checked;
    const isMono = monoToggle.checked;
    const isCompressor = compressorToggle.checked;
    const isSpeedEnabled = speedToggle.checked;
    const currentSpeed = parseFloat(speedSlider.value);
    const isPitchEnabled = pitchToggle.checked;
    const currentPitch = parseInt(pitchSlider.value);
    const isReverb = reverbToggle.checked;

    tabState = { enabled: isEnabled, volume: currentVol, extremeMode: isExtreme, bass: currentBass, bassEnabled: isBassEnabled, eq: currentEq, eqEnabled: isEqEnabled, balance: currentBalance, balanceEnabled: isBalanceEnabled, mono: isMono, compressor: isCompressor, speed: currentSpeed, speedEnabled: isSpeedEnabled, pitch: currentPitch, pitchEnabled: isPitchEnabled, reverb: isReverb };

    const dataToSave = { [storageKey]: tabState };
    if (domainKey) {
      domainState = tabState;
      dataToSave[domainKey] = tabState;
    }
    if (isEnabled && currentVol !== 100) {
      globalLastVolume = currentVol;
      dataToSave.globalLastVolume = globalLastVolume;
    }
    await browser.storage.local.set(dataToSave);
    updateUIText();

    try {
      await browser.tabs.sendMessage(tabId, {
        action: "updateVolume",
        volume: currentVol,
        enabled: isEnabled,
        bass: currentBass,
        bassEnabled: isBassEnabled,
        speed: currentSpeed,
        speedEnabled: isSpeedEnabled,
        pitch: currentPitch,
        pitchEnabled: isPitchEnabled,
        reverb: isReverb,
        eq: currentEq,
        eqEnabled: isEqEnabled,
        balance: currentBalance,
        balanceEnabled: isBalanceEnabled,
        mono: isMono,
        compressor: isCompressor
      });
    } catch (err) { }

    browser.runtime.sendMessage({
      action: "updateBadge",
      tabId: tabId,
      volume: currentVol,
      enabled: isEnabled
    });
  }

  themeToggle.addEventListener("click", () => {
    isLightMode = !isLightMode;
    document.body.classList.toggle("light-mode", isLightMode);
    browser.storage.local.set({ themePreference: isLightMode ? "light" : "dark" });
    updateUIText();
  });

  volumeSlider.addEventListener("input", async () => {
    const currentVol = parseInt(volumeSlider.value, 10);
    masterToggle.checked = isProcessingNeeded(currentVol);
    updateUIText(currentVol);

    browser.runtime.sendMessage({
      action: "updateBadge",
      tabId: tabId,
      volume: currentVol,
      enabled: masterToggle.checked
    });

    try {
      await browser.tabs.sendMessage(tabId, {
        action: "updateVolume",
        volume: currentVol,
        enabled: masterToggle.checked,
        bass: parseInt(bassSlider.value),
        bassEnabled: bassToggle.checked,
        speed: parseFloat(speedSlider.value),
        speedEnabled: speedToggle.checked,
        pitch: parseInt(pitchSlider.value),
        pitchEnabled: pitchToggle.checked,
        reverb: reverbToggle.checked,
        eq: getEqValues(),
        eqEnabled: eqToggle.checked,
        balance: parseFloat(balanceSlider.value),
        balanceEnabled: balanceToggle.checked,
        mono: monoToggle.checked,
        compressor: compressorToggle.checked
      });
    } catch (err) { }
  });

  volumeSlider.addEventListener("change", () => syncState());
  masterToggle.addEventListener("change", () => {
    if (!isProcessingNeeded()) masterToggle.checked = false;
    syncState();
  });
  limitToggle.addEventListener("change", () => {
    const isExtreme = limitToggle.checked;
    volumeSlider.max = isExtreme ? "1000" : "600";
    if (!isExtreme && parseInt(volumeSlider.value) > 600) volumeSlider.value = "600";
    syncState();
  });
  applyLastBtn.addEventListener("click", async () => {
    if (domainKey) {
      const data = await browser.storage.local.get([domainKey]);
      if (data[domainKey]) {
        const dState = data[domainKey];
        if (dState.extremeMode) { limitToggle.checked = true; volumeSlider.max = "1000"; }
        volumeSlider.value = dState.volume;
        bassSlider.value = dState.bass || 0;
        bassToggle.checked = dState.bassEnabled !== false;
        setEqValues(dState.eq || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        eqToggle.checked = dState.eqEnabled !== false;
        balanceSlider.value = dState.balance || 0;
        balanceToggle.checked = dState.balanceEnabled !== false;
        speedSlider.value = dState.speed || 1.0;
        speedValue.textContent = parseFloat(speedSlider.value).toFixed(1) + "x";
        speedToggle.checked = dState.speedEnabled !== false;
        pitchSlider.value = dState.pitch || 0;
        let pVal = parseInt(pitchSlider.value);
        pitchValue.textContent = (pVal > 0 ? "+" + pVal : pVal) + "st";
        pitchToggle.checked = dState.pitchEnabled !== false;
        reverbToggle.checked = dState.reverb || false;
        masterToggle.checked = isProcessingNeeded();
        syncState();
        return;
      }
    }
    if (globalLastVolume > 600) { limitToggle.checked = true; volumeSlider.max = "1000"; }
    volumeSlider.value = globalLastVolume;
    masterToggle.checked = isProcessingNeeded(globalLastVolume);
    syncState();
  });

  if (syncTabsBtn) {
    syncTabsBtn.addEventListener("click", () => {
      if (urlObj && urlObj.hostname) {
        const originalHtml = syncTabsBtn.innerHTML;
        syncTabsBtn.innerHTML = getMessage("syncSuccess") || "✓ Synced!";
        browser.runtime.sendMessage({
          action: "syncDomainTabs",
          domain: urlObj.hostname,
          state: tabState
        });
        setTimeout(() => {
          syncTabsBtn.innerHTML = originalHtml;
        }, 2000);
      }
    });
  }

  function resetAll() {
    masterToggle.checked = false;
    volumeSlider.value = "100";
    volumeValue.textContent = "100%";
    volumeValue.className = "glow-green";
    volumeValue.style.color = "";
    volumeValue.style.textShadow = "";
    document.documentElement.style.setProperty('--dynamic-accent', 'var(--accent-color)');

    limitToggle.checked = false;

    bassToggle.checked = false;
    bassSlider.value = "0";
    bassValue.textContent = "0dB";

    eqToggle.checked = false;
    setEqValues([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    eqPresetSelect.value = "custom";
    deletePresetBtn.style.display = "none";

    balanceToggle.checked = false;
    balanceSlider.value = "0";
    balanceValue.textContent = "C";

    monoToggle.checked = false;
    compressorToggle.checked = false;

    speedToggle.checked = false;
    speedSlider.value = "1.0";
    speedValue.textContent = "1.0x";
    pitchToggle.checked = false;
    pitchSlider.value = "0";
    pitchValue.textContent = "0st";
    reverbToggle.checked = false;

    masterToggle.checked = isProcessingNeeded(100);
    syncState();
  }

  resetBtn.addEventListener("click", resetAll);

  resetVolumeBtn.addEventListener("click", () => {
    volumeSlider.value = "100";
    updateUIText(100);
    masterToggle.checked = isProcessingNeeded(100);
    syncState();
  });

  bassSlider.addEventListener("input", () => {
    if (bassSlider.value === "0") {
      bassToggle.checked = false;
    } else if (!bassToggle.checked) {
      bassToggle.checked = true;
    }
    updateUIText();
    masterToggle.checked = isProcessingNeeded();
  });
  bassSlider.addEventListener("change", () => syncState());

  balanceSlider.addEventListener("input", () => {
    updateBalanceText();
    if (parseFloat(balanceSlider.value) === 0) {
      balanceToggle.checked = false;
    } else if (!balanceToggle.checked) {
      balanceToggle.checked = true;
    }
    masterToggle.checked = isProcessingNeeded();
  });
  balanceSlider.addEventListener("change", () => syncState());
  balanceToggle.addEventListener("change", () => { masterToggle.checked = isProcessingNeeded(); syncState(); });
  monoToggle.addEventListener("change", () => { masterToggle.checked = isProcessingNeeded(); syncState(); });
  compressorToggle.addEventListener("change", () => { masterToggle.checked = isProcessingNeeded(); syncState(); });

  speedSlider.addEventListener("input", () => {
    speedValue.textContent = parseFloat(speedSlider.value).toFixed(1) + "x";
    if (parseFloat(speedSlider.value) === 1.0) {
      speedToggle.checked = false;
    } else if (!speedToggle.checked) {
      speedToggle.checked = true;
    }
    updateUIText();
    masterToggle.checked = isProcessingNeeded();
  });
  speedSlider.addEventListener("change", () => syncState());
  speedToggle.addEventListener("change", () => {
    if (parseFloat(speedSlider.value) === 1.0) {
      speedToggle.checked = false;
    }
    masterToggle.checked = isProcessingNeeded();
    syncState();
  });

  if (resetSpeedBtn) {
    resetSpeedBtn.addEventListener("click", () => {
      speedSlider.value = 1.0;
      speedValue.textContent = "1.0x";
      speedToggle.checked = false;
      masterToggle.checked = isProcessingNeeded();
      syncState();
    });
  }

  resetBassBtn.addEventListener("click", () => {
    bassSlider.value = 0;
    bassValue.textContent = "0dB";
    bassToggle.checked = false;
    masterToggle.checked = isProcessingNeeded();
    syncState();
  });

  resetBalanceBtn.addEventListener("click", () => {
    balanceSlider.value = 0;
    balanceValue.textContent = "C";
    balanceToggle.checked = false;
    masterToggle.checked = isProcessingNeeded();
    syncState();
  });

  pitchSlider.addEventListener("input", () => {
    let pVal = parseInt(pitchSlider.value);
    pitchValue.textContent = (pVal > 0 ? "+" + pVal : pVal) + "st";
    if (pVal === 0) {
      pitchToggle.checked = false;
    } else if (!pitchToggle.checked) {
      pitchToggle.checked = true;
    }
    updateUIText();
    masterToggle.checked = isProcessingNeeded();
  });
  pitchSlider.addEventListener("change", () => syncState());
  pitchToggle.addEventListener("change", () => {
    if (parseInt(pitchSlider.value) === 0) {
      pitchToggle.checked = false;
    }
    masterToggle.checked = isProcessingNeeded();
    syncState();
  });

  resetPitchBtn.addEventListener("click", () => {
    pitchSlider.value = 0;
    pitchValue.textContent = "0st";
    pitchToggle.checked = false;
    masterToggle.checked = isProcessingNeeded();
    syncState();
  });
  reverbToggle.addEventListener("change", () => { masterToggle.checked = isProcessingNeeded(); syncState(); });

  compareBtn.addEventListener("mousedown", () => sendBypass(true));
  compareBtn.addEventListener("mouseup", () => sendBypass(false));
  compareBtn.addEventListener("mouseleave", () => sendBypass(false));

  function sendBypass(isBypassed) {
    if (!storageKey) return;
    browser.tabs.sendMessage(tabId, { action: "bypassFilters", bypassed: isBypassed }).catch(() => { });
  }

  // EQ Presets
  const predefinedPresets = {
    acoustic: [5, 5, 4, 1, 1, 1, 3, 4, 4, 3],
    electronic: [6, 5, 1, -2, -3, 1, 2, 4, 5, 6],
    pop: [-1, -1, 0, 2, 4, 4, 2, 0, -1, -1],
    rock: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5],
    vocal: [-2, -2, -1, 2, 5, 5, 4, 1, -1, -2],
    treble: [0, 0, 0, 0, 0, -1, -2, -3, -4, -5],
    spoken: [-4, -2, 0, 2, 4, 4, 2, 0, -2, -4]
  };
  let customPresets = {};

  async function loadCustomPresets() {
    const data = await browser.storage.local.get("customEqPresets");
    if (data.customEqPresets) {
      customPresets = data.customEqPresets;
    }
    renderCustomPresets();
    checkAndSelectMatchingPreset();
  }

  function renderCustomPresets() {
    customPresetsGroup.innerHTML = "";
    for (const name in customPresets) {
      const opt = document.createElement("option");
      opt.value = "custom_" + name;
      opt.textContent = name;
      customPresetsGroup.appendChild(opt);
    }
  }

  loadCustomPresets();

  eqPresetSelect.addEventListener("change", (e) => {
    const val = e.target.value;

    if (val.startsWith("custom_")) {
      deletePresetBtn.style.display = "inline-block";
      const name = val.replace("custom_", "");
      if (customPresets[name]) {
        setEqValues(customPresets[name]);
        eqToggle.checked = true;
        eqSection.style.opacity = "1";
        masterToggle.checked = isProcessingNeeded();
        syncState();
      }
    } else {
      deletePresetBtn.style.display = "none";
      if (val === "custom") return;
      const preset = predefinedPresets[val];
      if (preset) {
        setEqValues(preset);
        eqToggle.checked = true;
        eqSection.style.opacity = "1";
        masterToggle.checked = isProcessingNeeded();
        syncState();
      }
    }
  });

  const customModalOverlay = document.getElementById("customModalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const modalInput = document.getElementById("modalInput");
  const modalCancel = document.getElementById("modalCancel");
  const modalConfirm = document.getElementById("modalConfirm");

  function showModal(title, message, isPrompt, isAlert = false) {
    return new Promise((resolve) => {
      modalTitle.textContent = title;
      modalMessage.textContent = message;
      if (isPrompt) {
        modalInput.style.display = "block";
        modalInput.value = "";
        setTimeout(() => modalInput.focus(), 50);
      } else {
        modalInput.style.display = "none";
      }
      if (isAlert) {
        modalCancel.style.display = "none";
      } else {
        modalCancel.style.display = "inline-block";
      }
      customModalOverlay.style.display = "flex";

      const cleanup = () => {
        modalCancel.removeEventListener("click", onCancel);
        modalConfirm.removeEventListener("click", onConfirm);
        customModalOverlay.style.display = "none";
      };

      const onCancel = () => { cleanup(); resolve(null); };
      const onConfirm = () => { cleanup(); resolve(isPrompt ? modalInput.value : true); };

      modalCancel.addEventListener("click", onCancel);
      modalConfirm.addEventListener("click", onConfirm);
    });
  }
  savePresetBtn.addEventListener("click", async () => {
    const defaultMsg = getMessage("promptPresetName") || "Enter name for new EQ preset:";
    const titleMsg = getMessage("extName") || "Sound Master";
    const name = await showModal(titleMsg, defaultMsg, true);

    if (name && name.trim()) {
      const trimmedName = name.trim();
      customPresets[trimmedName] = getEqValues();
      await browser.storage.local.set({ customEqPresets: customPresets });
      renderCustomPresets();
      eqPresetSelect.value = "custom_" + trimmedName;
      deletePresetBtn.style.display = "inline-block";
    }
  });

  deletePresetBtn.addEventListener("click", async () => {
    const val = eqPresetSelect.value;
    if (val.startsWith("custom_")) {
      const name = val.replace("custom_", "");
      const confirmMsg = getMessage("confirmDeletePreset") || "Delete this preset permanently?";
      const titleMsg = getMessage("extName") || "Sound Master";
      const isConfirmed = await showModal(titleMsg, confirmMsg, false);

      if (isConfirmed) {
        delete customPresets[name];
        await browser.storage.local.set({ customEqPresets: customPresets });
        renderCustomPresets();
        eqPresetSelect.value = "custom";
        deletePresetBtn.style.display = "none";
      }
    }
  });

  bassToggle.addEventListener("change", () => {
    if (bassToggle.checked && bassSlider.value === "0") {
      bassToggle.checked = false;
    }
    masterToggle.checked = isProcessingNeeded();
    syncState();
  });

  balanceToggle.addEventListener("change", () => {
    if (balanceToggle.checked && parseFloat(balanceSlider.value) === 0) {
      balanceToggle.checked = false;
    }
    masterToggle.checked = isProcessingNeeded();
    syncState();
  });

  eqToggle.addEventListener("change", () => {
    const allZero = Array.from(eqSliders).every(s => parseInt(s.value, 10) === 0);
    if (eqToggle.checked && allZero) {
      eqToggle.checked = false;
    }
    eqSection.style.opacity = eqToggle.checked ? "1" : "0.5";
    masterToggle.checked = isProcessingNeeded();
    syncState();
  });

  resetEqBtn.addEventListener("click", () => {
    setEqValues([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    eqToggle.checked = false;
    eqSection.style.opacity = "0.5";
    if (eqPresetSelect.value !== "custom") eqPresetSelect.value = "custom";
    deletePresetBtn.style.display = "none";
    masterToggle.checked = isProcessingNeeded();
    syncState();
  });

  function checkAndSelectMatchingPreset() {
    const currentEq = getEqValues();

    for (const [key, values] of Object.entries(predefinedPresets)) {
      if (eqArraysEqual(currentEq, values)) {
        if (eqPresetSelect.value !== key) {
          eqPresetSelect.value = key;
          deletePresetBtn.style.display = "none";
        }
        return;
      }
    }

    for (const [name, values] of Object.entries(customPresets)) {
      if (eqArraysEqual(currentEq, values)) {
        const val = "custom_" + name;
        if (eqPresetSelect.value !== val) {
          eqPresetSelect.value = val;
          deletePresetBtn.style.display = "inline-block";
        }
        return;
      }
    }

    if (eqPresetSelect.value !== "custom") {
      eqPresetSelect.value = "custom";
      deletePresetBtn.style.display = "none";
    }
  }

  eqSliders.forEach((slider, index) => {
    slider.addEventListener("input", () => {
      eqNums[index].value = slider.value;
      checkAndSelectMatchingPreset();
      const allZero = Array.from(eqSliders).every(s => parseInt(s.value, 10) === 0);
      if (allZero) {
        eqToggle.checked = false;
        eqSection.style.opacity = "0.5";
      } else if (!eqToggle.checked) {
        eqToggle.checked = true;
        eqSection.style.opacity = "1";
      }
      masterToggle.checked = isProcessingNeeded();
    });
    slider.addEventListener("change", () => syncState());
  });

  eqNums.forEach((numInput, index) => {
    numInput.addEventListener("change", () => {
      let val = parseInt(numInput.value, 10);
      if (isNaN(val)) val = 0;
      if (val < -12) val = -12;
      if (val > 12) val = 12;
      numInput.value = val;
      eqSliders[index].value = val;
      checkAndSelectMatchingPreset();

      const allZero = Array.from(eqSliders).every(s => parseInt(s.value, 10) === 0);
      if (allZero) {
        eqToggle.checked = false;
        eqSection.style.opacity = "0.5";
      } else if (!eqToggle.checked) {
        eqToggle.checked = true;
        eqSection.style.opacity = "1";
      }
      masterToggle.checked = isProcessingNeeded();
      syncState();
    });
  });

  exportEqBtn.addEventListener("click", () => {
    const eq = getEqValues();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(eq));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "soundmaster_eq.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  });

  importEqBtn.addEventListener("click", () => {
    importEqFile.click();
  });

  importEqFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedEq = JSON.parse(event.target.result);
        if (Array.isArray(importedEq) && importedEq.length === 10) {
          setEqValues(importedEq);
          masterToggle.checked = isProcessingNeeded();
          syncState();
        } else {
          const titleMsg = getMessage("extName") || "Sound Master";
          const errorMsg = getMessage("errorInvalidEq") || "Invalid EQ file format.";
          showModal(titleMsg, errorMsg, false, true);
        }
      } catch (err) {
        const titleMsg = getMessage("extName") || "Sound Master";
        const errorMsg = getMessage("errorParseEq") || "Error parsing file.";
        showModal(titleMsg, errorMsg, false, true);
      }
    };
    reader.readAsText(file);
    importEqFile.value = "";
  });
});
