globalThis.browser = globalThis.browser || chrome;

let audioCtx = null;
let bassNode = null;
let pitchNode = null;
let eqNodes = [];
let reverbNode = null;
let reverbWetGain = null;
let preReverbBus = null;
let gainNode = null;
let compressorNode = null;
let monoNode = null;
let pannerNode = null;

const connectedElements = new WeakSet();
const mediaSources = [];
let unlockListenersAttached = false;
let lastRoutingKey = "";

let currentVolume = 100;
let currentBass = 0;
let isBassEnabled = false;
let currentEQ = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let isEqEnabled = false;
let currentBalance = 0;
let isBalanceEnabled = false;
let isMono = false;
let isCompressorEnabled = false;
let isBoostEnabled = false;
let isReverbEnabled = false;
let currentSpeed = 1.0;
let isSpeedEnabled = false;
let currentPitch = 0;
let isPitchEnabled = false;
let isBypassed = false;

const eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

function resumeAudioContext() {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    attachUnlockListeners();
    audioCtx.resume().then(() => {
      if (audioCtx.state === "running") removeUnlockListeners();
    }).catch(() => {});
  } else if (audioCtx.state === "running") {
    removeUnlockListeners();
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") resumeAudioContext();
}

function attachUnlockListeners() {
  if (unlockListenersAttached) return;
  unlockListenersAttached = true;
  document.addEventListener("visibilitychange", onVisibilityChange);
  document.addEventListener("click", resumeAudioContext, { passive: true });
  document.addEventListener("keydown", resumeAudioContext, { passive: true });
  document.addEventListener("pointerdown", resumeAudioContext, { passive: true });
  document.addEventListener("touchstart", resumeAudioContext, { passive: true });
}

function removeUnlockListeners() {
  if (!unlockListenersAttached) return;
  unlockListenersAttached = false;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  document.removeEventListener("click", resumeAudioContext);
  document.removeEventListener("keydown", resumeAudioContext);
  document.removeEventListener("pointerdown", resumeAudioContext);
  document.removeEventListener("touchstart", resumeAudioContext);
}

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();

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

    preReverbBus = audioCtx.createGain();
    gainNode = audioCtx.createGain();

    compressorNode = audioCtx.createDynamicsCompressor();
    compressorNode.threshold.value = -3;
    compressorNode.knee.value = 10;
    compressorNode.ratio.value = 12;
    compressorNode.attack.value = 0.003;
    compressorNode.release.value = 0.25;

    monoNode = audioCtx.createGain();
    monoNode.channelCount = 1;
    monoNode.channelCountMode = "explicit";
    monoNode.channelInterpretation = "speakers";
    pannerNode = audioCtx.createStereoPanner();

    attachUnlockListeners();
    rebuildAudioGraph(true);
  }
}

function ensureReverbInitialized() {
  if (!reverbNode && audioCtx) {
    reverbNode = audioCtx.createConvolver();
    reverbNode.buffer = generateConcertHallReverb(audioCtx);
    reverbWetGain = audioCtx.createGain();
    reverbWetGain.gain.value = 0.55;
  }
}

function ensurePitchInitialized() {
  if (!pitchNode && audioCtx) {
    pitchNode = new Jungle(audioCtx);
  }
}

