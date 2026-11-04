globalThis.browser = globalThis.browser || chrome;

const DEFAULT_STATE = {
  enabled: false,
  volume: 100,
  extremeMode: false,
  bass: 0,
  bassEnabled: false,
  eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  eqEnabled: false,
  balance: 0,
  balanceEnabled: false,
  mono: false,
  compressor: false,
  speed: 1.0,
  speedEnabled: false,
  pitch: 0,
  pitchEnabled: false,
  reverb: false
};

function isStateActive(state) {
  if (!state) return false;
  const hasEq = state.eqEnabled !== false && Array.isArray(state.eq) && state.eq.some(v => v !== 0);
  const hasBass = state.bassEnabled !== false && (state.bass || 0) !== 0;
  const hasBalance = state.balanceEnabled !== false && (state.balance || 0) !== 0;
  const hasSpeed = state.speedEnabled !== false && state.speed && state.speed !== 1.0;
  const hasPitch = state.pitchEnabled !== false && state.pitch && state.pitch !== 0;
  return (
    (state.volume !== undefined && state.volume !== 100) ||
    hasBass ||
    hasEq ||
    hasBalance ||
    Boolean(state.mono) ||
    Boolean(state.compressor) ||
    hasSpeed ||
    hasPitch ||
    Boolean(state.reverb)
  );
}

browser.runtime.onStartup.addListener(async () => {
  const allData = await browser.storage.local.get(null);
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
    disabledCommands = message.disabledCommands || {};
  } 
  else if (message.action === "getContentSettings") {
    if (!sender.tab || typeof sender.tab.id !== "number") {
      sendResponse(DEFAULT_STATE);
      return false;
    }

    const tabId = sender.tab.id;
    const storageKey = `tab_${tabId}`;

    browser.storage.local.get(storageKey).then(res => {
      const state = res[storageKey];
      if (state) {
        sendResponse({ ...DEFAULT_STATE, ...state });
        if (sender.frameId === 0) {
          updateTabBadge(tabId, state.enabled, state.volume);
        }
      } else {
        sendResponse(DEFAULT_STATE);
      }
    });
    return true;
  } 
  else if (message.action === "syncDomainTabs") {
    const { domain, state } = message;
    const fullState = { ...DEFAULT_STATE, ...state };

    browser.tabs.query({}).then(tabs => {
      const storageUpdates = {};
      if (isStateActive(fullState)) {
        storageUpdates[`domain_${domain}`] = fullState;
      }

      tabs.forEach(tab => {
        if (!tab.url) return;
        try {
          const u = new URL(tab.url);
          if (u.hostname === domain) {
            storageUpdates[`tab_${tab.id}`] = fullState;
            updateTabBadge(tab.id, fullState.enabled, fullState.volume);
            browser.tabs.sendMessage(tab.id, {
              action: "updateVolume",
              ...fullState
            }).catch(() => {});
          }
        } catch (e) {}
      });

      if (Object.keys(storageUpdates).length > 0) {
        browser.storage.local.set(storageUpdates);
      }
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
  const storageKey = `tab_${tabId}`;

  const data = await browser.storage.local.get([storageKey]);
  const state = { ...DEFAULT_STATE, ...(data[storageKey] || {}) };

  if (command === "toggle-boost") {
    state.enabled = !state.enabled;
    if (state.enabled && !isStateActive(state)) {
      state.volume = 110;
    }
  } else if (command === "volume-up") {
    state.volume = Math.min(state.extremeMode ? 1000 : 600, state.volume + 10);
    state.enabled = isStateActive(state);
  } else if (command === "volume-down") {
    state.volume = Math.max(0, state.volume - 10);
    state.enabled = isStateActive(state);
  }

  const dataToSave = { [storageKey]: state };
  try {
    if (currentTab.url) {
      const urlObj = new URL(currentTab.url);
      if (urlObj.hostname && isStateActive(state)) {
        dataToSave[`domain_${urlObj.hostname}`] = state;
      }
    }
  } catch (e) {}

  await browser.storage.local.set(dataToSave);
  updateTabBadge(tabId, state.enabled, state.volume);

  browser.runtime.sendMessage({
    action: "stateUpdatedFromBackground",
    state: state
  }).catch(() => {});

  browser.tabs.sendMessage(tabId, {
    action: "updateVolume",
    ...state
  }).catch(() => {});
});

const mutedTabsByPanic = new Set();
async function handlePanicMute() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTabId = tabs[0]?.id;

  if (mutedTabsByPanic.size > 0) {
    for (const tabId of mutedTabsByPanic) {
      try { browser.tabs.update(tabId, { muted: false }); } catch (e) {}
    }
    mutedTabsByPanic.clear();
    return false;
  } else {
    const audibleTabs = await browser.tabs.query({ audible: true });
    for (const tab of audibleTabs) {
      if (tab.id !== activeTabId) {
        browser.tabs.update(tab.id, { muted: true });
        mutedTabsByPanic.add(tab.id);
      }
    }
    return true;
  }
}

function updateTabBadge(tabId, enabled, volume) {
  if (enabled) {
    const text = volume >= 1000 ? "1K" : volume.toString();
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
  mutedTabsByPanic.delete(tabId);
});
