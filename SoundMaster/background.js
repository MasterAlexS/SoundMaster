globalThis.browser = globalThis.browser || chrome;
browser.runtime.onStartup.addListener(async () => {
  const allData = await browser.storage.local.get();
  const keysToRemove = Object.keys(allData).filter(key => key.startsWith("tab_"));
  if (keysToRemove.length > 0) {
    await browser.storage.local.remove(keysToRemove);
  }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateBadge") {
    updateTabBadge(message.tabId, message.enabled, message.volume);
  } 
  else if (message.action === "panicMute") {
    handlePanicMute().then(isMuted => sendResponse(isMuted));
    return true;
  }
  else if (message.action === "getPanicState") {
    sendResponse(mutedTabsByPanic.size > 0);
    return true;
  }
  else if (message.action === "updateShortcutsState") {
    disabledCommands = message.disabledCommands;
  }
  else if (message.action === "getContentSettings") {
    const tabId = sender.tab.id;
    let storageKey = `tab_${tabId}`;

    browser.storage.local.get(storageKey).then(res => {
      const state = res[storageKey];
      if (state) {
        sendResponse(state);
        updateTabBadge(tabId, state.enabled, state.volume);
      } else {
        sendResponse({ enabled: false, volume: 100, bass: 0, bassEnabled: false, eq: [0,0,0,0,0,0,0,0,0,0], eqEnabled: false, balance: 0, balanceEnabled: false, mono: false, compressor: false, speed: 1.0, pitch: false, reverb: false });
      }
    });
    return true;
  }
  else if (message.action === "syncDomainTabs") {
    const { domain, state } = message;
    browser.tabs.query({}).then(tabs => {
      tabs.forEach(tab => {
        if (!tab.url) return;
        try {
          const u = new URL(tab.url);
          if (u.hostname === domain) {
            browser.storage.local.set({ [`tab_${tab.id}`]: state });
            updateTabBadge(tab.id, state.enabled, state.volume);
            browser.tabs.sendMessage(tab.id, {
              action: "updateVolume",
              volume: state.volume,
              enabled: state.enabled,
              bass: state.bass || 0,
              bassEnabled: state.bassEnabled !== false,
              eq: state.eq || [0,0,0,0,0,0,0,0,0,0],
              eqEnabled: state.eqEnabled !== false,
              balance: state.balance || 0,
              balanceEnabled: state.balanceEnabled !== false,
              mono: state.mono || false,
              compressor: state.compressor || false,
              speed: state.speed || 1.0,
              pitch: state.pitch || false,
              reverb: state.reverb || false
            }).catch(()=>{});
          }
        } catch(e){}
      });
    });
    sendResponse({ success: true });
    return true;
  }
});

let disabledCommands = {};
browser.storage.local.get(["disabledCommands"]).then(res => {
  disabledCommands = res.disabledCommands || {};
});

browser.commands.onCommand.addListener(async (command) => {
  if (disabledCommands[command]) return;

  if (command === "panic-mute") {
    handlePanicMute();
    return;
  }

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tabs || tabs.length === 0) return;
  const currentTab = tabs[0];
  const tabId = currentTab.id;

  let storageKey = `tab_${tabId}`;

  const data = await browser.storage.local.get([storageKey, "globalLastVolume"]);
  let state = data[storageKey] || { enabled: false, volume: 100, extremeMode: false, bass: 0, bassEnabled: false, eq: [0,0,0,0,0,0,0,0,0,0], eqEnabled: false, balance: 0, balanceEnabled: false, mono: false, compressor: false, speed: 1.0, pitch: false, reverb: false };

  if (command === "toggle-boost") {
    state.enabled = !state.enabled;
    if (state.enabled && state.volume === 100 && state.bass === 0 && (!state.eq || !state.eq.some(v => v!==0)) && state.balance === 0 && !state.mono && !state.compressor) {
      state.volume = 110; 
    }
  } else if (command === "volume-up") {
    state.volume = Math.min(state.extremeMode ? 1000 : 600, state.volume + 10);
    const hasEq = state.eqEnabled !== false && state.eq ? state.eq.some(v => v !== 0) : false;
    state.enabled = state.volume !== 100 || state.bass !== 0 || hasEq || state.balance !== 0 || state.mono || state.compressor;
  } else if (command === "volume-down") {
    state.volume = Math.max(0, state.volume - 10);
    const hasEq = state.eqEnabled !== false && state.eq ? state.eq.some(v => v !== 0) : false;
    state.enabled = state.volume !== 100 || state.bass !== 0 || hasEq || state.balance !== 0 || state.mono || state.compressor;
  }

  let dataToSave = { [storageKey]: state };
  if (state.enabled && state.volume !== 100) {
    dataToSave.globalLastVolume = state.volume;
  }
  await browser.storage.local.set(dataToSave);
  
  updateTabBadge(tabId, state.enabled, state.volume);
  
  try {
    await browser.runtime.sendMessage({
      action: "stateUpdatedFromBackground",
      state: state
    });
  } catch(e) {}
  
  try {
    await browser.tabs.sendMessage(tabId, {
      action: "updateVolume",
      volume: state.volume,
      enabled: state.enabled,
      bass: state.bass || 0,
      eq: state.eq || [0,0,0,0,0,0,0,0,0,0],
      eqEnabled: state.eqEnabled !== undefined ? state.eqEnabled : true,
      balance: state.balance || 0,
      mono: state.mono || false,
      compressor: state.compressor || false
    });
  } catch (err) {}
});

let mutedTabsByPanic = new Set();
async function handlePanicMute() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTabId = tabs[0]?.id;

  if (mutedTabsByPanic.size > 0) {
    for (let tabId of mutedTabsByPanic) {
      try { browser.tabs.update(tabId, { muted: false }); } catch(e) {}
    }
    mutedTabsByPanic.clear();
    return false; // unmuted
  } else {
    const audibleTabs = await browser.tabs.query({ audible: true });
    for (let tab of audibleTabs) {
      if (tab.id !== activeTabId) {
        browser.tabs.update(tab.id, { muted: true });
        mutedTabsByPanic.add(tab.id);
      }
    }
    return true; // muted
  }
}

function updateTabBadge(tabId, enabled, volume) {
  if (enabled) {
    let text = volume >= 1000 ? "1K" : volume.toString();
    browser.action.setBadgeText({ text: text, tabId: tabId });
    
    let r, g;
    if (volume <= 100) {
      r = 0; g = 255;
    } else if (volume <= 600) {
      r = Math.round(((volume - 100) / 500) * 255);
      g = 255;
    } else {
      r = 255;
      g = Math.round(255 - ((volume - 600) / 400) * 255);
    }
    
    browser.action.setBadgeBackgroundColor({ 
      color: [r, g, 0, 255], 
      tabId: tabId 
    });
  } else {
    browser.action.setBadgeText({ text: "", tabId: tabId });
  }
}

browser.tabs.onRemoved.addListener((tabId) => {
  browser.storage.local.remove(`tab_${tabId}`);
  if (mutedTabsByPanic) {
    mutedTabsByPanic.delete(tabId);
  }
});