function generateConcertHallReverb(ctx) {
  const sampleRate = ctx.sampleRate;
  const duration = 2.6;
  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  const earlyReflections = [
    { delayMs: 18, gainL: 0.75, gainR: 0.45 },
    { delayMs: 29, gainL: 0.40, gainR: 0.70 },
    { delayMs: 41, gainL: 0.60, gainR: 0.35 },
    { delayMs: 54, gainL: 0.30, gainR: 0.55 },
    { delayMs: 68, gainL: 0.48, gainR: 0.28 },
    { delayMs: 83, gainL: 0.25, gainR: 0.42 }
  ];

  for (const er of earlyReflections) {
    const idx = Math.floor((er.delayMs / 1000) * sampleRate);
    const burstLen = Math.floor(0.003 * sampleRate);
    for (let j = 0; j < burstLen && (idx + j) < length; j++) {
      const env = Math.sin((j / burstLen) * Math.PI);
      left[idx + j] += (Math.random() * 2 - 1) * er.gainL * env;
      right[idx + j] += (Math.random() * 2 - 1) * er.gainR * env;
    }
  }

  const preDelaySamples = Math.floor(0.022 * sampleRate);
  let lastL = 0;
  let lastR = 0;
  const damping = 0.42;

  for (let i = preDelaySamples; i < length; i++) {
    const t = (i - preDelaySamples) / sampleRate;
    const attackEnv = Math.min(1, t / 0.015);
    const decay = (0.65 * Math.exp(-t / 0.38) + 0.35 * Math.exp(-t / 0.85)) * attackEnv;

    const rawL = (Math.random() * 2 - 1) * decay;
    const rawR = (Math.random() * 2 - 1) * decay;

    lastL = lastL + damping * (rawL - lastL);
    lastR = lastR + damping * (rawR - lastR);

    left[i] += lastL;
    right[i] += lastR;
  }

  return impulse;
}

function getRoutingSignature() {
  if (!isBoostEnabled) return "BYPASS";
  const useBass = isBassEnabled && currentBass !== 0 ? 1 : 0;
  const usePitch = isPitchEnabled && currentPitch !== 0 ? 1 : 0;
  const useEq = isEqEnabled && currentEQ.some(v => v !== 0) ? 1 : 0;
  const useRev = isReverbEnabled ? 1 : 0;
  const useComp = isCompressorEnabled ? 1 : 0;
  const useMono = isMono ? 1 : 0;
  return `${useBass}-${usePitch}-${useEq}-${useRev}-${useComp}-${useMono}`;
}

function rebuildAudioGraph(force = false) {
  if (!audioCtx) return;

  const currentKey = getRoutingSignature();
  if (!force && currentKey === lastRoutingKey) {
    return;
  }
  lastRoutingKey = currentKey;

  if (isPitchEnabled && currentPitch !== 0) ensurePitchInitialized();
  if (isReverbEnabled) ensureReverbInitialized();

  const allNodes = [
    bassNode,
    pitchNode ? pitchNode.output : null,
    ...eqNodes,
    preReverbBus,
    reverbNode,
    reverbWetGain,
    gainNode,
    compressorNode,
    monoNode,
    pannerNode
  ];

  for (const node of allNodes) {
    if (node) {
      try { node.disconnect(); } catch (e) {}
    }
  }

  if (currentKey === "BYPASS") {
    for (const source of mediaSources) {
      try { source.disconnect(); } catch (e) {}
      try { source.connect(audioCtx.destination); } catch (e) {}
    }
    return;
  }

  const chain = [];

  if (isBassEnabled && currentBass !== 0) {
    chain.push({ in: bassNode, out: bassNode });
  }

  if (isPitchEnabled && currentPitch !== 0 && pitchNode) {
    chain.push({ in: pitchNode.input, out: pitchNode.output });
  }

  const hasActiveEq = isEqEnabled && currentEQ.some(v => v !== 0);
  if (hasActiveEq) {
    for (let i = 0; i < 9; i++) {
      eqNodes[i].connect(eqNodes[i + 1]);
    }
    chain.push({ in: eqNodes[0], out: eqNodes[9] });
  }

  chain.push({ in: preReverbBus, out: preReverbBus });

  const firstTarget = chain[0].in;
  for (const source of mediaSources) {
    try { source.disconnect(); } catch (e) {}
    try { source.connect(firstTarget); } catch (e) {}
  }

  for (let i = 0; i < chain.length - 1; i++) {
    chain[i].out.connect(chain[i + 1].in);
  }

  if (isReverbEnabled && reverbNode && reverbWetGain) {
    preReverbBus.connect(gainNode);
    preReverbBus.connect(reverbNode);
    reverbNode.connect(reverbWetGain);
    reverbWetGain.connect(gainNode);
  } else {
    preReverbBus.connect(gainNode);
  }

  let lastOut = gainNode;

  if (isCompressorEnabled) {
    lastOut.connect(compressorNode);
    lastOut = compressorNode;
  }

  if (isMono) {
    monoNode.channelCount = 1;
    monoNode.channelCountMode = "explicit";
    monoNode.channelInterpretation = "speakers";
    lastOut.connect(monoNode);
    lastOut = monoNode;
  }

  lastOut.connect(pannerNode);
  pannerNode.connect(audioCtx.destination);
}

