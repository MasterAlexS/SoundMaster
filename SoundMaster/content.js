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
let isBassEnabled = true;
let currentEQ = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let isEqEnabled = true;
let currentBalance = 0;
let isBalanceEnabled = true;
let isMono = false;
let isCompressorEnabled = false;
let isBoostEnabled = false;

let isReverbEnabled = false;
let reverbNode = null;
let currentSpeed = 1.0;
let isSpeedEnabled = false;
let currentPitch = 0;
let isPitchEnabled = false;
let isBypassed = false;
let pitchNode = null;

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
    
    reverbNode = audioCtx.createConvolver();
    reverbNode.buffer = generateReverb(audioCtx);
    
    pitchNode = new Jungle(audioCtx);
    

    
    setEqRouting();
    setReverbRouting();
    setCompressorRouting();
  }
}

function generateReverb() {
  const sampleRate = audioCtx.sampleRate;
  const length = sampleRate * 2.5; 
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const decay = Math.exp(-i / (sampleRate * 0.5)); 
    left[i] = (Math.random() * 2 - 1) * decay;
    right[i] = (Math.random() * 2 - 1) * decay;
  }
  return impulse;
}

function setReverbRouting() {
  if (!audioCtx || !monoNode || !gainNode || !reverbNode) return;
  try { monoNode.disconnect(); } catch(e) {}
  try { reverbNode.disconnect(); } catch(e) {}
  
  if (isReverbEnabled && !isBypassed) {
    monoNode.connect(gainNode); // Dry signal
    monoNode.connect(reverbNode); // Wet signal
    reverbNode.connect(gainNode);
  } else {
    monoNode.connect(gainNode);
  }
}

function setCompressorRouting() {
  if (!audioCtx || !gainNode || !compressorNode) return;
  try { gainNode.disconnect(); } catch(e) {}
  try { compressorNode.disconnect(); } catch(e) {}
  
  if (isCompressorEnabled && !isBypassed) {
    gainNode.connect(compressorNode);
    compressorNode.connect(audioCtx.destination);

  } else {
    gainNode.connect(audioCtx.destination);

  }
}

function setEqRouting() {
  if (!audioCtx || !bassNode || !pannerNode || !pitchNode) return;
  try { bassNode.disconnect(); } catch(e) {}
  try { eqNodes[9].disconnect(); } catch(e) {}
  
  let nextNode;
  if (isEqEnabled) {
    for (let i = 0; i < 9; i++) {
      try { eqNodes[i].disconnect(); } catch(e) {}
      eqNodes[i].connect(eqNodes[i + 1]);
    }
    eqNodes[9].connect(pannerNode);
    nextNode = eqNodes[0];
  } else {
    nextNode = pannerNode;
  }
  
  if (isPitchEnabled && currentPitch !== 0 && !isBypassed) {
    bassNode.connect(pitchNode.input);
    try { pitchNode.output.disconnect(); } catch(e) {}
    pitchNode.output.connect(nextNode);
    let pitchRatio = Math.pow(2, currentPitch / 12);
    let mult = (pitchRatio - 1) * 2;
    pitchNode.setPitchOffset(mult);
  } else {
    bassNode.connect(nextNode);
  }
}

function setMainRouting() {
  if (!audioCtx) return;
  mediaSources.forEach(source => {
    try { source.disconnect(); } catch(e) {}
    if (isBoostEnabled && !isBypassed) {
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
    bassNode.gain.value = isBassEnabled ? currentBass : 0;
    if (eqNodes.length > 0) {
      if (isEqEnabled) {
        eqNodes.forEach((node, i) => { node.gain.value = currentEQ[i]; });
      } else {
        eqNodes.forEach(node => { node.gain.value = 0; });
      }
    }
    pannerNode.pan.value = isBalanceEnabled ? currentBalance : 0;
    
    if (isPitchEnabled && currentPitch !== 0) {
      let pitchRatio = Math.pow(2, currentPitch / 12);
      let mult = (pitchRatio - 1) * 2;
      pitchNode.setPitchOffset(mult);
    }
    
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
  applySpeedAndPitch();
}

let wasSpeedOverridden = false;

function applySpeedAndPitch() {
  const shouldOverride = isBoostEnabled && isSpeedEnabled && !isBypassed;
  const els = [...document.getElementsByTagName('video'), ...document.getElementsByTagName('audio')];
  
  if (shouldOverride) {
    els.forEach(el => {
      if (el.playbackRate !== currentSpeed) {
        el.playbackRate = currentSpeed;
      }
      if (el.preservesPitch !== true) {
        el.preservesPitch = true;
        if (el.mozPreservesPitch !== undefined) el.mozPreservesPitch = true;
        if (el.webkitPreservesPitch !== undefined) el.webkitPreservesPitch = true;
      }
    });
    wasSpeedOverridden = true;
  } else {
    if (wasSpeedOverridden) {
      els.forEach(el => {
        el.playbackRate = 1.0;
      });
      wasSpeedOverridden = false;
    }
  }
}

function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => { });
  }
}

