globalThis.browser = globalThis.browser || chrome;
let audioCtx = null;
let bassNode = null;
let pannerNode = null;
let gainNode = null;
let compressorNode = null;
let monoNode = null;

let connectedElements = new WeakSet();
let mediaSources = [];

let currentVolume = 100;
let currentBass = 0;
let currentEQ = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let isEqEnabled = true;
let currentBalance = 0;
let isMono = false;
let isCompressorEnabled = false;
let isBoostEnabled = false;

let eqNodes = [];
const eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    bassNode = audioCtx.createBiquadFilter();
    bassNode.type = "lowshelf";
    bassNode.frequency.value = 150;
    
    eqNodes = eqFrequencies.map((freq, index) => {
      const node = audioCtx.createBiquadFilter();
      if (index === 0) node.type = "lowshelf";
      else if (index === 9) node.type = "highshelf";
      else node.type = "peaking";
      node.frequency.value = freq;
      return node;
    });
    
    pannerNode = audioCtx.createStereoPanner();
    
    monoNode = audioCtx.createGain();
    
    gainNode = audioCtx.createGain();
    
    compressorNode = audioCtx.createDynamicsCompressor();
    compressorNode.threshold.value = -3;
    compressorNode.knee.value = 10;
    compressorNode.ratio.value = 12;
    compressorNode.attack.value = 0.003;
    compressorNode.release.value = 0.25;
    
    pannerNode.connect(monoNode);
    monoNode.connect(gainNode);
    
    setEqRouting();
    setCompressorRouting();
  }
}

function setCompressorRouting() {
  if (!audioCtx || !gainNode || !compressorNode) return;
  try { gainNode.disconnect(); } catch(e) {}
  try { compressorNode.disconnect(); } catch(e) {}
  
  if (isCompressorEnabled) {
    gainNode.connect(compressorNode);
    compressorNode.connect(audioCtx.destination);
  } else {
    gainNode.connect(audioCtx.destination);
  }
}

function setEqRouting() {
  if (!audioCtx || !bassNode || !pannerNode) return;
  try { bassNode.disconnect(); } catch(e) {}
  try { eqNodes[9].disconnect(); } catch(e) {}
  
  if (isEqEnabled) {
    bassNode.connect(eqNodes[0]);
    for (let i = 0; i < 9; i++) {
      try { eqNodes[i].disconnect(); } catch(e) {}
      eqNodes[i].connect(eqNodes[i + 1]);
    }
    eqNodes[9].connect(pannerNode);
  } else {
    bassNode.connect(pannerNode);
  }
}

function setMainRouting() {
  if (!audioCtx) return;
  mediaSources.forEach(source => {
    try { source.disconnect(); } catch(e) {}
    if (isBoostEnabled) {
      source.connect(bassNode);
    } else {
      source.connect(audioCtx.destination);
    }
  });
}

function updateAudioNodes() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => { });
  }

  setMainRouting();
  setEqRouting();
  setCompressorRouting();

  if (isBoostEnabled) {
    gainNode.gain.value = currentVolume / 100;
    bassNode.gain.value = currentBass;
    if (eqNodes.length > 0) {
      if (isEqEnabled) {
        eqNodes.forEach((node, i) => { node.gain.value = currentEQ[i]; });
      } else {
        eqNodes.forEach(node => { node.gain.value = 0; });
      }
    }
    pannerNode.pan.value = currentBalance;
    
    if (isMono) {
      monoNode.channelCount = 1;
      monoNode.channelCountMode = "explicit";
    } else {
      monoNode.channelCount = 2;
      monoNode.channelCountMode = "max";
    }
  } else {
    gainNode.gain.value = 1;
    bassNode.gain.value = 0;
    if (eqNodes.length > 0) {
      eqNodes.forEach(node => { node.gain.value = 0; });
    }
    pannerNode.pan.value = 0;
    monoNode.channelCount = 2;
    monoNode.channelCountMode = "max";
  }
}

function hookMediaElements() {
  const mediaElements = document.querySelectorAll('video, audio');
  if (mediaElements.length === 0) return;

  mediaElements.forEach(el => {
    if (!connectedElements.has(el)) {
      initAudioContext();
      try {
        const source = audioCtx.createMediaElementSource(el);
        mediaSources.push(source);
        if (isBoostEnabled) {
          source.connect(bassNode);
        } else {
          source.connect(audioCtx.destination);
        }
        connectedElements.add(el);
      } catch (error) {
        console.warn("Sound Master: Could not hook media element.", error);
      }
    }
  });
}

let hookTimeout;
let observerInstance = null;

function startObserver() {
  if (!observerInstance && document.body) {
    observerInstance = new MutationObserver((mutations) => {
      let hasPotentialMedia = false;
      for (let mutation of mutations) {
        for (let node of mutation.addedNodes) {
          if (node.nodeName === 'VIDEO' || node.nodeName === 'AUDIO') {
            hasPotentialMedia = true;
            break;
          }
          if (node.querySelectorAll && node.querySelectorAll('video, audio').length > 0) {
            hasPotentialMedia = true;
            break;
          }
        }
        if (hasPotentialMedia) break;
      }
      
      if (hasPotentialMedia) {
        clearTimeout(hookTimeout);
        hookTimeout = setTimeout(() => {
          hookMediaElements();
        }, 300);
      }
    });
    observerInstance.observe(document.body, { childList: true, subtree: true });
  }
}

function stopObserver() {
  if (observerInstance) {
    observerInstance.disconnect();
    observerInstance = null;
  }
}

async function autoInit() {
  const settings = await browser.runtime.sendMessage({ action: "getContentSettings" });

  if (settings && settings.enabled) {
    currentVolume = settings.volume || 100;
    currentBass = settings.bass || 0;
    currentEQ = settings.eq || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    isEqEnabled = settings.eqEnabled !== undefined ? settings.eqEnabled : true;
    currentBalance = settings.balance || 0;
    isMono = settings.mono || false;
    isCompressorEnabled = settings.compressor || false;
    isBoostEnabled = true;
    
    initAudioContext();
    hookMediaElements();
    updateAudioNodes();
    startObserver();
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "updateVolume") {
    currentVolume = message.volume;
    isBoostEnabled = message.enabled;
    if (message.bass !== undefined) currentBass = message.bass;
    if (message.eq !== undefined) currentEQ = message.eq;
    if (message.eqEnabled !== undefined) isEqEnabled = message.eqEnabled;
    if (message.balance !== undefined) currentBalance = message.balance;
    if (message.mono !== undefined) isMono = message.mono;
    if (message.compressor !== undefined) {
      if (isCompressorEnabled !== message.compressor) {
        isCompressorEnabled = message.compressor;
        setCompressorRouting();
      }
    }

    if (isBoostEnabled) {
      initAudioContext();
      hookMediaElements();
      updateAudioNodes();
      startObserver();
    } else {
      updateAudioNodes();
      stopObserver();
    }
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoInit);
} else {
  autoInit();
}