function updateAudioNodes() {
  if (!audioCtx) return;
  resumeAudioContext();

  rebuildAudioGraph(false);

  const now = audioCtx.currentTime;
  const active = isBoostEnabled && !isBypassed;

  gainNode.gain.setTargetAtTime(active ? (currentVolume / 100) : 1, now, 0.015);
  bassNode.gain.setTargetAtTime(active && isBassEnabled ? currentBass : 0, now, 0.015);

  if (eqNodes.length === 10) {
    for (let i = 0; i < 10; i++) {
      const targetEqGain = (active && isEqEnabled) ? (currentEQ[i] || 0) : 0;
      eqNodes[i].gain.setTargetAtTime(targetEqGain, now, 0.015);
    }
  }

  pannerNode.pan.setTargetAtTime(active && isBalanceEnabled ? currentBalance : 0, now, 0.015);

  if (reverbWetGain) {
    reverbWetGain.gain.setTargetAtTime(active && isReverbEnabled ? 0.55 : 0, now, 0.015);
  }

  if (compressorNode) {
    compressorNode.threshold.setTargetAtTime(active && isCompressorEnabled ? -3 : 0, now, 0.015);
    compressorNode.ratio.setTargetAtTime(active && isCompressorEnabled ? 12 : 1, now, 0.015);
  }

  if (monoNode) {
    monoNode.channelCount = (active && isMono) ? 1 : 2;
    monoNode.channelCountMode = (active && isMono) ? "explicit" : "max";
    monoNode.channelInterpretation = "speakers";
  }

  if (pitchNode) {
    if (active && isPitchEnabled && currentPitch !== 0) {
      const pitchRatio = Math.pow(2, currentPitch / 12);
      const mult = (pitchRatio - 1) * 2;
      pitchNode.setPitchOffset(mult);
    } else {
      pitchNode.setPitchOffset(0);
    }
  }

  applySpeedAndPitch();
}

let wasSpeedOverridden = false;

function applySpeedAndPitch() {
  const shouldOverride = isBoostEnabled && isSpeedEnabled && currentSpeed !== 1.0 && !isBypassed;
  const videos = document.getElementsByTagName("video");
  const audios = document.getElementsByTagName("audio");

  const applyToElement = (el) => {
    if (shouldOverride) {
      if (el.playbackRate !== currentSpeed) {
        el.playbackRate = currentSpeed;
      }
      if (el.preservesPitch !== true) {
        el.preservesPitch = true;
        if (el.mozPreservesPitch !== undefined) el.mozPreservesPitch = true;
        if (el.webkitPreservesPitch !== undefined) el.webkitPreservesPitch = true;
      }
    } else if (wasSpeedOverridden) {
      el.playbackRate = 1.0;
    }
  };

  if (shouldOverride || wasSpeedOverridden) {
    for (let i = 0; i < videos.length; i++) applyToElement(videos[i]);
    for (let i = 0; i < audios.length; i++) applyToElement(audios[i]);
    wasSpeedOverridden = shouldOverride;
  }
}

function createFadeBuffer(context, activeTime, fadeTime) {
  const length1 = activeTime * context.sampleRate;
  const length2 = (activeTime - 2 * fadeTime) * context.sampleRate;
  const length = length1 + length2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const p = buffer.getChannelData(0);
  const fadeLength = fadeTime * context.sampleRate;
  const fadeIndex1 = fadeLength;
  const fadeIndex2 = length1 - fadeLength;
  for (let i = 0; i < length1; ++i) {
    if (i < fadeIndex1) p[i] = Math.sqrt(i / fadeLength);
    else if (i >= fadeIndex2) p[i] = Math.sqrt(1 - (i - fadeIndex2) / fadeLength);
    else p[i] = 1;
  }
  for (let i = length1; i < length; ++i) p[i] = 0;
  return buffer;
}