function createFadeBuffer(context, activeTime, fadeTime) {
  var length1 = activeTime * context.sampleRate;
  var length2 = (activeTime - 2*fadeTime) * context.sampleRate;
  var length = length1 + length2;
  var buffer = context.createBuffer(1, length, context.sampleRate);
  var p = buffer.getChannelData(0);
  var fadeLength = fadeTime * context.sampleRate;
  var fadeIndex1 = fadeLength;
  var fadeIndex2 = length1 - fadeLength;
  for (var i = 0; i < length1; ++i) {
      if (i < fadeIndex1) p[i] = Math.sqrt(i / fadeLength);
      else if (i >= fadeIndex2) p[i] = Math.sqrt(1 - (i - fadeIndex2) / fadeLength);
      else p[i] = 1;
  }
  for (var i = length1; i < length; ++i) p[i] = 0;
  return buffer;
}

function createDelayTimeBuffer(context, activeTime, fadeTime, shiftUp) {
  var length1 = activeTime * context.sampleRate;
  var length2 = (activeTime - 2*fadeTime) * context.sampleRate;
  var length = length1 + length2;
  var buffer = context.createBuffer(1, length, context.sampleRate);
  var p = buffer.getChannelData(0);
  for (var i = 0; i < length1; ++i) {
      if (shiftUp) p[i] = (length1-i)/length;
      else p[i] = i / length1;
  }
  for (var i = length1; i < length; ++i) p[i] = 0;
  return buffer;
}

function Jungle(context) {
  this.context = context;
  var delayTime = 0.040;
  var fadeTime = 0.020;
  var bufferTime = 0.040;
  var input = context.createGain();
  var output = context.createGain();
  this.input = input;
  this.output = output;
  var mod1 = context.createBufferSource();
  var mod2 = context.createBufferSource();
  var mod3 = context.createBufferSource();
  var mod4 = context.createBufferSource();
  this.shiftDownBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, false);
  this.shiftUpBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, true);
  mod1.buffer = this.shiftDownBuffer;
  mod2.buffer = this.shiftDownBuffer;
  mod3.buffer = this.shiftUpBuffer;
  mod4.buffer = this.shiftUpBuffer;
  mod1.loop = true;
  mod2.loop = true;
  mod3.loop = true;
  mod4.loop = true;
  var mod1Gain = context.createGain();
  var mod2Gain = context.createGain();
  var mod3Gain = context.createGain();
  mod3Gain.gain.value = 0;
  var mod4Gain = context.createGain();
  mod4Gain.gain.value = 0;
  mod1.connect(mod1Gain);
  mod2.connect(mod2Gain);
  mod3.connect(mod3Gain);
  mod4.connect(mod4Gain);
  var modGain1 = context.createGain();
  var modGain2 = context.createGain();
  var delay1 = context.createDelay();
  var delay2 = context.createDelay();
  mod1Gain.connect(modGain1);
  mod2Gain.connect(modGain2);
  mod3Gain.connect(modGain1);
  mod4Gain.connect(modGain2);
  modGain1.connect(delay1.delayTime);
  modGain2.connect(delay2.delayTime);
  var fade1 = context.createBufferSource();
  var fade2 = context.createBufferSource();
  var fadeBuffer = createFadeBuffer(context, bufferTime, fadeTime);
  fade1.buffer = fadeBuffer
  fade2.buffer = fadeBuffer;
  fade1.loop = true;
  fade2.loop = true;
  var mix1 = context.createGain();
  var mix2 = context.createGain();
  mix1.gain.value = 0;
  mix2.gain.value = 0;
  fade1.connect(mix1.gain);    
  fade2.connect(mix2.gain);
  input.connect(delay1);
  input.connect(delay2);    
  delay1.connect(mix1);
  delay2.connect(mix2);
  mix1.connect(output);
  mix2.connect(output);
  var t = context.currentTime + 0.050;
  var t2 = t + bufferTime - fadeTime;
  mod1.start(t);
  mod2.start(t2);
  mod3.start(t);
  mod4.start(t2);
  fade1.start(t);
  fade2.start(t2);
  this.modGain1 = modGain1;
  this.modGain2 = modGain2;
  this.mod1Gain = mod1Gain;
  this.mod2Gain = mod2Gain;
  this.mod3Gain = mod3Gain;
  this.mod4Gain = mod4Gain;
  this.delayTime = delayTime;
  this.setDelay(delayTime);
}

Jungle.prototype.setDelay = function(delayTime) {
  this.modGain1.gain.setTargetAtTime(0.5*delayTime, 0, 0.010);
  this.modGain2.gain.setTargetAtTime(0.5*delayTime, 0, 0.010);
}

