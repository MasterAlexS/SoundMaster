globalThis.browser = globalThis.browser || chrome;
document.addEventListener("DOMContentLoaded", async () => {
  const masterToggle = document.getElementById("masterToggle");
  const limitToggle = document.getElementById("limitToggle");
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const applyLastBtn = document.getElementById("applyLastBtn");
  const syncTabsBtn = document.getElementById("syncTabsBtn");
  const resetBtn = document.getElementById("resetBtn");
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

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.getAttribute("data-target")).classList.add("active");
    });
  });

  document.getElementById("manageShortcutsLink")?.addEventListener("click", () => {
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
    return currentVol !== 100 || bass !== 0 || hasEq || balance !== 0 || mono || compressor;
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
      if (msg) el.textContent = msg;
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

  let tabState = { enabled: false, volume: 100, extremeMode: false, bass: 0, bassEnabled: true, eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], eqEnabled: true, balance: 0, balanceEnabled: true, mono: false, compressor: false };
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

  updateUIText();

  function updateBalanceText() {
    let balVal = parseFloat(balanceSlider.value);
    if (balVal === 0) balanceValue.textContent = "C";
    else if (balVal < 0) balanceValue.textContent = "L" + Math.round(Math.abs(balVal) * 100);
    else balanceValue.textContent = "R" + Math.round(balVal * 100);
  }

  function formatStateSummary(state) {
    if (!state) return getMessage("resetBtn") || "Reset";
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
    if (parts.length === 0) return getMessage("resetBtn") || "Reset";
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

    tabState = { enabled: isEnabled, volume: currentVol, extremeMode: isExtreme, bass: currentBass, bassEnabled: isBassEnabled, eq: currentEq, eqEnabled: isEqEnabled, balance: currentBalance, balanceEnabled: isBalanceEnabled, mono: isMono, compressor: isCompressor };

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
        monoToggle.checked = dState.mono || false;
        compressorToggle.checked = dState.compressor || false;
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

  syncTabsBtn?.addEventListener("click", () => {
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

  resetBtn.addEventListener("click", () => {
    volumeSlider.value = "100";
    
    bassToggle.checked = false;
    bassSlider.value = "0";
    
    eqToggle.checked = false;
    setEqValues([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    eqSection.style.opacity = "0.5";
    
    balanceToggle.checked = false;
    balanceSlider.value = "0";
    
    monoToggle.checked = false;
    compressorToggle.checked = false;

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
    if (parseFloat(balanceSlider.value) === 0) {
      balanceToggle.checked = false;
    } else if (!balanceToggle.checked) {
      balanceToggle.checked = true;
    }
    updateUIText();
    masterToggle.checked = isProcessingNeeded();
  });
  balanceSlider.addEventListener("change", () => syncState());
  monoToggle.addEventListener("change", () => { masterToggle.checked = isProcessingNeeded(); syncState(); });
  compressorToggle.addEventListener("change", () => { masterToggle.checked = isProcessingNeeded(); syncState(); });

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
    masterToggle.checked = isProcessingNeeded();
    syncState();
  });

  eqSliders.forEach((slider, index) => {
    slider.addEventListener("input", () => {
      eqNums[index].value = slider.value;
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
          alert("Invalid EQ file format.");
        }
      } catch (err) {
        alert("Error parsing file.");
      }
    };
    reader.readAsText(file);
    importEqFile.value = "";
  });
});