function createDelayTimeBuffer(context, activeTime, fadeTime, shiftUp) {
  const length1 = activeTime * context.sampleRate;
  const length2 = (activeTime - 2 * fadeTime) * context.sampleRate;
  const length = length1 + length2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const p = buffer.getChannelData(0);
  for (let i = 0; i < length1; ++i) {
    if (shiftUp) p[i] = (length1 - i) / length;
    else p[i] = i / length1;
  }
  for (let i = length1; i < length; ++i) p[i] = 0;
  return buffer;
}

function Jungle(context) {
  this.context = context;
  const delayTime = 0.040;
  const fadeTime = 0.020;
  const bufferTime = 0.040;
  const input = context.createGain();
  const output = context.createGain();
  this.input = input;
  this.output = output;
  const mod1 = context.createBufferSource();
  const mod2 = context.createBufferSource();
  const mod3 = context.createBufferSource();
  const mod4 = context.createBufferSource();
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
  const mod1Gain = context.createGain();
  const mod2Gain = context.createGain();
  const mod3Gain = context.createGain();
  mod3Gain.gain.value = 0;
  const mod4Gain = context.createGain();
  mod4Gain.gain.value = 0;
  mod1.connect(mod1Gain);
  mod2.connect(mod2Gain);
  mod3.connect(mod3Gain);
  mod4.connect(mod4Gain);
  const modGain1 = context.createGain();
  const modGain2 = context.createGain();
  const delay1 = context.createDelay();
  const delay2 = context.createDelay();
  mod1Gain.connect(modGain1);
  mod2Gain.connect(modGain2);
  mod3Gain.connect(modGain1);
  mod4Gain.connect(modGain2);
  modGain1.connect(delay1.delayTime);
  modGain2.connect(delay2.delayTime);
  const fade1 = context.createBufferSource();
  const fade2 = context.createBufferSource();
  const fadeBuffer = createFadeBuffer(context, bufferTime, fadeTime);
  fade1.buffer = fadeBuffer;
  fade2.buffer = fadeBuffer;
  fade1.loop = true;
  fade2.loop = true;
  const mix1 = context.createGain();
  const mix2 = context.createGain();
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
  const t = context.currentTime + 0.050;
  const t2 = t + bufferTime - fadeTime;
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

Jungle.prototype.setDelay = function (delayTime) {
  const now = this.context.currentTime;
  this.modGain1.gain.setTargetAtTime(0.5 * delayTime, now, 0.010);
  this.modGain2.gain.setTargetAtTime(0.5 * delayTime, now, 0.010);
};

Jungle.prototype.setPitchOffset = function (mult) {
  const now = this.context.currentTime;
  if (mult > 0) {
    this.mod1Gain.gain.setTargetAtTime(0, now, 0.010);
    this.mod2Gain.gain.setTargetAtTime(0, now, 0.010);
    this.mod3Gain.gain.setTargetAtTime(1, now, 0.010);
    this.mod4Gain.gain.setTargetAtTime(1, now, 0.010);
  } else {
    this.mod1Gain.gain.setTargetAtTime(1, now, 0.010);
    this.mod2Gain.gain.setTargetAtTime(1, now, 0.010);
    this.mod3Gain.gain.setTargetAtTime(0, now, 0.010);
    this.mod4Gain.gain.setTargetAtTime(0, now, 0.010);
  }
  this.setDelay(this.delayTime * Math.abs(mult));
};

function hookMediaElements() {
  const videos = document.getElementsByTagName("video");
  const audios = document.getElementsByTagName("audio");
  let newlyHooked = false;

  const processElement = (el) => {
    if (!connectedElements.has(el)) {
      initAudioContext();
      try {
        const source = audioCtx.createMediaElementSource(el);
        mediaSources.push(source);
        connectedElements.add(el);
        newlyHooked = true;

        const enforceSpeed = (e) => {
          const shouldOverride = isBoostEnabled && isSpeedEnabled && currentSpeed !== 1.0 && !isBypassed;
          if (shouldOverride && e.target.playbackRate !== currentSpeed) {
            e.target.playbackRate = currentSpeed;
          }
        };

        el.addEventListener("ratechange", enforceSpeed);
        el.addEventListener("play", enforceSpeed);
        el.addEventListener("playing", enforceSpeed);
        el.addEventListener("loadeddata", enforceSpeed);
        el.addEventListener("loadedmetadata", enforceSpeed);
      } catch (error) {
        console.warn("Sound Master: Could not hook media element.", error);
      }
    }
  };

  for (let i = 0; i < videos.length; i++) processElement(videos[i]);
  for (let i = 0; i < audios.length; i++) processElement(audios[i]);

  if (newlyHooked) {
    rebuildAudioGraph(true);
    applySpeedAndPitch();
    resumeAudioContext();
  }
}

let hookTimeout = null;
let observerInstance = null;

function startObserver() {
  if (!observerInstance && document.body) {
    observerInstance = new MutationObserver((mutations) => {
      let hasPotentialMedia = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === "VIDEO" || node.nodeName === "AUDIO") {
            hasPotentialMedia = true;
            break;
          }
          if (node.getElementsByTagName &&
             (node.getElementsByTagName("video").length > 0 || node.getElementsByTagName("audio").length > 0)) {
            hasPotentialMedia = true;
            break;
          }
        }
        if (hasPotentialMedia) break;
      }

      if (hasPotentialMedia) {
        clearTimeout(hookTimeout);
        hookTimeout = setTimeout(hookMediaElements, 300);
      }
    });
    observerInstance.observe(document.body, { childList: true, subtree: true });
  }
}