Jungle.prototype.setPitchOffset = function(mult) {
  if (mult>0) {
      this.mod1Gain.gain.value = 0;
      this.mod2Gain.gain.value = 0;
      this.mod3Gain.gain.value = 1;
      this.mod4Gain.gain.value = 1;
  } else {
      this.mod1Gain.gain.value = 1;
      this.mod2Gain.gain.value = 1;
      this.mod3Gain.gain.value = 0;
      this.mod4Gain.gain.value = 0;
  }
  this.setDelay(this.delayTime*Math.abs(mult));
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === 'visible') resumeAudioContext();
});
document.addEventListener("click", resumeAudioContext, { passive: true });
document.addEventListener("keydown", resumeAudioContext, { passive: true });

function hookMediaElements() {
  const videos = document.getElementsByTagName('video');
  const audios = document.getElementsByTagName('audio');
  let newlyHooked = false;

  const processElement = (el) => {
    if (!connectedElements.has(el)) {
      initAudioContext();
      try {
        const source = audioCtx.createMediaElementSource(el);
        mediaSources.push(source);
        if (isBoostEnabled && !isBypassed) {
          source.connect(bassNode);
        } else {
          source.connect(audioCtx.destination);
        }
        connectedElements.add(el);
        newlyHooked = true;
        
        const enforceSpeed = (e) => {
          const shouldOverride = isBoostEnabled && isSpeedEnabled && !isBypassed;
          if (shouldOverride && e.target.playbackRate !== currentSpeed) {
            e.target.playbackRate = currentSpeed;
          }
        };

        el.addEventListener('ratechange', enforceSpeed);
        el.addEventListener('play', enforceSpeed);
        el.addEventListener('playing', enforceSpeed);
        el.addEventListener('loadeddata', enforceSpeed);
        el.addEventListener('loadedmetadata', enforceSpeed);
        
        const shouldOverride = isBoostEnabled && isSpeedEnabled && !isBypassed;
        if (shouldOverride && el.playbackRate !== currentSpeed) {
          el.playbackRate = currentSpeed;
        }
      } catch (error) {
        console.warn("Sound Master: Could not hook media element.", error);
      }
    }
  };

  for (let i = 0; i < videos.length; i++) processElement(videos[i]);
  for (let i = 0; i < audios.length; i++) processElement(audios[i]);
  if (newlyHooked) resumeAudioContext();
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
          if (node.getElementsByTagName) {
            if (node.getElementsByTagName('video').length > 0 || node.getElementsByTagName('audio').length > 0) {
              hasPotentialMedia = true;
              break;
            }
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
    isBassEnabled = settings.bassEnabled !== false;
    currentEQ = settings.eq || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    isEqEnabled = settings.eqEnabled !== false;
    currentBalance = settings.balance || 0;
    isBalanceEnabled = settings.balanceEnabled !== false;
    isMono = settings.mono || false;
    isCompressorEnabled = settings.compressor || false;
    currentSpeed = settings.speed || 1.0;
    isSpeedEnabled = settings.speedEnabled !== false;
    currentPitch = settings.pitch || 0;
    isPitchEnabled = settings.pitchEnabled !== false;
    isBypassed = false;
    isReverbEnabled = settings.reverb || false;
    isBoostEnabled = true;
    
    initAudioContext();
    hookMediaElements();
    updateAudioNodes();
    startObserver();
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "updateVolume") {
    if (message.volume !== undefined) currentVolume = message.volume;
    if (message.enabled !== undefined) isBoostEnabled = message.enabled;
    if (message.bass !== undefined) currentBass = message.bass;
    if (message.bassEnabled !== undefined) isBassEnabled = message.bassEnabled;
    if (message.eq !== undefined) currentEQ = message.eq;
    if (message.eqEnabled !== undefined) isEqEnabled = message.eqEnabled;
    if (message.balance !== undefined) currentBalance = message.balance;
    if (message.balanceEnabled !== undefined) isBalanceEnabled = message.balanceEnabled;
    if (message.mono !== undefined) isMono = message.mono;
    if (message.compressor !== undefined) {
      if (isCompressorEnabled !== message.compressor) {
        isCompressorEnabled = message.compressor;
        setCompressorRouting();
      }
    }
    if (message.speed !== undefined) currentSpeed = message.speed;
    if (message.speedEnabled !== undefined) isSpeedEnabled = message.speedEnabled;
    if (message.pitch !== undefined) currentPitch = message.pitch;
    if (message.pitchEnabled !== undefined) isPitchEnabled = message.pitchEnabled;
    if (message.reverb !== undefined) {
      if (isReverbEnabled !== message.reverb) {
        isReverbEnabled = message.reverb;
        setReverbRouting();
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
  } else if (message.action === "bypassFilters") {
    isBypassed = message.bypassed;
    setMainRouting();
    setReverbRouting();
    setCompressorRouting();
    updateAudioNodes();
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoInit);
} else {
  autoInit();
}