function stopObserver() {
  clearTimeout(hookTimeout);
  hookTimeout = null;
  if (observerInstance) {
    observerInstance.disconnect();
    observerInstance = null;
  }
}

function applySettingsObject(settings) {
  if (settings.volume !== undefined) currentVolume = settings.volume;
  if (settings.enabled !== undefined) isBoostEnabled = settings.enabled;
  if (settings.bass !== undefined) currentBass = settings.bass;
  if (settings.bassEnabled !== undefined) isBassEnabled = settings.bassEnabled;
  if (settings.eq !== undefined) currentEQ = settings.eq;
  if (settings.eqEnabled !== undefined) isEqEnabled = settings.eqEnabled;
  if (settings.balance !== undefined) currentBalance = settings.balance;
  if (settings.balanceEnabled !== undefined) isBalanceEnabled = settings.balanceEnabled;
  if (settings.mono !== undefined) isMono = settings.mono;
  if (settings.compressor !== undefined) isCompressorEnabled = settings.compressor;
  if (settings.speed !== undefined) currentSpeed = settings.speed;
  if (settings.speedEnabled !== undefined) isSpeedEnabled = settings.speedEnabled;
  if (settings.pitch !== undefined && typeof settings.pitch === "number") currentPitch = settings.pitch;
  if (settings.pitchEnabled !== undefined) isPitchEnabled = settings.pitchEnabled;
  if (settings.reverb !== undefined) isReverbEnabled = settings.reverb;
}

async function autoInit() {
  try {
    const settings = await browser.runtime.sendMessage({ action: "getContentSettings" });
    if (settings && settings.enabled) {
      applySettingsObject(settings);
      isBypassed = false;
      initAudioContext();
      hookMediaElements();
      updateAudioNodes();
      startObserver();
    }
  } catch (e) {}
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "updateVolume") {
    applySettingsObject(message);

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
    isBypassed = Boolean(message.bypassed);
    updateAudioNodes();
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoInit, { once: true });
} else {
  autoInit();
}
