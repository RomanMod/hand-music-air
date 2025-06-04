"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const videoElement = document.getElementById('input-video');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');
const controlButton = document.getElementById('control-button');
const statusMessage = document.getElementById('status-message');
const equalizerContainer = document.querySelector('.equalizer-container');
const customPairsConfigContainer = document.getElementById('custom-pairs-config-container');
const distanceModeSelector = document.getElementById('distance-mode-selector');
// Settings & Calibration UI Elements
const settingsToggleLegend = document.getElementById('settings-toggle-legend');
const settingsContent = document.getElementById('settings-content');
// Performance Profile UI Elements
const performanceProfileToggleLegend = document.getElementById('performance-profile-toggle-legend');
const performanceProfileContentToToggle = document.getElementById('performance-profile-content-to-toggle');
const performanceProfileDescriptionElement = document.getElementById('performance-profile-description');
const calibrationControlsContainer = document.getElementById('calibration-controls-container');
const calibrationToggleLegend = document.getElementById('calibration-toggle-legend');
const calibrationContentToToggle = document.getElementById('calibration-content-to-toggle');
const playbackModeToggleLegend = document.getElementById('playback-mode-toggle-legend');
const playbackModeContentToToggle = document.getElementById('playback-mode-content-to-toggle');
const soundSettingsToggleLegend = document.getElementById('sound-settings-toggle-legend');
const soundSettingsContentToToggle = document.getElementById('sound-settings-content-to-toggle');
// Removed audioPanningModeToggleLegend and audioPanningModeContentToToggle
// const audioPanningModeToggleLegend = document.getElementById('audio-panning-mode-toggle-legend') as HTMLLegendElement | null;
// const audioPanningModeContentToToggle = document.getElementById('audio-panning-mode-content-to-toggle') as HTMLDivElement | null;
const distanceModeToggleLegend = document.getElementById('distance-mode-toggle-legend');
const distanceModeContentToToggle = document.getElementById('distance-mode-content-to-toggle');
const visualizationControlsContainer = document.getElementById('visualization-controls-container');
const visualizationToggleLegend = document.getElementById('visualization-toggle-legend');
const visualizationContentToToggle = document.getElementById('visualization-content-to-toggle');
const startCalibrationButton = document.getElementById('start-calibration-button');
const calibrationInstructions = document.getElementById('calibration-instructions');
const calibrationActionButtons = document.getElementById('calibration-action-buttons');
const cancelCalibrationButton = document.getElementById('cancel-calibration-button');
const calibrationOverlayMessageElement = document.getElementById('calibration-overlay-message');
const calibrationOverlayInstructionTextElement = document.getElementById('calibration-overlay-instruction-text');
const calibrationOverlayCountdownTimerElement = document.getElementById('calibration-overlay-countdown-timer');
const toggleThresholdVisibilityButton = document.getElementById('toggle-threshold-visibility-button');
const toggleLandmarkNumbersButton = document.getElementById('toggle-landmark-numbers-button');
const toggleHandShapesButton = document.getElementById('toggle-hand-shapes-button'); // New button
let showIndividualThresholdControls = false;
let showLandmarkNumbers = false;
let showHandShapes = true; // New state for hand shapes visibility
// Sound Settings UI Elements
const oscillatorTypeRadios = document.querySelectorAll('input[name="osc-type"]');
const filterCutoffSlider = document.getElementById('filter-cutoff-slider');
const filterCutoffValueDisplay = document.getElementById('filter-cutoff-value');
const filterQSlider = document.getElementById('filter-q-slider');
const filterQValueDisplay = document.getElementById('filter-q-value');
const localFileInputContainer = document.getElementById('local-file-input-container');
const localAudioUploadInput = document.getElementById('local-audio-upload-input');
const localFileStatusElement = document.getElementById('local-file-status');
// Audio Effects UI Elements
const audioEffectsPanel = document.getElementById('audio-effects-panel');
// Reverb UI elements removed
const enableDelayCheckbox = document.getElementById('enable-delay-checkbox');
const delayTimeSlider = document.getElementById('delay-time-slider');
const delayTimeValueDisplay = document.getElementById('delay-time-value');
const delayFeedbackSlider = document.getElementById('delay-feedback-slider');
const delayFeedbackValueDisplay = document.getElementById('delay-feedback-value');
const delayLevelSlider = document.getElementById('delay-level-slider');
const delayLevelValueDisplay = document.getElementById('delay-level-value');
// AudioContext and related audio variables
let audioContext = null;
let mainGainNode = null;
const MASTER_GAIN_LEVEL = 0.3; // Default master gain
let globalLowPassFilter = null;
let bellMp3Buffer = null; // For MP3 sample
let customUserAudioBuffer = null; // For global custom file
let customUserAudioFileName = null;
let leftWavBuffer = null;
let rightWavBuffer = null;
const customFingerAudioBuffers = {};
const customFingerAudioFileNames = {};
// Audio Effects Nodes
// Reverb nodes removed
let delayNode = null;
let delayFeedbackGainNode = null;
let delayWetGainNode = null;
let isTracking = false;
let hands = null;
let camera = null;
let cameraManuallyStartedForCalibration = false;
// Audio-related constants
const MIN_FREQ = 100; // Hz (for oscillators)
const MAX_FREQ = 1000; // Hz (for oscillators)
const MIN_GAIN = 0;
const MAX_GAIN = 0.5; // Max gain for individual theremin hands
// Oscillator and SoundFont control variables
let thereminOscLeft = null; // For physical Left Hand (Circle) -> pans RIGHT
let thereminGainLeft = null;
let thereminPannerLeft = null;
let thereminOscRight = null; // For physical Right Hand (Triangle) -> pans LEFT
let thereminGainRight = null;
let thereminPannerRight = null;
let physLeftHandThereminActive = false; // For dual_hand_wav theremin logic
let physRightHandThereminActive = false; // For dual_hand_wav theremin logic
const fingerKeyOscillators = {};
const WRIST = 0;
const FINGER_TIPS_INDICES = {
    T: 4, I: 8, M: 12, R: 16, P: 20
};
const FINGER_LABELS = ['P', 'R', 'M', 'I', 'T'];
const ALL_FINGER_KEY_IDS = ['R-P', 'R-R', 'R-M', 'R-I', 'R-T', 'L-P', 'L-R', 'L-M', 'L-I', 'L-T'];
const MAX_FINGER_DISTANCE_NORMALIZATION = 0.4;
const TOTAL_LANDMARKS = 21;
const CUSTOM_DISTANCE_LANDMARK_PAIRS = {
    'P': [FINGER_TIPS_INDICES.P, 17],
    'R': [FINGER_TIPS_INDICES.R, 13],
    'M': [FINGER_TIPS_INDICES.M, 9],
    'I': [FINGER_TIPS_INDICES.I, 5],
    'T': [FINGER_TIPS_INDICES.T, 5]
};
let currentPlaybackMode = "fingerkeys";
let currentDistanceMode = "wrist_tip";
let currentAudioPanningMode = "mono"; // Default changed to mono
let currentPerformanceProfile = "max";
let userCustomLandmarkPairs = {};
const TAP_PAD_ZONES = {
    // Physical Right Hand (Triangle) -> Left Channel
    SCREEN_LEFT_UPPER: { id: "SLU", rect: { x: 0, y: 0, w: 0.5, h: 0.5 }, freq: 440.00, color: "rgba(255, 193, 7, 0.3)", pan: -1.0 }, // A4
    SCREEN_LEFT_LOWER: { id: "SLL", rect: { x: 0, y: 0.5, w: 0.5, h: 0.5 }, freq: 329.63, color: "rgba(255, 193, 7, 0.3)", pan: -1.0 }, // E4
    // Physical Left Hand (Circle) -> Right Channel
    SCREEN_RIGHT_UPPER: { id: "SRU", rect: { x: 0.5, y: 0, w: 0.5, h: 0.5 }, freq: 523.25, color: "rgba(0, 123, 255, 0.3)", pan: 1.0 }, // C5
    SCREEN_RIGHT_LOWER: { id: "SRL", rect: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, freq: 392.00, color: "rgba(0, 123, 255, 0.3)", pan: 1.0 }, // G4
};
const TAP_NOTE_DURATION_OSC = 0.15; // seconds
const padInteractionStates = {};
Object.values(TAP_PAD_ZONES).forEach(padDefinition => {
    padInteractionStates[padDefinition.id] = { isActive: false };
});
const FINGER_KEY_FREQUENCIES = {
    "R-P": 261.63, // C4
    "R-R": 293.66, // D4
    "R-M": 329.63, // E4
    "R-I": 349.23, // F4
    "R-T": 392.00, // G4
    "L-T": 440.00, // A4 
    "L-I": 493.88, // B4
    "L-M": 523.25, // C5
    "L-R": 587.33, // D5
    "L-P": 659.25, // E5
};
const fingerKeyStates = {};
ALL_FINGER_KEY_IDS.forEach(keyId => {
    fingerKeyStates[keyId] = { isActive: false };
});
const LOCALSTORAGE_KEY_THRESHOLDS = 'fingerKeyThresholds';
const LOCALSTORAGE_KEY_MUTED_STATES = 'fingerKeyMutedStates';
const LOCALSTORAGE_KEY_PLAYBACK_MODE = 'selectedPlaybackMode';
const LOCALSTORAGE_KEY_DISTANCE_MODE = 'selectedDistanceMode';
const LOCALSTORAGE_KEY_CUSTOM_PAIRS = 'fingerKeyCustomLandmarkPairs';
const LOCALSTORAGE_KEY_FINGER_MIN_DISTANCES = 'fingerMinDistancesData';
const LOCALSTORAGE_KEY_FINGER_MAX_DISTANCES = 'fingerMaxDistancesData';
const LOCALSTORAGE_KEY_OSC_TYPE = 'soundOscillatorType';
const LOCALSTORAGE_KEY_FILTER_CUTOFF = 'soundFilterCutoff';
const LOCALSTORAGE_KEY_FILTER_Q = 'soundFilterQ';
const LOCALSTORAGE_KEY_AUDIO_PANNING_MODE = 'audioPanningMode';
const LOCALSTORAGE_KEY_PERFORMANCE_PROFILE = 'appPerformanceProfile';
const LOCALSTORAGE_KEY_AUDIO_EFFECTS = 'audioEffectsSettings';
const LOCALSTORAGE_KEY_SHOW_HAND_SHAPES = 'showHandShapesSetting';
let fingerKeyThresholds = {};
let fingerMinDistances = {};
let fingerMaxDistances = {};
let fingerKeyMutedStates = {};
const DEFAULT_INDIVIDUAL_FINGER_THRESHOLD = 70;
const THRESHOLD_STEP = 1;
const MIN_THRESHOLD = 5;
const MAX_THRESHOLD = 95;
let calibrationState = 'idle';
let tempFingerMaxDistances = {};
let tempFingerMinDistances = {};
let fingerRangeSampleData = {};
let latestRawDistancesForCalibration = {};
const CALIBRATION_MAX_MIN_CAPTURE_DURATION_MS = 8000;
const CALIBRATION_RANGE_CAPTURE_DURATION_MS = 15000;
let calibrationStepTimeoutId = null;
let calibrationCountdownIntervalId = null;
let isCalibrationSoundMuted = false;
// Sound Parameters
let currentOscillatorType = 'dual_hand_wav'; // Default changed to dual_hand_wav
let filterCutoffFrequency = 12000; // Default wide open
let filterQValue = 1; // Default, mild resonance
let currentAudioEffects = {
    // isReverbEnabled: false, // Removed
    // reverbLevel: 0.3, // Removed
    isDelayEnabled: false,
    delayTimeMs: 200,
    delayFeedback: 0.4,
    delayLevel: 0.3,
};
const BELL3_MIN_RING_DURATION = 2.0; // seconds
const COSMIC_HARMONY_ATTACK = 0.3;
const COSMIC_HARMONY_SUSTAIN = 0.2;
const COSMIC_HARMONY_RELEASE = 2.0;
const COSMIC_HARMONY_TOTAL_DURATION = COSMIC_HARMONY_ATTACK + COSMIC_HARMONY_SUSTAIN + COSMIC_HARMONY_RELEASE;
const GUSLI_PLUCK_DURATION = 1.2; // seconds
const GUSLI_ATTACK_TIME = 0.005;
const PIANO_CHORD_ATTACK_TIME = 0.005;
const PIANO_CHORD_MIN_RING_DURATION = 1.5;
const WATER_DROP_EFFECT_DURATION = 0.2; // seconds
const WATER_DROP_ATTACK = 0.001;
const latestFingerVisuals = {};
let equalizerVisualUpdateRequested = false;
function renderEqualizerBarsFromData() {
    equalizerVisualUpdateRequested = false;
    if (currentPlaybackMode !== "fingerkeys" && calibrationState === 'idle') { // Only update if relevant or calibrating
        // Clear bars if not in fingerkeys mode and not calibrating
        ALL_FINGER_KEY_IDS.forEach(keyId => {
            const handPrefix = keyId.startsWith('L') ? 'left' : 'right';
            const fingerLabel = keyId.substring(2);
            const barFill = document.getElementById(`${handPrefix}-finger-${fingerLabel.toLowerCase()}-bar-fill`);
            if (barFill)
                barFill.style.height = '0%';
            const valueDisplay = document.getElementById(`${handPrefix}-finger-${fingerLabel.toLowerCase()}-bar-value`);
            if (valueDisplay)
                valueDisplay.textContent = '0%';
        });
        return;
    }
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        const data = latestFingerVisuals[keyId];
        const handPrefix = keyId.startsWith('L') ? 'left' : 'right';
        const fingerLabel = keyId.substring(2);
        const barFillElement = document.getElementById(`${handPrefix}-finger-${fingerLabel.toLowerCase()}-bar-fill`);
        const valueDisplayElement = document.getElementById(`${handPrefix}-finger-${fingerLabel.toLowerCase()}-bar-value`);
        if (data && barFillElement && valueDisplayElement) {
            barFillElement.style.height = `${data.heightPercent}%`;
            valueDisplayElement.textContent = `${Math.round(data.heightPercent)}%`;
            // Update active color based on stored active state
            if (currentPlaybackMode === "fingerkeys" && !fingerKeyMutedStates[keyId]) {
                if (data.isActive) {
                    barFillElement.style.backgroundColor = data.handedness === 'Left' ? '#3498db' : '#f1c40f';
                }
                else {
                    barFillElement.style.backgroundColor = ''; // Reset to default CSS color
                }
            }
            else {
                barFillElement.style.backgroundColor = ''; // Reset if not in fingerkeys or muted
            }
        }
        else if (barFillElement && valueDisplayElement) { // No data for this keyId, reset bar
            barFillElement.style.height = '0%';
            valueDisplayElement.textContent = '0%';
            barFillElement.style.backgroundColor = '';
        }
        // Mute state is handled by updateFingerMuteVisuals, which adds/removes a class
    });
}
// --- Audio Functions ---
function initializeAudio() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                mainGainNode = audioContext.createGain();
                mainGainNode.gain.setValueAtTime(MASTER_GAIN_LEVEL, audioContext.currentTime);
                globalLowPassFilter = audioContext.createBiquadFilter();
                globalLowPassFilter.type = 'lowpass';
                globalLowPassFilter.frequency.setValueAtTime(filterCutoffFrequency, audioContext.currentTime);
                globalLowPassFilter.Q.setValueAtTime(filterQValue, audioContext.currentTime);
                mainGainNode.connect(globalLowPassFilter);
                globalLowPassFilter.connect(audioContext.destination);
                // Initialize Effects Nodes
                // Reverb nodes removed
                delayNode = audioContext.createDelay(1.0); // Max delay 1 second
                delayFeedbackGainNode = audioContext.createGain();
                delayWetGainNode = audioContext.createGain();
                delayWetGainNode.gain.setValueAtTime(0, audioContext.currentTime); // Start with effect off
                delayNode.connect(delayFeedbackGainNode);
                delayFeedbackGainNode.connect(delayNode); // Feedback loop
                delayNode.connect(delayWetGainNode);
                delayWetGainNode.connect(globalLowPassFilter); // Delay output to main mix
                console.log("AudioContext initialized with filter and delay effect chain.");
                // Load MP3 sample
                if (!bellMp3Buffer) {
                    try {
                        const response = yield fetch('bell.mp3');
                        if (!response.ok)
                            throw new Error(`HTTP error! status: ${response.status} for bell.mp3`);
                        const arrayBuffer = yield response.arrayBuffer();
                        audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                            bellMp3Buffer = buffer;
                            console.log("Bell MP3 loaded.");
                            if (statusMessage && statusMessage.textContent === 'Загрузка MP3 звука...') {
                                statusMessage.textContent = 'MP3 звук загружен.';
                                setTimeout(() => { if (statusMessage.textContent === 'MP3 звук загружен.')
                                    statusMessage.textContent = 'Готово.'; }, 2000);
                            }
                        }, (error) => {
                            console.error("Error decoding bell.mp3:", error);
                            if (statusMessage)
                                statusMessage.textContent = "Ошибка декодирования MP3 (колокольчик).";
                            const mp3Radio = document.getElementById('osc-bell-mp3');
                            if (mp3Radio) {
                                mp3Radio.disabled = true;
                                const label = document.querySelector('label[for="osc-bell-mp3"]');
                                if (label) {
                                    label.style.textDecoration = 'line-through';
                                    label.title = "MP3 файл не удалось загрузить или декодировать";
                                }
                            }
                        });
                    }
                    catch (e) {
                        console.error("Error fetching bell.mp3:", e);
                        if (statusMessage)
                            statusMessage.textContent = "Ошибка загрузки MP3 (колокольчик).";
                        const mp3Radio = document.getElementById('osc-bell-mp3');
                        if (mp3Radio) {
                            mp3Radio.disabled = true;
                            const label = document.querySelector('label[for="osc-bell-mp3"]');
                            if (label) {
                                label.style.textDecoration = 'line-through';
                                label.title = "MP3 файл не удалось загрузить или декодировать";
                            }
                        }
                    }
                }
                // Load left.wav and right.wav for dual_hand_wav mode
                const dualWavRadio = document.getElementById('osc-dual-hand-wav');
                const dualWavLabel = document.querySelector('label[for="osc-dual-hand-wav"]');
                let leftWavLoaded = false;
                let rightWavLoaded = false;
                const checkDualWavStatus = () => {
                    if (dualWavRadio && dualWavLabel) {
                        if (leftWavLoaded && rightWavLoaded) {
                            dualWavRadio.disabled = false;
                            dualWavLabel.style.textDecoration = '';
                            dualWavLabel.title = "";
                            if (statusMessage && (statusMessage.textContent === 'Загрузка left.wav...' || statusMessage.textContent === 'Загрузка right.wav...')) {
                                statusMessage.textContent = 'Файлы для Двойного WAV загружены.';
                            }
                        }
                        else if ((!leftWavBuffer && !leftWavLoaded) || (!rightWavBuffer && !rightWavLoaded)) { // If either explicitly failed
                            dualWavRadio.disabled = true;
                            dualWavLabel.style.textDecoration = 'line-through';
                            dualWavLabel.title = "Один или оба WAV файла (left.wav/right.wav) не удалось загрузить/декодировать.";
                        }
                    }
                };
                if (!leftWavBuffer) {
                    try {
                        const response = yield fetch('left.wav');
                        if (!response.ok)
                            throw new Error(`HTTP error! status: ${response.status} for left.wav`);
                        const arrayBuffer = yield response.arrayBuffer();
                        audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                            leftWavBuffer = buffer;
                            leftWavLoaded = true;
                            console.log("left.wav loaded.");
                            checkDualWavStatus();
                        }, (error) => {
                            console.error("Error decoding left.wav:", error);
                            if (statusMessage)
                                statusMessage.textContent = "Ошибка декодирования left.wav.";
                            leftWavLoaded = false; // Mark as failed
                            checkDualWavStatus();
                        });
                    }
                    catch (e) {
                        console.error("Error fetching left.wav:", e);
                        if (statusMessage)
                            statusMessage.textContent = "Ошибка загрузки left.wav.";
                        leftWavLoaded = false; // Mark as failed
                        checkDualWavStatus();
                    }
                }
                else {
                    leftWavLoaded = true; // Already loaded
                }
                if (!rightWavBuffer) {
                    try {
                        const response = yield fetch('right.wav');
                        if (!response.ok)
                            throw new Error(`HTTP error! status: ${response.status} for right.wav`);
                        const arrayBuffer = yield response.arrayBuffer();
                        audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                            rightWavBuffer = buffer;
                            rightWavLoaded = true;
                            console.log("right.wav loaded.");
                            checkDualWavStatus();
                        }, (error) => {
                            console.error("Error decoding right.wav:", error);
                            if (statusMessage)
                                statusMessage.textContent = "Ошибка декодирования right.wav.";
                            rightWavLoaded = false; // Mark as failed
                            checkDualWavStatus();
                        });
                    }
                    catch (e) {
                        console.error("Error fetching right.wav:", e);
                        if (statusMessage)
                            statusMessage.textContent = "Ошибка загрузки right.wav.";
                        rightWavLoaded = false; // Mark as failed
                        checkDualWavStatus();
                    }
                }
                else {
                    rightWavLoaded = true; // Already loaded
                }
                checkDualWavStatus(); // Initial check in case buffers were pre-loaded or one fails quickly
                // Reverb loading logic removed
            }
            catch (e) {
                console.error("Error initializing AudioContext:", e);
                statusMessage.textContent = "Ошибка инициализации аудио. Звук не будет работать.";
                return false;
            }
        }
        if (audioContext.state === 'suspended') {
            yield audioContext.resume();
            console.log("AudioContext resumed.");
        }
        // Apply loaded effect settings after context is ready
        loadAudioEffectsSettings();
        applyAudioEffects();
        return true;
    });
}
function getFrequencyForKey(keyId) {
    return FINGER_KEY_FREQUENCIES[keyId] || 300; // Fallback frequency
}
function playOscillatorNote(frequency, durationHint, basePanValue = 0, fingerKeyIdForSample, // Optional: for finger-specific samples
handednessTrigger // Optional: for explicit hand trigger (e.g., Theremin)
) {
    if (!audioContext || !mainGainNode || !globalLowPassFilter || isCalibrationSoundMuted)
        return;
    const now = audioContext.currentTime;
    let maxStopTime = now;
    const finalPanValue = currentAudioPanningMode === "mono" ? 0 : basePanValue;
    const notePanner = audioContext.createStereoPanner();
    notePanner.pan.setValueAtTime(finalPanValue, now);
    notePanner.connect(mainGainNode); // Panner for DRY signal goes to mainGain
    const oscillatorsToClean = [];
    let playedSampleSound = false; // General flag for any sample-based sound
    let sampleBufferToPlay = null;
    if (currentOscillatorType === 'finger_specific_local_files' && fingerKeyIdForSample) {
        sampleBufferToPlay = customFingerAudioBuffers[fingerKeyIdForSample] || null;
        if (!sampleBufferToPlay) {
            try {
                notePanner.disconnect();
            }
            catch (e) { }
            return;
        }
    }
    else if (currentOscillatorType === 'custom_local_file') {
        sampleBufferToPlay = customUserAudioBuffer;
        if (!sampleBufferToPlay) {
            console.warn("Custom local audio buffer not loaded.");
            if (localFileStatusElement && !customUserAudioFileName)
                localFileStatusElement.textContent = "Файл не загружен.";
            try {
                notePanner.disconnect();
            }
            catch (e) { }
            return;
        }
    }
    else if (currentOscillatorType === 'bell_mp3') {
        sampleBufferToPlay = bellMp3Buffer;
        if (!sampleBufferToPlay) {
            console.warn("Bell MP3 buffer not loaded.");
            try {
                notePanner.disconnect();
            }
            catch (e) { }
            return;
        }
    }
    else if (currentOscillatorType === 'dual_hand_wav') {
        let handForWav = null;
        if (handednessTrigger) {
            handForWav = handednessTrigger;
        }
        else if (fingerKeyIdForSample) {
            handForWav = fingerKeyIdForSample.startsWith('L-') ? 'Left' : 'Right';
        }
        else {
            // Fallback using pan if no direct hand info (e.g., Tappad)
            // Physical Left hand usually pans RIGHT (positive pan)
            // Physical Right hand usually pans LEFT (negative pan)
            if (basePanValue > 0.1)
                handForWav = 'Left';
            else if (basePanValue < -0.1)
                handForWav = 'Right';
        }
        if (handForWav === 'Left')
            sampleBufferToPlay = leftWavBuffer;
        else if (handForWav === 'Right')
            sampleBufferToPlay = rightWavBuffer;
        else {
            console.warn("Dual WAV: Could not determine hand for sound trigger.");
            try {
                notePanner.disconnect();
            }
            catch (e) { }
            return;
        }
        if (!sampleBufferToPlay) {
            console.warn(`Dual WAV: Buffer for ${handForWav} hand not loaded.`);
            try {
                notePanner.disconnect();
            }
            catch (e) { }
            return;
        }
    }
    if (sampleBufferToPlay) { // If any sample type is active and buffer is ready
        playedSampleSound = true;
        const source = audioContext.createBufferSource();
        source.buffer = sampleBufferToPlay;
        // DRY Path: Source -> Panner -> MainGain
        source.connect(notePanner);
        // WET Paths (Sends): Source -> Effect In
        // Reverb connection removed
        if (currentAudioEffects.isDelayEnabled && delayNode) {
            source.connect(delayNode);
        }
        source.start(now);
        const actualDuration = sampleBufferToPlay.duration;
        maxStopTime = Math.max(maxStopTime, now + actualDuration + 0.05);
        source.onended = () => {
            if (audioContext && audioContext.state !== 'closed') {
                try {
                    source.disconnect();
                }
                catch (e) { }
            }
        };
    }
    else if (currentOscillatorType === 'bell3') {
        // ... (existing bell3 synthesis logic)
        const baseFreq = frequency * 2;
        const freqs = [baseFreq, baseFreq * 1.006, baseFreq * 0.994];
        const gains = [0.5, 0.35, 0.35];
        const ringTime = Math.max(durationHint, BELL3_MIN_RING_DURATION);
        const currentOscStopTime = now + ringTime + 0.05;
        maxStopTime = Math.max(maxStopTime, currentOscStopTime);
        for (let i = 0; i < freqs.length; i++) {
            const osc = audioContext.createOscillator();
            const noteGain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freqs[i], now);
            noteGain.gain.setValueAtTime(0, now);
            noteGain.gain.linearRampToValueAtTime(gains[i], now + 0.005);
            noteGain.gain.exponentialRampToValueAtTime(gains[i] * 0.1, now + 0.2);
            noteGain.gain.linearRampToValueAtTime(0.0001, now + ringTime);
            osc.connect(noteGain);
            noteGain.connect(notePanner); // Synthesized sound also goes through panner
            osc.start(now);
            osc.stop(currentOscStopTime);
            oscillatorsToClean.push({ osc, gain: noteGain });
        }
    }
    else if (currentOscillatorType === 'cosmic_harmony') {
        // ... (existing cosmic_harmony synthesis logic)
        const baseFreq = frequency;
        const harmonicFreqs = [baseFreq, baseFreq * 1.5 + 1, baseFreq * 2.0, baseFreq * 1.25 - 0.7];
        const harmonicGains = [0.4, 0.25, 0.2, 0.15];
        const currentOscStopTime = now + COSMIC_HARMONY_TOTAL_DURATION + 0.05;
        maxStopTime = Math.max(maxStopTime, currentOscStopTime);
        for (let i = 0; i < harmonicFreqs.length; i++) {
            const osc = audioContext.createOscillator();
            const noteGain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(harmonicFreqs[i], now);
            noteGain.gain.setValueAtTime(0, now);
            noteGain.gain.linearRampToValueAtTime(harmonicGains[i], now + COSMIC_HARMONY_ATTACK);
            noteGain.gain.setValueAtTime(harmonicGains[i], now + COSMIC_HARMONY_ATTACK + COSMIC_HARMONY_SUSTAIN);
            noteGain.gain.linearRampToValueAtTime(0.0001, now + COSMIC_HARMONY_TOTAL_DURATION);
            osc.connect(noteGain);
            noteGain.connect(notePanner);
            osc.start(now);
            osc.stop(currentOscStopTime);
            oscillatorsToClean.push({ osc, gain: noteGain });
        }
    }
    else if (currentOscillatorType === 'gusli') {
        // ... (existing gusli synthesis logic)
        const baseFreq = frequency;
        const freqs = [baseFreq, baseFreq * 1.005, baseFreq * 0.995];
        const gains = [0.6, 0.3, 0.3];
        const totalDuration = Math.max(durationHint, GUSLI_PLUCK_DURATION);
        const currentOscStopTime = now + totalDuration + 0.05;
        maxStopTime = Math.max(maxStopTime, currentOscStopTime);
        for (let i = 0; i < freqs.length; i++) {
            const osc = audioContext.createOscillator();
            const noteGain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freqs[i], now);
            noteGain.gain.setValueAtTime(0, now);
            noteGain.gain.linearRampToValueAtTime(gains[i], now + GUSLI_ATTACK_TIME);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);
            osc.connect(noteGain);
            noteGain.connect(notePanner);
            osc.start(now);
            osc.stop(currentOscStopTime);
            oscillatorsToClean.push({ osc, gain: noteGain });
        }
    }
    else if (currentOscillatorType === 'piano_c_major') {
        // ... (existing piano_c_major synthesis logic)
        const rootFreq = frequency;
        const majorThirdFreq = rootFreq * Math.pow(2, 4 / 12);
        const perfectFifthFreq = rootFreq * Math.pow(2, 7 / 12);
        const chordFreqs = [rootFreq, majorThirdFreq, perfectFifthFreq];
        const chordGains = [0.5, 0.4, 0.4];
        const totalDuration = Math.max(durationHint, PIANO_CHORD_MIN_RING_DURATION);
        const currentOscStopTime = now + totalDuration + 0.05;
        maxStopTime = Math.max(maxStopTime, currentOscStopTime);
        for (let i = 0; i < chordFreqs.length; i++) {
            const osc = audioContext.createOscillator();
            const noteGain = audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(chordFreqs[i], now);
            noteGain.gain.setValueAtTime(0, now);
            noteGain.gain.linearRampToValueAtTime(chordGains[i], now + PIANO_CHORD_ATTACK_TIME);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);
            osc.connect(noteGain);
            noteGain.connect(notePanner);
            osc.start(now);
            osc.stop(currentOscStopTime);
            oscillatorsToClean.push({ osc, gain: noteGain });
        }
    }
    else if (currentOscillatorType === 'water_drop') {
        // ... (existing water_drop synthesis logic)
        const osc = audioContext.createOscillator();
        const noteGain = audioContext.createGain();
        osc.type = 'sine';
        const targetFreq = frequency * 1.2;
        const startFreq = targetFreq * 1.5;
        const endFreq = targetFreq * 0.7;
        const attackEndTime = now + WATER_DROP_ATTACK;
        const soundEndTime = now + (durationHint > 0.01 && durationHint < 1.0 ? durationHint : WATER_DROP_EFFECT_DURATION);
        const currentOscStopTime = soundEndTime + 0.05;
        maxStopTime = Math.max(maxStopTime, currentOscStopTime);
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.05);
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.6, attackEndTime);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, soundEndTime);
        osc.connect(noteGain);
        noteGain.connect(notePanner);
        osc.start(now);
        osc.stop(currentOscStopTime);
        oscillatorsToClean.push({ osc, gain: noteGain });
    }
    else { // Default for sine, square, sawtooth, triangle (non-sample based)
        const osc = audioContext.createOscillator();
        const noteGain = audioContext.createGain();
        let oscType = 'sine';
        if (['sine', 'square', 'sawtooth', 'triangle'].includes(currentOscillatorType)) {
            oscType = currentOscillatorType;
        }
        osc.type = oscType;
        osc.frequency.setValueAtTime(frequency, now);
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(1, now + 0.01);
        noteGain.gain.setValueAtTime(1, now + durationHint - 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + durationHint);
        const currentOscStopTime = now + durationHint + 0.05;
        maxStopTime = Math.max(maxStopTime, currentOscStopTime);
        osc.connect(noteGain);
        noteGain.connect(notePanner);
        osc.start(now);
        osc.stop(currentOscStopTime);
        oscillatorsToClean.push({ osc, gain: noteGain });
    }
    if (!playedSampleSound) {
        oscillatorsToClean.forEach(item => {
            item.osc.onended = () => {
                if (audioContext && audioContext.state !== 'closed') {
                    if (item.osc) {
                        try {
                            item.osc.disconnect();
                        }
                        catch (e) { }
                    }
                    if (item.gain) {
                        try {
                            item.gain.disconnect();
                        }
                        catch (e) { }
                    }
                }
            };
        });
    }
    const pannerCleanupDelay = (maxStopTime - now + 0.1) * 1000;
    if (pannerCleanupDelay > 0) {
        setTimeout(() => {
            if (audioContext && audioContext.state !== 'closed' && notePanner) {
                try {
                    notePanner.disconnect();
                }
                catch (e) { }
            }
        }, pannerCleanupDelay);
    }
}
function startSustainedOscillator(oscGlobal, gainGlobal, pannerGlobal, frequency, basePanValue) {
    if (!audioContext || !mainGainNode || isCalibrationSoundMuted)
        return null;
    let baseOscType = 'sine';
    if (currentOscillatorType === 'bell3' ||
        currentOscillatorType === 'cosmic_harmony' ||
        currentOscillatorType === 'gusli' ||
        currentOscillatorType === 'water_drop' ||
        currentOscillatorType === 'piano_c_major' ||
        currentOscillatorType === 'bell_mp3' ||
        currentOscillatorType === 'custom_local_file' ||
        currentOscillatorType === 'finger_specific_local_files' ||
        currentOscillatorType === 'dual_hand_wav') { // Added dual_hand_wav
        baseOscType = 'triangle';
    }
    else if (['sine', 'square', 'sawtooth', 'triangle'].includes(currentOscillatorType)) {
        baseOscType = currentOscillatorType;
    }
    const finalPanValue = currentAudioPanningMode === "mono" ? 0 : basePanValue;
    if (oscGlobal && gainGlobal && pannerGlobal) {
        oscGlobal.frequency.setValueAtTime(frequency, audioContext.currentTime);
        if (oscGlobal.type !== baseOscType) {
            oscGlobal.type = baseOscType;
        }
        pannerGlobal.pan.setValueAtTime(finalPanValue, audioContext.currentTime);
        return { osc: oscGlobal, gain: gainGlobal, panner: pannerGlobal };
    }
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const panner = audioContext.createStereoPanner();
    osc.type = baseOscType;
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    panner.pan.setValueAtTime(finalPanValue, audioContext.currentTime);
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(mainGainNode); // Sustained oscillator dry path also to mainGainNode
    osc.start(audioContext.currentTime);
    return { osc, gain, panner };
}
function stopSustainedOscillator(osc, gain, panner) {
    if (!audioContext)
        return;
    const now = audioContext.currentTime;
    const releaseDuration = 0.1;
    const stopTime = now + releaseDuration + 0.05;
    if (gain) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + releaseDuration);
    }
    if (osc) {
        try {
            osc.stop(stopTime);
            osc.onended = () => {
                if (audioContext && audioContext.state !== 'closed') {
                    try {
                        if (osc)
                            osc.disconnect();
                    }
                    catch (e) { }
                    try {
                        if (gain)
                            gain.disconnect();
                    }
                    catch (e) { }
                    try {
                        if (panner)
                            panner.disconnect();
                    }
                    catch (e) { }
                }
            };
        }
        catch (e) {
            if (audioContext && audioContext.state !== 'closed') {
                try {
                    if (osc)
                        osc.disconnect();
                }
                catch (e) { }
                try {
                    if (gain)
                        gain.disconnect();
                }
                catch (e) { }
                try {
                    if (panner)
                        panner.disconnect();
                }
                catch (e) { }
            }
        }
    }
    else {
        if (audioContext && audioContext.state !== 'closed') {
            setTimeout(() => {
                try {
                    if (gain)
                        gain.disconnect();
                }
                catch (e) { }
                try {
                    if (panner)
                        panner.disconnect();
                }
                catch (e) { }
            }, (releaseDuration + 0.1) * 1000);
        }
    }
}
function stopAllSounds() {
    if (!audioContext)
        return;
    if (thereminOscLeft || thereminGainLeft || thereminPannerLeft) {
        stopSustainedOscillator(thereminOscLeft, thereminGainLeft, thereminPannerLeft);
        thereminOscLeft = null;
        thereminGainLeft = null;
        thereminPannerLeft = null;
    }
    if (thereminOscRight || thereminGainRight || thereminPannerRight) {
        stopSustainedOscillator(thereminOscRight, thereminGainRight, thereminPannerRight);
        thereminOscRight = null;
        thereminGainRight = null;
        thereminPannerRight = null;
    }
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        const keySound = fingerKeyOscillators[keyId];
        if (keySound) {
            stopSustainedOscillator(keySound.osc, keySound.gain, keySound.panner);
            fingerKeyOscillators[keyId] = null;
        }
    });
    console.log("All sustained sounds stopped.");
}
function updateActiveOscillatorTypes() {
    let newBaseTypeForSustained = 'sine';
    if (currentOscillatorType === 'bell3' ||
        currentOscillatorType === 'cosmic_harmony' ||
        currentOscillatorType === 'gusli' ||
        currentOscillatorType === 'water_drop' ||
        currentOscillatorType === 'piano_c_major' ||
        currentOscillatorType === 'bell_mp3' ||
        currentOscillatorType === 'custom_local_file' ||
        currentOscillatorType === 'finger_specific_local_files' ||
        currentOscillatorType === 'dual_hand_wav') { // Added dual_hand_wav
        newBaseTypeForSustained = 'triangle';
    }
    else if (['sine', 'square', 'sawtooth', 'triangle'].includes(currentOscillatorType)) {
        newBaseTypeForSustained = currentOscillatorType;
    }
    if (thereminOscLeft && thereminOscLeft.type !== newBaseTypeForSustained)
        thereminOscLeft.type = newBaseTypeForSustained;
    if (thereminOscRight && thereminOscRight.type !== newBaseTypeForSustained)
        thereminOscRight.type = newBaseTypeForSustained;
    Object.values(fingerKeyOscillators).forEach(keySound => {
        if (keySound && keySound.osc && keySound.osc.type !== newBaseTypeForSustained) {
            keySound.osc.type = newBaseTypeForSustained;
        }
    });
}
function updateActivePannersOnModeChange() {
    if (!audioContext)
        return;
    const now = audioContext.currentTime;
    const targetTime = now + 0.01;
    if (thereminPannerLeft) {
        const pan = currentAudioPanningMode === "mono" ? 0 : 1.0;
        thereminPannerLeft.pan.setTargetAtTime(pan, targetTime, 0.01);
    }
    if (thereminPannerRight) {
        const pan = currentAudioPanningMode === "mono" ? 0 : -1.0;
        thereminPannerRight.pan.setTargetAtTime(pan, targetTime, 0.01);
    }
    Object.entries(fingerKeyOscillators).forEach(([keyId, keySound]) => {
        if (keySound && keySound.panner) {
            let stereoPanVal = 0;
            if (keyId.startsWith('R-'))
                stereoPanVal = -1.0;
            else if (keyId.startsWith('L-'))
                stereoPanVal = 1.0;
            const pan = currentAudioPanningMode === "mono" ? 0 : stereoPanVal;
            keySound.panner.pan.setTargetAtTime(pan, targetTime, 0.01);
        }
    });
}
function onResults(results) {
    if (!canvasCtx || !canvasElement || !audioContext || !mainGainNode || !globalLowPassFilter) {
        return;
    }
    const ac = audioContext;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    let physLeftHandAudioControlledThisFrame = false;
    let physRightHandAudioControlledThisFrame = false;
    if (currentPlaybackMode === "fingerkeys" || calibrationState !== 'idle') {
        ALL_FINGER_KEY_IDS.forEach(keyId => {
            if (!latestFingerVisuals[keyId]) {
                latestFingerVisuals[keyId] = { heightPercent: 0, isActive: false, keyId: keyId, handedness: undefined };
            }
            else {
                latestFingerVisuals[keyId].heightPercent = 0;
            }
        });
    }
    if (currentPlaybackMode === "tappad") {
        Object.values(TAP_PAD_ZONES).forEach(pad => {
            var _a;
            canvasCtx.beginPath();
            canvasCtx.rect(pad.rect.x * canvasElement.width, pad.rect.y * canvasElement.height, pad.rect.w * canvasElement.width, pad.rect.h * canvasElement.height);
            canvasCtx.fillStyle = ((_a = padInteractionStates[pad.id]) === null || _a === void 0 ? void 0 : _a.isActive) ? pad.color.replace("0.3", "0.6") : pad.color;
            canvasCtx.fill();
            canvasCtx.strokeStyle = pad.color.replace("0.3", "0.8");
            canvasCtx.lineWidth = 2;
            canvasCtx.stroke();
        });
    }
    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].label;
            if (currentPerformanceProfile !== "ultra_min") {
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
                drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2, radius: 3 });
                if (showLandmarkNumbers) {
                    for (let j = 0; j < landmarks.length; j++) {
                        const landmark = landmarks[j];
                        const drawX = landmark.x * canvasElement.width;
                        const drawY = landmark.y * canvasElement.height;
                        const textNumber = (j).toString();
                        const textOffsetX = 5;
                        const textOffsetY = 5;
                        canvasCtx.save();
                        canvasCtx.translate(drawX + textOffsetX, drawY + textOffsetY);
                        canvasCtx.scale(-1, 1);
                        canvasCtx.font = '12px Arial';
                        canvasCtx.fillStyle = '#FFFF00';
                        canvasCtx.textAlign = 'left';
                        canvasCtx.textBaseline = 'top';
                        canvasCtx.fillText(textNumber, 0, 0);
                        canvasCtx.restore();
                    }
                }
            }
            if (landmarks && landmarks[WRIST] && mainGainNode && globalLowPassFilter) {
                const wristLandmark = landmarks[WRIST];
                const indexFingerTipLandmark = landmarks[FINGER_TIPS_INDICES.I];
                const screenX = wristLandmark.x * canvasElement.width;
                const screenY = wristLandmark.y * canvasElement.height;
                const shapeSize = 20;
                if (showHandShapes && currentPerformanceProfile !== "ultra_min") {
                    canvasCtx.beginPath();
                    if (handedness === 'Left') {
                        canvasCtx.arc(screenX, screenY, shapeSize / 1.5, 0, 2 * Math.PI);
                        canvasCtx.strokeStyle = '#007bff';
                        canvasCtx.lineWidth = 3;
                        canvasCtx.stroke();
                    }
                    else if (handedness === 'Right') {
                        canvasCtx.moveTo(screenX, screenY - shapeSize * 0.7);
                        canvasCtx.lineTo(screenX - shapeSize * 0.6, screenY + shapeSize * 0.35);
                        canvasCtx.lineTo(screenX + shapeSize * 0.6, screenY + shapeSize * 0.35);
                        canvasCtx.closePath();
                        canvasCtx.strokeStyle = '#ffc107';
                        canvasCtx.lineWidth = 3;
                        canvasCtx.stroke();
                    }
                }
                FINGER_LABELS.forEach(fingerLabel => {
                    var _a, _b, _c, _d, _e, _f, _g;
                    const tipIndex = FINGER_TIPS_INDICES[fingerLabel];
                    const fingerKeyId = `${handedness === 'Left' ? 'L' : 'R'}-${fingerLabel}`;
                    let point1, point2;
                    let currentRawDistance = 0;
                    let normalizedDistanceForThreshold = 0;
                    if (currentDistanceMode === "wrist_tip") {
                        point1 = wristLandmark;
                        point2 = landmarks[tipIndex];
                    }
                    else if (currentDistanceMode === "custom_points") {
                        const customPairIndices = CUSTOM_DISTANCE_LANDMARK_PAIRS[fingerLabel];
                        if (customPairIndices && landmarks[customPairIndices[0]] && landmarks[customPairIndices[1]]) {
                            point1 = landmarks[customPairIndices[1]];
                            point2 = landmarks[customPairIndices[0]];
                        }
                    }
                    else if (currentDistanceMode === "custom_user_defined") {
                        const userPairNum = userCustomLandmarkPairs[fingerKeyId];
                        if (userPairNum && landmarks[userPairNum[0]] && landmarks[userPairNum[1]]) {
                            point1 = landmarks[userPairNum[0]];
                            point2 = landmarks[userPairNum[1]];
                        }
                    }
                    if (point1 && point2) {
                        currentRawDistance = Math.hypot(point2.x - point1.x, point2.y - point1.y);
                        if (calibrationState === 'max_capture_pending' || calibrationState === 'min_capture_pending') {
                            latestRawDistancesForCalibration[fingerKeyId] = currentRawDistance;
                        }
                        const minCalibrated = fingerMinDistances[fingerKeyId];
                        const maxCalibrated = fingerMaxDistances[fingerKeyId];
                        if (typeof minCalibrated === 'number' && typeof maxCalibrated === 'number' && maxCalibrated > minCalibrated) {
                            normalizedDistanceForThreshold = ((maxCalibrated - currentRawDistance) / (maxCalibrated - minCalibrated)) * 100;
                        }
                        else {
                            normalizedDistanceForThreshold = (1 - Math.min(currentRawDistance, MAX_FINGER_DISTANCE_NORMALIZATION) / MAX_FINGER_DISTANCE_NORMALIZATION) * 100;
                        }
                        normalizedDistanceForThreshold = Math.max(0, Math.min(100, normalizedDistanceForThreshold));
                        if (calibrationState === 'range_capturing') {
                            if (!fingerRangeSampleData[fingerKeyId])
                                fingerRangeSampleData[fingerKeyId] = [];
                            fingerRangeSampleData[fingerKeyId].push(normalizedDistanceForThreshold);
                        }
                        latestFingerVisuals[fingerKeyId] = {
                            heightPercent: normalizedDistanceForThreshold,
                            isActive: (_a = fingerKeyStates[fingerKeyId]) === null || _a === void 0 ? void 0 : _a.isActive,
                            handedness: handedness,
                            keyId: fingerKeyId
                        };
                        if (currentPlaybackMode === "fingerkeys" && !fingerKeyMutedStates[fingerKeyId] && !isCalibrationSoundMuted) {
                            const threshold = (_b = fingerKeyThresholds[fingerKeyId]) !== null && _b !== void 0 ? _b : DEFAULT_INDIVIDUAL_FINGER_THRESHOLD;
                            const isActiveNow = normalizedDistanceForThreshold >= threshold;
                            const now = ac.currentTime;
                            const isPercussiveTypeOrSample = currentOscillatorType === 'bell3' || currentOscillatorType === 'cosmic_harmony' || currentOscillatorType === 'gusli' || currentOscillatorType === 'piano_c_major' || currentOscillatorType === 'water_drop' || currentOscillatorType === 'bell_mp3' || currentOscillatorType === 'custom_local_file' || currentOscillatorType === 'finger_specific_local_files' || currentOscillatorType === 'dual_hand_wav';
                            const basePanVal = fingerKeyId.startsWith('R-') ? -1.0 : (fingerKeyId.startsWith('L-') ? 1.0 : 0);
                            if (isActiveNow && !((_c = fingerKeyStates[fingerKeyId]) === null || _c === void 0 ? void 0 : _c.isActive)) {
                                fingerKeyStates[fingerKeyId].isActive = true;
                                if (latestFingerVisuals[fingerKeyId])
                                    latestFingerVisuals[fingerKeyId].isActive = true;
                                const freq = getFrequencyForKey(fingerKeyId);
                                let percussiveDuration = 0.2;
                                if (currentOscillatorType === 'bell3')
                                    percussiveDuration = BELL3_MIN_RING_DURATION;
                                else if (currentOscillatorType === 'cosmic_harmony')
                                    percussiveDuration = COSMIC_HARMONY_TOTAL_DURATION;
                                else if (currentOscillatorType === 'gusli')
                                    percussiveDuration = GUSLI_PLUCK_DURATION;
                                else if (currentOscillatorType === 'piano_c_major')
                                    percussiveDuration = PIANO_CHORD_MIN_RING_DURATION;
                                else if (currentOscillatorType === 'water_drop')
                                    percussiveDuration = WATER_DROP_EFFECT_DURATION;
                                else if (currentOscillatorType === 'bell_mp3')
                                    percussiveDuration = (bellMp3Buffer === null || bellMp3Buffer === void 0 ? void 0 : bellMp3Buffer.duration) || 0.5;
                                else if (currentOscillatorType === 'custom_local_file')
                                    percussiveDuration = (customUserAudioBuffer === null || customUserAudioBuffer === void 0 ? void 0 : customUserAudioBuffer.duration) || 0.5;
                                else if (currentOscillatorType === 'finger_specific_local_files') {
                                    percussiveDuration = ((_d = customFingerAudioBuffers[fingerKeyId]) === null || _d === void 0 ? void 0 : _d.duration) || 0.1;
                                }
                                else if (currentOscillatorType === 'dual_hand_wav') {
                                    const handType = fingerKeyId.startsWith('L-') ? 'Left' : 'Right';
                                    const buffer = handType === 'Left' ? leftWavBuffer : rightWavBuffer;
                                    percussiveDuration = (buffer === null || buffer === void 0 ? void 0 : buffer.duration) || 0.1;
                                }
                                playOscillatorNote(freq, percussiveDuration, basePanVal, fingerKeyId);
                                if (!isPercussiveTypeOrSample) {
                                    if (mainGainNode && (!fingerKeyOscillators[fingerKeyId] || !((_e = fingerKeyOscillators[fingerKeyId]) === null || _e === void 0 ? void 0 : _e.osc))) {
                                        const { osc, gain, panner } = startSustainedOscillator(null, null, null, freq, basePanVal) || {};
                                        if (osc && gain && panner) {
                                            fingerKeyOscillators[fingerKeyId] = { osc, gain, panner };
                                            gain.gain.setValueAtTime(0, now);
                                            gain.gain.linearRampToValueAtTime(1, now + 0.01);
                                        }
                                    }
                                }
                            }
                            else if (!isActiveNow && ((_f = fingerKeyStates[fingerKeyId]) === null || _f === void 0 ? void 0 : _f.isActive)) {
                                fingerKeyStates[fingerKeyId].isActive = false;
                                if (latestFingerVisuals[fingerKeyId])
                                    latestFingerVisuals[fingerKeyId].isActive = false;
                                if (!isPercussiveTypeOrSample) {
                                    const keySound = fingerKeyOscillators[fingerKeyId];
                                    if (keySound) {
                                        stopSustainedOscillator(keySound.osc, keySound.gain, keySound.panner);
                                        fingerKeyOscillators[fingerKeyId] = null;
                                    }
                                }
                                else if (fingerKeyOscillators[fingerKeyId]) {
                                    const keySound = fingerKeyOscillators[fingerKeyId];
                                    if (keySound) {
                                        stopSustainedOscillator(keySound.osc, keySound.gain, keySound.panner);
                                        fingerKeyOscillators[fingerKeyId] = null;
                                    }
                                }
                            }
                        }
                    }
                    else {
                        latestFingerVisuals[fingerKeyId] = {
                            heightPercent: 0,
                            isActive: false,
                            handedness: handedness,
                            keyId: fingerKeyId
                        };
                        normalizedDistanceForThreshold = 0;
                        const isPercussiveTypeOrSample = currentOscillatorType === 'bell3' || currentOscillatorType === 'cosmic_harmony' || currentOscillatorType === 'gusli' || currentOscillatorType === 'piano_c_major' || currentOscillatorType === 'water_drop' || currentOscillatorType === 'bell_mp3' || currentOscillatorType === 'custom_local_file' || currentOscillatorType === 'finger_specific_local_files' || currentOscillatorType === 'dual_hand_wav';
                        if (currentPlaybackMode === "fingerkeys" && ((_g = fingerKeyStates[fingerKeyId]) === null || _g === void 0 ? void 0 : _g.isActive) && !isCalibrationSoundMuted) {
                            fingerKeyStates[fingerKeyId].isActive = false;
                            if (latestFingerVisuals[fingerKeyId])
                                latestFingerVisuals[fingerKeyId].isActive = false;
                            if (!isPercussiveTypeOrSample || fingerKeyOscillators[fingerKeyId]) {
                                const keySound = fingerKeyOscillators[fingerKeyId];
                                if (keySound) {
                                    stopSustainedOscillator(keySound.osc, keySound.gain, keySound.panner);
                                    fingerKeyOscillators[fingerKeyId] = null;
                                }
                            }
                        }
                    }
                });
                if (currentPlaybackMode === "theremin" && wristLandmark && mainGainNode && !isCalibrationSoundMuted) {
                    const controlX = 1.0 - wristLandmark.x;
                    const controlY = 1.0 - wristLandmark.y;
                    const freq = MIN_FREQ + controlY * (MAX_FREQ - MIN_FREQ);
                    const gainVal = MIN_GAIN + controlX * (MAX_GAIN - MIN_GAIN);
                    const now = ac.currentTime;
                    const targetTime = now + 0.01;
                    const isDualWavTheremin = currentOscillatorType === 'dual_hand_wav';
                    if (handedness === 'Left') {
                        const basePan = 1.0;
                        const finalThereminPan = currentAudioPanningMode === "mono" ? 0 : basePan;
                        if (isDualWavTheremin && leftWavBuffer) {
                            const isActiveNow = gainVal > 0.01;
                            if (isActiveNow && !physLeftHandThereminActive) {
                                playOscillatorNote(freq, leftWavBuffer.duration, basePan, undefined, 'Left');
                            }
                            physLeftHandThereminActive = isActiveNow;
                        }
                        if (!thereminOscLeft || !thereminGainLeft || !thereminPannerLeft) {
                            const newSetup = startSustainedOscillator(null, null, null, freq, basePan);
                            if (newSetup && newSetup.osc && newSetup.gain && newSetup.panner) {
                                thereminOscLeft = newSetup.osc;
                                thereminGainLeft = newSetup.gain;
                                thereminPannerLeft = newSetup.panner;
                            }
                        }
                        if (thereminOscLeft && thereminGainLeft && thereminPannerLeft) {
                            thereminOscLeft.frequency.setTargetAtTime(freq, targetTime, 0.01);
                            // For dual_hand_wav, we might want the underlying synth to be silent or very low
                            const actualGainForSynth = isDualWavTheremin ? 0.0001 : gainVal;
                            thereminGainLeft.gain.setTargetAtTime(actualGainForSynth, targetTime, 0.01);
                            thereminPannerLeft.pan.setTargetAtTime(finalThereminPan, targetTime, 0.01);
                        }
                        physLeftHandAudioControlledThisFrame = true;
                    }
                    else if (handedness === 'Right') {
                        const basePan = -1.0;
                        const finalThereminPan = currentAudioPanningMode === "mono" ? 0 : basePan;
                        if (isDualWavTheremin && rightWavBuffer) {
                            const isActiveNow = gainVal > 0.01;
                            if (isActiveNow && !physRightHandThereminActive) {
                                playOscillatorNote(freq, rightWavBuffer.duration, basePan, undefined, 'Right');
                            }
                            physRightHandThereminActive = isActiveNow;
                        }
                        if (!thereminOscRight || !thereminGainRight || !thereminPannerRight) {
                            const newSetup = startSustainedOscillator(null, null, null, freq, basePan);
                            if (newSetup && newSetup.osc && newSetup.gain && newSetup.panner) {
                                thereminOscRight = newSetup.osc;
                                thereminGainRight = newSetup.gain;
                                thereminPannerRight = newSetup.panner;
                            }
                        }
                        if (thereminOscRight && thereminGainRight && thereminPannerRight) {
                            thereminOscRight.frequency.setTargetAtTime(freq, targetTime, 0.01);
                            const actualGainForSynth = isDualWavTheremin ? 0.0001 : gainVal;
                            thereminGainRight.gain.setTargetAtTime(actualGainForSynth, targetTime, 0.01);
                            thereminPannerRight.pan.setTargetAtTime(finalThereminPan, targetTime, 0.01);
                        }
                        physRightHandAudioControlledThisFrame = true;
                    }
                }
                else if (currentPlaybackMode === "tappad" && wristLandmark && indexFingerTipLandmark && !isCalibrationSoundMuted) {
                    const tipX_camera = indexFingerTipLandmark.x;
                    const tipY_camera = indexFingerTipLandmark.y;
                    const tipX_screen = 1.0 - tipX_camera;
                    const tipY_screen = tipY_camera;
                    Object.values(TAP_PAD_ZONES).forEach(pad => {
                        const padRect = pad.rect;
                        let canHandInteractWithThisPad = false;
                        // Physical Right Hand (Triangle on screen, controls screen left pads, pans left in stereo)
                        if (handedness === 'Right' && pad.pan < 0) {
                            canHandInteractWithThisPad = true;
                            // Physical Left Hand (Circle on screen, controls screen right pads, pans right in stereo)
                        }
                        else if (handedness === 'Left' && pad.pan > 0) {
                            canHandInteractWithThisPad = true;
                        }
                        if (canHandInteractWithThisPad &&
                            tipX_screen >= padRect.x && tipX_screen <= (padRect.x + padRect.w) &&
                            tipY_screen >= padRect.y && tipY_screen <= (padRect.y + padRect.h)) {
                            if (!padInteractionStates[pad.id].isActive) {
                                padInteractionStates[pad.id].isActive = true;
                                let duration = TAP_NOTE_DURATION_OSC;
                                if (currentOscillatorType === 'dual_hand_wav') {
                                    const buffer = handedness === 'Left' ? leftWavBuffer : rightWavBuffer;
                                    duration = (buffer === null || buffer === void 0 ? void 0 : buffer.duration) || 0.1;
                                }
                                else if (currentOscillatorType === 'bell_mp3')
                                    duration = (bellMp3Buffer === null || bellMp3Buffer === void 0 ? void 0 : bellMp3Buffer.duration) || 0.5;
                                else if (currentOscillatorType === 'custom_local_file')
                                    duration = (customUserAudioBuffer === null || customUserAudioBuffer === void 0 ? void 0 : customUserAudioBuffer.duration) || 0.5;
                                // fingerKeyIdForSample is not relevant for tappad in this specific call
                                playOscillatorNote(pad.freq, duration, pad.pan, undefined, handedness);
                            }
                        }
                        else {
                            if (padInteractionStates[pad.id].isActive) {
                                padInteractionStates[pad.id].isActive = false;
                            }
                        }
                    });
                }
            }
        }
        if (currentPlaybackMode === "theremin") {
            if (!physLeftHandAudioControlledThisFrame) {
                if (thereminGainLeft)
                    thereminGainLeft.gain.setTargetAtTime(0, ac.currentTime, 0.05);
                physLeftHandThereminActive = false;
            }
            if (!physRightHandAudioControlledThisFrame) {
                if (thereminGainRight)
                    thereminGainRight.gain.setTargetAtTime(0, ac.currentTime, 0.05);
                physRightHandThereminActive = false;
            }
        }
    }
    else { // No hands detected
        if (currentPlaybackMode === "theremin") {
            if (thereminGainLeft)
                thereminGainLeft.gain.setTargetAtTime(0, ac.currentTime, 0.05);
            if (thereminGainRight)
                thereminGainRight.gain.setTargetAtTime(0, ac.currentTime, 0.05);
            physLeftHandThereminActive = false;
            physRightHandThereminActive = false;
        }
        Object.values(TAP_PAD_ZONES).forEach(pad => {
            if (padInteractionStates[pad.id].isActive) {
                padInteractionStates[pad.id].isActive = false;
            }
        });
        ALL_FINGER_KEY_IDS.forEach(keyId => {
            var _a;
            latestFingerVisuals[keyId] = { heightPercent: 0, isActive: false, keyId: keyId, handedness: undefined };
            const isPercussiveTypeOrSample = currentOscillatorType === 'bell3' || currentOscillatorType === 'cosmic_harmony' || currentOscillatorType === 'gusli' || currentOscillatorType === 'piano_c_major' || currentOscillatorType === 'water_drop' || currentOscillatorType === 'bell_mp3' || currentOscillatorType === 'custom_local_file' || currentOscillatorType === 'finger_specific_local_files' || currentOscillatorType === 'dual_hand_wav';
            if ((_a = fingerKeyStates[keyId]) === null || _a === void 0 ? void 0 : _a.isActive) {
                fingerKeyStates[keyId].isActive = false;
                if (!isPercussiveTypeOrSample || fingerKeyOscillators[keyId]) {
                    const keySound = fingerKeyOscillators[keyId];
                    if (keySound) {
                        stopSustainedOscillator(keySound.osc, keySound.gain, keySound.panner);
                        fingerKeyOscillators[keyId] = null;
                    }
                }
            }
        });
    }
    if ((currentPlaybackMode === "fingerkeys" || calibrationState !== 'idle') && !equalizerVisualUpdateRequested) {
        equalizerVisualUpdateRequested = true;
        requestAnimationFrame(renderEqualizerBarsFromData);
    }
    canvasCtx.restore();
}
function updateAudioEffectsUIVisibility() {
    var _a, _b;
    const isSampleBasedMode = currentOscillatorType === 'bell_mp3' ||
        currentOscillatorType === 'custom_local_file' ||
        currentOscillatorType === 'finger_specific_local_files' ||
        currentOscillatorType === 'dual_hand_wav';
    if (audioEffectsPanel) {
        audioEffectsPanel.classList.toggle('content-hidden', !isSampleBasedMode);
    }
    // Reverb UI update logic removed
    if (enableDelayCheckbox) {
        enableDelayCheckbox.disabled = !isSampleBasedMode;
        if (!isSampleBasedMode) {
            (_a = document.querySelector('label[for="enable-delay-checkbox"]')) === null || _a === void 0 ? void 0 : _a.classList.add('label-disabled');
        }
        else {
            (_b = document.querySelector('label[for="enable-delay-checkbox"]')) === null || _b === void 0 ? void 0 : _b.classList.remove('label-disabled');
        }
    }
    if (delayTimeSlider)
        delayTimeSlider.disabled = !isSampleBasedMode || !currentAudioEffects.isDelayEnabled;
    if (delayFeedbackSlider)
        delayFeedbackSlider.disabled = !isSampleBasedMode || !currentAudioEffects.isDelayEnabled;
    if (delayLevelSlider)
        delayLevelSlider.disabled = !isSampleBasedMode || !currentAudioEffects.isDelayEnabled;
}
function applyAudioEffects() {
    if (!audioContext || !delayNode || !delayFeedbackGainNode || !delayWetGainNode)
        return;
    const now = audioContext.currentTime;
    // Reverb application logic removed
    // Delay
    if (delayNode && delayFeedbackGainNode && delayWetGainNode) {
        const targetDelayWetGain = currentAudioEffects.isDelayEnabled ? currentAudioEffects.delayLevel : 0;
        delayWetGainNode.gain.setTargetAtTime(targetDelayWetGain, now, 0.01);
        const targetDelayTime = currentAudioEffects.isDelayEnabled ? currentAudioEffects.delayTimeMs / 1000.0 : 0;
        delayNode.delayTime.setTargetAtTime(targetDelayTime, now, 0.01);
        const targetFeedbackGain = currentAudioEffects.isDelayEnabled ? currentAudioEffects.delayFeedback : 0;
        delayFeedbackGainNode.gain.setTargetAtTime(targetFeedbackGain, now, 0.01);
    }
    if (delayTimeSlider)
        delayTimeSlider.disabled = !currentAudioEffects.isDelayEnabled;
    if (delayFeedbackSlider)
        delayFeedbackSlider.disabled = !currentAudioEffects.isDelayEnabled;
    if (delayLevelSlider)
        delayLevelSlider.disabled = !currentAudioEffects.isDelayEnabled;
    updateAudioEffectsUIVisibility(); // Ensure dependent UI updates
}
function loadAudioEffectsSettings() {
    currentAudioEffects = loadFromLocalStorage(LOCALSTORAGE_KEY_AUDIO_EFFECTS, {
        // isReverbEnabled: false, // Removed
        // reverbLevel: 0.3, // Removed
        isDelayEnabled: false,
        delayTimeMs: 200,
        delayFeedback: 0.4,
        delayLevel: 0.3,
    });
    // Reverb UI loading removed
    if (enableDelayCheckbox)
        enableDelayCheckbox.checked = currentAudioEffects.isDelayEnabled;
    if (delayTimeSlider)
        delayTimeSlider.value = currentAudioEffects.delayTimeMs.toString();
    if (delayTimeValueDisplay)
        delayTimeValueDisplay.textContent = `${currentAudioEffects.delayTimeMs} мс`;
    if (delayFeedbackSlider)
        delayFeedbackSlider.value = currentAudioEffects.delayFeedback.toString();
    if (delayFeedbackValueDisplay)
        delayFeedbackValueDisplay.textContent = `${Math.round(currentAudioEffects.delayFeedback * 100)}%`;
    if (delayLevelSlider)
        delayLevelSlider.value = currentAudioEffects.delayLevel.toString();
    if (delayLevelValueDisplay)
        delayLevelValueDisplay.textContent = `${Math.round(currentAudioEffects.delayLevel * 100)}%`;
    applyAudioEffects(); // Apply loaded settings to audio nodes
    updateAudioEffectsUIVisibility();
}
function saveAudioEffectsSettings() {
    saveToLocalStorage(LOCALSTORAGE_KEY_AUDIO_EFFECTS, currentAudioEffects);
}
function updatePlaybackModeVisuals() {
    if (!equalizerContainer || !customPairsConfigContainer || !calibrationControlsContainer || !distanceModeSelector || !visualizationControlsContainer)
        return;
    const isFingerKeys = currentPlaybackMode === 'fingerkeys';
    const isCustomUserDistance = currentDistanceMode === 'custom_user_defined';
    equalizerContainer.classList.toggle('fingerkeys-mode-active', isFingerKeys);
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        const thresholdControls = document.getElementById(`${keyId.toLowerCase()}-threshold-controls`);
        if (thresholdControls) {
            thresholdControls.classList.toggle('threshold-controls-hidden', !isFingerKeys || !showIndividualThresholdControls);
        }
        const barWrapper = document.getElementById(`${keyId.toLowerCase()}-bar-wrapper`);
        if (barWrapper) {
            barWrapper.setAttribute('role', isFingerKeys ? 'button' : 'img');
            barWrapper.setAttribute('tabindex', isFingerKeys ? '0' : '-1');
        }
    });
    customPairsConfigContainer.classList.toggle('hidden-control-group', !(isFingerKeys && isCustomUserDistance));
    calibrationControlsContainer.classList.toggle('hidden-control-group', !isFingerKeys);
    visualizationControlsContainer.classList.toggle('hidden-control-group', !isFingerKeys);
    if (toggleLandmarkNumbersButton) {
        toggleLandmarkNumbersButton.disabled = currentPerformanceProfile === "ultra_min" || !isFingerKeys;
    }
    if (toggleHandShapesButton) {
        toggleHandShapesButton.disabled = currentPerformanceProfile === "ultra_min" || !isFingerKeys;
    }
    const distanceModeRadios = distanceModeSelector.querySelectorAll('input[name="distance-mode"]');
    distanceModeSelector.classList.toggle('control-group-disabled', !isFingerKeys);
    distanceModeRadios.forEach(radio => {
        radio.disabled = !isFingerKeys;
    });
    const distanceModeLabels = distanceModeSelector.querySelectorAll('label');
    distanceModeLabels.forEach(label => {
        label.classList.toggle('label-disabled', !isFingerKeys);
    });
    if (!equalizerVisualUpdateRequested) {
        equalizerVisualUpdateRequested = true;
        requestAnimationFrame(renderEqualizerBarsFromData);
    }
    updateAudioEffectsUIVisibility();
}
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    }
    catch (e) {
        console.error("Error saving to localStorage:", e);
    }
}
function loadFromLocalStorage(key, defaultValue) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    }
    catch (e) {
        console.error("Error loading from localStorage:", e);
        return defaultValue;
    }
}
function loadFingerKeyThresholds() {
    fingerKeyThresholds = loadFromLocalStorage(LOCALSTORAGE_KEY_THRESHOLDS, {});
    ALL_FINGER_KEY_IDS.forEach((currentKeyId) => {
        if (fingerKeyThresholds[currentKeyId] === undefined) {
            fingerKeyThresholds[currentKeyId] = DEFAULT_INDIVIDUAL_FINGER_THRESHOLD;
        }
        updateFingerThresholdDisplay(currentKeyId);
    });
}
function saveFingerKeyThresholds() {
    saveToLocalStorage(LOCALSTORAGE_KEY_THRESHOLDS, fingerKeyThresholds);
}
function loadFingerKeyMutedStates() {
    fingerKeyMutedStates = loadFromLocalStorage(LOCALSTORAGE_KEY_MUTED_STATES, {});
    ALL_FINGER_KEY_IDS.forEach((currentKeyId) => {
        if (fingerKeyMutedStates[currentKeyId] === undefined) {
            fingerKeyMutedStates[currentKeyId] = false;
        }
        updateFingerMuteVisuals(currentKeyId);
    });
}
function saveFingerKeyMutedStates() {
    saveToLocalStorage(LOCALSTORAGE_KEY_MUTED_STATES, fingerKeyMutedStates);
}
function loadFingerMinMaxDistances() {
    fingerMinDistances = loadFromLocalStorage(LOCALSTORAGE_KEY_FINGER_MIN_DISTANCES, {});
    fingerMaxDistances = loadFromLocalStorage(LOCALSTORAGE_KEY_FINGER_MAX_DISTANCES, {});
}
function saveFingerMinMaxDistances() {
    saveToLocalStorage(LOCALSTORAGE_KEY_FINGER_MIN_DISTANCES, fingerMinDistances);
    saveToLocalStorage(LOCALSTORAGE_KEY_FINGER_MAX_DISTANCES, fingerMaxDistances);
}
function updateOscillatorRelatedFileInputVisibility() {
    const isFingerKeysMode = currentPlaybackMode === 'fingerkeys';
    if (localFileInputContainer) {
        if (currentOscillatorType === 'custom_local_file') {
            localFileInputContainer.classList.remove('content-hidden');
            if (localFileStatusElement) {
                localFileStatusElement.textContent = customUserAudioFileName
                    ? `Загружен: ${customUserAudioFileName}`
                    : 'Файл не выбран';
            }
        }
        else {
            localFileInputContainer.classList.add('content-hidden');
        }
    }
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        const fingerAudioControls = document.getElementById(`${keyId.toLowerCase()}-audio-file-controls`);
        if (fingerAudioControls) {
            const showControls = isFingerKeysMode && currentOscillatorType === 'finger_specific_local_files';
            fingerAudioControls.classList.toggle('content-hidden', !showControls);
        }
    });
    updateAudioEffectsUIVisibility();
}
function handleLocalFileChange(event) {
    return __awaiter(this, void 0, void 0, function* () {
        const input = event.target;
        if (!input.files || input.files.length === 0) {
            if (localFileStatusElement)
                localFileStatusElement.textContent = "Файл не выбран.";
            customUserAudioBuffer = null;
            customUserAudioFileName = null;
            return;
        }
        const file = input.files[0];
        const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav'];
        if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.mp3') && !file.name.toLowerCase().endsWith('.wav')) {
            if (localFileStatusElement)
                localFileStatusElement.textContent = "Ошибка: Неверный тип файла. Нужен MP3 или WAV.";
            customUserAudioBuffer = null;
            customUserAudioFileName = null;
            input.value = '';
            return;
        }
        if (localFileStatusElement)
            localFileStatusElement.textContent = `Загрузка: ${file.name}...`;
        const audioReady = yield initializeAudio();
        if (!audioReady || !audioContext) {
            if (localFileStatusElement)
                localFileStatusElement.textContent = "Ошибка аудиосистемы. Не удалось обработать файл.";
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const arrayBuffer = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
                if (!audioContext) {
                    if (localFileStatusElement)
                        localFileStatusElement.textContent = "Ошибка аудио: контекст отсутствует.";
                    input.value = '';
                    return;
                }
                audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                    customUserAudioBuffer = buffer;
                    customUserAudioFileName = file.name;
                    if (localFileStatusElement)
                        localFileStatusElement.textContent = `Загружен: ${file.name}`;
                    if (statusMessage)
                        statusMessage.textContent = `Локальный файл "${file.name}" загружен.`;
                    input.value = '';
                }, (decodeError) => {
                    console.error("Error decoding local audio file:", decodeError);
                    if (localFileStatusElement)
                        localFileStatusElement.textContent = "Ошибка декодирования файла.";
                    if (statusMessage)
                        statusMessage.textContent = "Ошибка: Не удалось декодировать аудиофайл.";
                    customUserAudioBuffer = null;
                    customUserAudioFileName = null;
                    input.value = '';
                });
            }
            catch (readError) {
                console.error("Error reading local audio file:", readError);
                if (localFileStatusElement)
                    localFileStatusElement.textContent = "Ошибка чтения файла.";
                customUserAudioBuffer = null;
                customUserAudioFileName = null;
                input.value = '';
            }
        });
        reader.onerror = () => {
            console.error("FileReader error for local audio file.");
            if (localFileStatusElement)
                localFileStatusElement.textContent = "Ошибка загрузки файла.";
            customUserAudioBuffer = null;
            customUserAudioFileName = null;
            input.value = '';
        };
        reader.readAsArrayBuffer(file);
    });
}
function handleFingerSpecificFileChange(event, fingerKeyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const input = event.target;
        const fileStatusElement = document.getElementById(`${fingerKeyId.toLowerCase()}-file-status`);
        if (!input.files || input.files.length === 0) {
            if (fileStatusElement)
                fileStatusElement.textContent = "Не выбран";
            customFingerAudioBuffers[fingerKeyId] = null;
            customFingerAudioFileNames[fingerKeyId] = null;
            return;
        }
        const file = input.files[0];
        const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav'];
        if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.mp3') && !file.name.toLowerCase().endsWith('.wav')) {
            if (fileStatusElement)
                fileStatusElement.textContent = "MP3/WAV!";
            customFingerAudioBuffers[fingerKeyId] = null;
            customFingerAudioFileNames[fingerKeyId] = null;
            input.value = '';
            return;
        }
        if (fileStatusElement)
            fileStatusElement.textContent = `Загр: ${file.name.substring(0, 6)}...`;
        const audioReady = yield initializeAudio();
        if (!audioReady || !audioContext) {
            if (fileStatusElement)
                fileStatusElement.textContent = "Аудио ошибка";
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const arrayBuffer = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
                if (!audioContext) {
                    if (fileStatusElement)
                        fileStatusElement.textContent = "Аудио ошибка";
                    input.value = '';
                    return;
                }
                audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                    customFingerAudioBuffers[fingerKeyId] = buffer;
                    customFingerAudioFileNames[fingerKeyId] = file.name;
                    if (fileStatusElement)
                        fileStatusElement.textContent = `${file.name.substring(0, 10)}${file.name.length > 10 ? '...' : ''}`;
                    if (statusMessage)
                        statusMessage.textContent = `Файл "${file.name}" для ${fingerKeyId} загружен.`;
                    input.value = '';
                }, (decodeError) => {
                    console.error(`Error decoding file for ${fingerKeyId}:`, decodeError);
                    if (fileStatusElement)
                        fileStatusElement.textContent = "Ошибка дек.";
                    customFingerAudioBuffers[fingerKeyId] = null;
                    customFingerAudioFileNames[fingerKeyId] = null;
                    input.value = '';
                });
            }
            catch (readError) {
                console.error(`Error reading file for ${fingerKeyId}:`, readError);
                if (fileStatusElement)
                    fileStatusElement.textContent = "Ошибка чтения";
                customFingerAudioBuffers[fingerKeyId] = null;
                customFingerAudioFileNames[fingerKeyId] = null;
                input.value = '';
            }
        });
        reader.onerror = () => {
            console.error(`FileReader error for ${fingerKeyId}.`);
            if (fileStatusElement)
                fileStatusElement.textContent = "Ошибка загрузки";
            customFingerAudioBuffers[fingerKeyId] = null;
            customFingerAudioFileNames[fingerKeyId] = null;
            input.value = '';
        };
        reader.readAsArrayBuffer(file);
    });
}
function loadSoundSettings() {
    currentOscillatorType = loadFromLocalStorage(LOCALSTORAGE_KEY_OSC_TYPE, 'dual_hand_wav'); // Default to dual_hand_wav
    const validOscTypes = ['sine', 'square', 'sawtooth', 'triangle', 'bell3', 'cosmic_harmony', 'gusli', 'piano_c_major', 'water_drop', 'bell_mp3', 'custom_local_file', 'finger_specific_local_files', 'dual_hand_wav'];
    if (!validOscTypes.includes(currentOscillatorType)) {
        currentOscillatorType = 'dual_hand_wav'; // Fallback to new default if localStorage has invalid value
    }
    filterCutoffFrequency = loadFromLocalStorage(LOCALSTORAGE_KEY_FILTER_CUTOFF, 12000);
    filterQValue = loadFromLocalStorage(LOCALSTORAGE_KEY_FILTER_Q, 1);
    let oscRadioToSelect = document.querySelector(`input[name="osc-type"][value="${currentOscillatorType}"]`);
    if (oscRadioToSelect) {
        // If the loaded/default type is sample-based AND it's disabled (e.g., files missing)
        if ((currentOscillatorType === 'bell_mp3' || currentOscillatorType === 'dual_hand_wav' || currentOscillatorType === 'custom_local_file') && oscRadioToSelect.disabled) {
            const dualWavRadio = document.getElementById('osc-dual-hand-wav');
            const cosmicHarmonyRadio = document.getElementById('osc-cosmic-harmony');
            const triangleRadio = document.getElementById('osc-triangle');
            const sineRadio = document.getElementById('osc-sine');
            if (currentOscillatorType === 'dual_hand_wav') { // Specifically if default 'dual_hand_wav' failed
                if (cosmicHarmonyRadio && !cosmicHarmonyRadio.disabled) {
                    currentOscillatorType = 'cosmic_harmony';
                    oscRadioToSelect = cosmicHarmonyRadio;
                }
                else if (triangleRadio && !triangleRadio.disabled) {
                    currentOscillatorType = 'triangle';
                    oscRadioToSelect = triangleRadio;
                }
                else if (sineRadio) { // Absolute fallback
                    currentOscillatorType = 'sine';
                    oscRadioToSelect = sineRadio;
                }
            }
            else { // If bell_mp3 or custom_local_file failed (and was the stored/attempted default)
                if (dualWavRadio && !dualWavRadio.disabled) { // Try dual_hand_wav first
                    currentOscillatorType = 'dual_hand_wav';
                    oscRadioToSelect = dualWavRadio;
                }
                else if (cosmicHarmonyRadio && !cosmicHarmonyRadio.disabled) {
                    currentOscillatorType = 'cosmic_harmony';
                    oscRadioToSelect = cosmicHarmonyRadio;
                }
                else if (triangleRadio && !triangleRadio.disabled) {
                    currentOscillatorType = 'triangle';
                    oscRadioToSelect = triangleRadio;
                }
                else if (sineRadio) {
                    currentOscillatorType = 'sine';
                    oscRadioToSelect = sineRadio;
                }
            }
            if (oscRadioToSelect)
                oscRadioToSelect.checked = true;
        }
        else {
            oscRadioToSelect.checked = true;
        }
    }
    else {
        // Fallback if loaded type from localStorage is completely invalid or radio doesn't exist
        const dualWavRadio = document.getElementById('osc-dual-hand-wav');
        const cosmicHarmonyRadio = document.getElementById('osc-cosmic-harmony');
        const triangleRadio = document.getElementById('osc-triangle');
        const sineRadio = document.getElementById('osc-sine');
        if (dualWavRadio && !dualWavRadio.disabled) {
            currentOscillatorType = 'dual_hand_wav';
            dualWavRadio.checked = true;
        }
        else if (cosmicHarmonyRadio && !cosmicHarmonyRadio.disabled) {
            currentOscillatorType = 'cosmic_harmony';
            cosmicHarmonyRadio.checked = true;
        }
        else if (triangleRadio && !triangleRadio.disabled) {
            currentOscillatorType = 'triangle';
            triangleRadio.checked = true;
        }
        else if (sineRadio) {
            currentOscillatorType = 'sine';
            sineRadio.checked = true;
        }
    }
    if (filterCutoffSlider)
        filterCutoffSlider.value = filterCutoffFrequency.toString();
    if (filterCutoffValueDisplay)
        filterCutoffValueDisplay.textContent = `${filterCutoffFrequency} Гц`;
    if (filterQSlider)
        filterQSlider.value = filterQValue.toString();
    if (filterQValueDisplay)
        filterQValueDisplay.textContent = filterQValue.toFixed(1);
    if (globalLowPassFilter && audioContext && audioContext.state !== 'closed') {
        globalLowPassFilter.frequency.setValueAtTime(filterCutoffFrequency, audioContext.currentTime);
        globalLowPassFilter.Q.setValueAtTime(filterQValue, audioContext.currentTime);
    }
    updateActiveOscillatorTypes();
    updateOscillatorRelatedFileInputVisibility();
    loadAudioEffectsSettings();
}
function saveSoundSettings() {
    saveToLocalStorage(LOCALSTORAGE_KEY_OSC_TYPE, currentOscillatorType);
    saveToLocalStorage(LOCALSTORAGE_KEY_FILTER_CUTOFF, filterCutoffFrequency);
    saveToLocalStorage(LOCALSTORAGE_KEY_FILTER_Q, filterQValue);
}
function loadAudioPanningMode() {
    currentAudioPanningMode = loadFromLocalStorage(LOCALSTORAGE_KEY_AUDIO_PANNING_MODE, "mono"); // Default changed
    const currentPanningModeRadio = document.getElementById(`panning-mode-${currentAudioPanningMode}`);
    if (currentPanningModeRadio) {
        currentPanningModeRadio.checked = true;
    }
    else {
        const monoRadio = document.getElementById('panning-mode-mono');
        if (monoRadio)
            monoRadio.checked = true; // Fallback to new default if localStorage is invalid
        currentAudioPanningMode = "mono";
    }
}
function saveAudioPanningMode() {
    saveToLocalStorage(LOCALSTORAGE_KEY_AUDIO_PANNING_MODE, currentAudioPanningMode);
}
function loadShowHandShapesSetting() {
    showHandShapes = loadFromLocalStorage(LOCALSTORAGE_KEY_SHOW_HAND_SHAPES, true);
    if (toggleHandShapesButton) {
        toggleHandShapesButton.textContent = showHandShapes ? "Скрыть индикаторы рук" : "Показать индикаторы рук";
        toggleHandShapesButton.setAttribute('aria-pressed', showHandShapes.toString());
    }
}
function updatePerformanceProfileDescription(profile) {
    if (!performanceProfileDescriptionElement)
        return;
    let description = "";
    switch (profile) {
        case "max":
            description = "<b>Макс. (качество):</b><br>Модель рук: высокая точность (1).<br>Камера: 640x480.<br><i>Наилучшая точность, больше ресурсов.</i>";
            break;
        case "medium":
            description = "<b>Средний (баланс):</b><br>Модель рук: низкая точность (0).<br>Камера: 480x360.<br><i>Хорошая производительность, приемлемая точность.</i>";
            break;
        case "min":
            description = "<b>Мин. (скорость):</b><br>Модель рук: низкая точность (0).<br>Камера: 320x240.<br><i>Максимальная скорость, точность может быть снижена.</i>";
            break;
        case "ultra_min":
            description = "<b>Ультра Мин. (экстрим):</b><br>Модель рук: низкая точность (0).<br>Камера: 240x180.<br>Отключена отрисовка точек, линий и индикаторов рук.<br><i>Экстремальная скорость для слабых устройств. Тип осциллятора автоматически меняется на 'Колокольчик (MP3)' (или 'Треугольная', если MP3/WAV файлы недоступны).</i>";
            break;
        default:
            description = "Выберите профиль для просмотра описания.";
    }
    performanceProfileDescriptionElement.innerHTML = description;
}
function loadPerformanceProfile() {
    currentPerformanceProfile = loadFromLocalStorage(LOCALSTORAGE_KEY_PERFORMANCE_PROFILE, "max");
    const validProfiles = ["max", "medium", "min", "ultra_min"];
    if (!validProfiles.includes(currentPerformanceProfile)) {
        currentPerformanceProfile = "max";
    }
    const profileRadio = document.getElementById(`perf-profile-${currentPerformanceProfile}`);
    if (profileRadio) {
        profileRadio.checked = true;
    }
    else {
        const maxRadio = document.getElementById('perf-profile-max');
        if (maxRadio)
            maxRadio.checked = true;
        currentPerformanceProfile = "max";
    }
    updatePerformanceProfileDescription(currentPerformanceProfile);
    if (currentPerformanceProfile === "ultra_min") {
        showLandmarkNumbers = false;
        if (toggleLandmarkNumbersButton) {
            toggleLandmarkNumbersButton.disabled = true;
            toggleLandmarkNumbersButton.textContent = "Показать номера точек";
            toggleLandmarkNumbersButton.setAttribute('aria-pressed', 'false');
        }
        if (toggleHandShapesButton) { // Ensure hand shapes button is disabled
            toggleHandShapesButton.disabled = true;
        }
        const nonSampleBasedSynth = !['bell_mp3', 'custom_local_file', 'finger_specific_local_files', 'dual_hand_wav'].includes(currentOscillatorType);
        if (nonSampleBasedSynth) {
            const bellMp3Radio = document.getElementById('osc-bell-mp3');
            const dualWavRadio = document.getElementById('osc-dual-hand-wav');
            let newOscTypeForUltraMin = 'bell_mp3'; // Preferred fallback
            let finalRadioToSelect = bellMp3Radio;
            if ((!bellMp3Radio || bellMp3Radio.disabled) && (!dualWavRadio || dualWavRadio.disabled)) {
                newOscTypeForUltraMin = 'triangle';
                finalRadioToSelect = document.querySelector(`input[name="osc-type"][value="${newOscTypeForUltraMin}"]`);
                console.warn("Ultra_min profile on load: Bell MP3 and Dual WAV not available, falling back to triangle.");
            }
            else if (bellMp3Radio && !bellMp3Radio.disabled) {
                newOscTypeForUltraMin = 'bell_mp3';
                finalRadioToSelect = bellMp3Radio;
            }
            else if (dualWavRadio && !dualWavRadio.disabled) { // If bell is disabled, but dual_wav is not
                newOscTypeForUltraMin = 'dual_hand_wav';
                finalRadioToSelect = dualWavRadio;
            }
            if (currentOscillatorType !== newOscTypeForUltraMin && finalRadioToSelect) {
                currentOscillatorType = newOscTypeForUltraMin;
                finalRadioToSelect.checked = true;
                updateActiveOscillatorTypes();
                saveSoundSettings();
                updateOscillatorRelatedFileInputVisibility();
            }
        }
    }
    else {
        if (toggleLandmarkNumbersButton) {
            toggleLandmarkNumbersButton.disabled = currentPlaybackMode !== 'fingerkeys';
        }
        if (toggleHandShapesButton) {
            toggleHandShapesButton.disabled = currentPlaybackMode !== 'fingerkeys';
        }
    }
}
function savePerformanceProfile() {
    saveToLocalStorage(LOCALSTORAGE_KEY_PERFORMANCE_PROFILE, currentPerformanceProfile);
}
function updateFingerThresholdDisplay(keyId) {
    var _a;
    const display = document.getElementById(`${keyId.toLowerCase()}-threshold-value`);
    if (display) {
        display.textContent = `${(_a = fingerKeyThresholds[keyId]) !== null && _a !== void 0 ? _a : DEFAULT_INDIVIDUAL_FINGER_THRESHOLD}%`;
    }
}
function updateFingerMuteVisuals(keyId) {
    var _a;
    const wrapper = document.getElementById(`${keyId.toLowerCase()}-bar-wrapper`);
    if (wrapper) {
        const isMuted = (_a = fingerKeyMutedStates[keyId]) !== null && _a !== void 0 ? _a : false;
        wrapper.classList.toggle('finger-muted', isMuted);
        wrapper.setAttribute('aria-pressed', isMuted.toString());
        const titlePrefix = isMuted ? "Включить звук и реакцию" : "Отключить звук и реакцию";
        let fingerName = "";
        const handPart = keyId.startsWith("R-") ? "физ. правая рука" : "физ. левая рука";
        const fingerPart = keyId.substring(2);
        switch (fingerPart) {
            case "P":
                fingerName = "мизинец";
                break;
            case "R":
                fingerName = "безымянный";
                break;
            case "M":
                fingerName = "средний";
                break;
            case "I":
                fingerName = "указательный";
                break;
            case "T":
                fingerName = "большой";
                break;
        }
        wrapper.title = `${titlePrefix} пальца ${keyId} (${handPart}, ${fingerName})`;
        const isPercussiveTypeOrSample = currentOscillatorType === 'bell3' || currentOscillatorType === 'cosmic_harmony' || currentOscillatorType === 'gusli' || currentOscillatorType === 'piano_c_major' || currentOscillatorType === 'water_drop' || currentOscillatorType === 'bell_mp3' || currentOscillatorType === 'custom_local_file' || currentOscillatorType === 'finger_specific_local_files' || currentOscillatorType === 'dual_hand_wav';
        if (isMuted && (!isPercussiveTypeOrSample || fingerKeyOscillators[keyId])) {
            const keySound = fingerKeyOscillators[keyId];
            if (keySound) {
                stopSustainedOscillator(keySound.osc, keySound.gain, keySound.panner);
                fingerKeyOscillators[keyId] = null;
            }
        }
    }
}
function populateCustomPairSelects() {
    ALL_FINGER_KEY_IDS.forEach(currentKeyId => {
        for (let pointIndex = 0; pointIndex < 2; pointIndex++) {
            const selectId = `${currentKeyId.toLowerCase()}-point${pointIndex + 1}-select`;
            const selectElement = document.getElementById(selectId);
            if (selectElement) {
                selectElement.innerHTML = '';
                for (let i = 0; i < TOTAL_LANDMARKS; i++) {
                    const option = document.createElement('option');
                    option.value = i.toString();
                    option.textContent = `Точка ${i}`;
                    selectElement.appendChild(option);
                }
                const pair = userCustomLandmarkPairs[currentKeyId];
                if (pair) {
                    selectElement.value = pair[pointIndex].toString();
                }
                else {
                    const finger = currentKeyId.substring(2);
                    const tip = FINGER_TIPS_INDICES[finger];
                    const base = tip - 3;
                    if (pointIndex === 0)
                        selectElement.value = (tip === null || tip === void 0 ? void 0 : tip.toString()) || '0';
                    else
                        selectElement.value = (base === null || base === void 0 ? void 0 : base.toString()) || '1';
                }
            }
        }
    });
}
function loadUserCustomLandmarkPairs() {
    userCustomLandmarkPairs = loadFromLocalStorage(LOCALSTORAGE_KEY_CUSTOM_PAIRS, {});
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        if (!userCustomLandmarkPairs[keyId]) {
            const finger = keyId.substring(2);
            if (CUSTOM_DISTANCE_LANDMARK_PAIRS[finger]) {
                userCustomLandmarkPairs[keyId] = [CUSTOM_DISTANCE_LANDMARK_PAIRS[finger][1], CUSTOM_DISTANCE_LANDMARK_PAIRS[finger][0]];
            }
            else {
                const tip = FINGER_TIPS_INDICES[finger];
                userCustomLandmarkPairs[keyId] = [tip, WRIST];
            }
        }
    });
    populateCustomPairSelects();
}
function saveUserCustomLandmarkPairs() {
    saveToLocalStorage(LOCALSTORAGE_KEY_CUSTOM_PAIRS, userCustomLandmarkPairs);
}
function initializeHandsAndCamera() {
    let modelComplexityValue = 1;
    let camWidth = 640;
    let camHeight = 480;
    if (currentPerformanceProfile === "medium") {
        modelComplexityValue = 0;
        camWidth = 480;
        camHeight = 360;
    }
    else if (currentPerformanceProfile === "min") {
        modelComplexityValue = 0;
        camWidth = 320;
        camHeight = 240;
    }
    else if (currentPerformanceProfile === "ultra_min") {
        modelComplexityValue = 0;
        camWidth = 240;
        camHeight = 180;
    }
    if (!hands) {
        hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        hands.onResults(onResults);
    }
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: modelComplexityValue,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    if (!camera) {
        camera = new Camera(videoElement, {
            onFrame: () => __awaiter(this, void 0, void 0, function* () {
                if (videoElement && videoElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
                    (isTracking || cameraManuallyStartedForCalibration)) {
                    yield hands.send({ image: videoElement });
                }
            }),
            width: camWidth,
            height: camHeight
        });
    }
    else {
        // Camera resolution changes require recreation, handled by nulling camera & hands on profile change.
    }
}
// --- Calibration Functions ---
function updateCalibrationCountdownDisplay(timeLeftSeconds) {
    const timerElement = calibrationOverlayCountdownTimerElement;
    if (timerElement) {
        if (timeLeftSeconds !== null && timeLeftSeconds > 0) {
            timerElement.textContent = `(Захват через ${timeLeftSeconds} сек...)`;
            timerElement.style.display = 'block';
        }
        else if (timeLeftSeconds === 0) {
            timerElement.textContent = `(Захват...)`;
            timerElement.style.display = 'block';
        }
        else {
            timerElement.textContent = "";
            timerElement.style.display = 'none';
        }
    }
}
function startCalibrationStepTimer(nextStepAction, durationMs) {
    clearTimeout(calibrationStepTimeoutId);
    clearInterval(calibrationCountdownIntervalId);
    updateCalibrationCountdownDisplay(null);
    let timeLeft = durationMs / 1000;
    updateCalibrationCountdownDisplay(timeLeft);
    calibrationCountdownIntervalId = window.setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) {
            updateCalibrationCountdownDisplay(timeLeft);
        }
        else {
            clearInterval(calibrationCountdownIntervalId);
            calibrationCountdownIntervalId = null;
        }
    }, 1000);
    calibrationStepTimeoutId = window.setTimeout(() => {
        clearInterval(calibrationCountdownIntervalId);
        calibrationCountdownIntervalId = null;
        updateCalibrationCountdownDisplay(null);
        nextStepAction();
    }, durationMs);
}
function autoAdvanceCalibration(currentStepName) {
    if (!calibrationOverlayInstructionTextElement)
        return;
    switch (currentStepName) {
        case 'max_capture':
            tempFingerMaxDistances = Object.assign({}, latestRawDistancesForCalibration);
            if (Object.keys(tempFingerMaxDistances).length === 0) {
                if (statusMessage)
                    statusMessage.textContent = "Руки не обнаружены для захвата макс. расстояний. Попробуйте снова.";
                calibrationOverlayInstructionTextElement.innerHTML = "Этап 1/3: Держите МАКСИМАЛЬНО расправленные ладони. <br><strong style='color: #ffc107;'>Руки не видны!</strong>";
                startCalibrationStepTimer(() => autoAdvanceCalibration('max_capture'), CALIBRATION_MAX_MIN_CAPTURE_DURATION_MS);
                return;
            }
            calibrationState = 'min_capture_pending';
            updateCalibrationUI();
            startCalibrationStepTimer(() => autoAdvanceCalibration('min_capture'), CALIBRATION_MAX_MIN_CAPTURE_DURATION_MS);
            break;
        case 'min_capture':
            tempFingerMinDistances = Object.assign({}, latestRawDistancesForCalibration);
            if (Object.keys(tempFingerMinDistances).length === 0) {
                if (statusMessage)
                    statusMessage.textContent = "Руки не обнаружены для захвата мин. расстояний. Попробуйте снова.";
                calibrationOverlayInstructionTextElement.innerHTML = "Этап 2/3: Сожмите кулаки (МИНИМАЛЬНОЕ расстояние). <br><strong style='color: #ffc107;'>Руки не видны!</strong>";
                startCalibrationStepTimer(() => autoAdvanceCalibration('min_capture'), CALIBRATION_MAX_MIN_CAPTURE_DURATION_MS);
                return;
            }
            let validationOk = true;
            ALL_FINGER_KEY_IDS.forEach(keyId => {
                if (tempFingerMinDistances[keyId] !== undefined && tempFingerMaxDistances[keyId] !== undefined) {
                    if (tempFingerMinDistances[keyId] >= tempFingerMaxDistances[keyId]) {
                        validationOk = false;
                        console.warn(`Calibration validation for ${keyId}: Min dist (${tempFingerMinDistances[keyId]}) >= Max dist (${tempFingerMaxDistances[keyId]}).`);
                    }
                }
                else {
                    console.warn(`Calibration warning for ${keyId}: Min/Max distance not fully captured for this specific key.`);
                }
            });
            if (!validationOk) {
                if (statusMessage)
                    statusMessage.innerHTML = "Ошибка: Мин. расстояние больше или равно макс. <br>Авто-настройка начнется заново с Этапа 1.";
                calibrationState = 'max_capture_pending';
                tempFingerMaxDistances = {};
                tempFingerMinDistances = {};
                updateCalibrationUI();
                startCalibrationStepTimer(() => autoAdvanceCalibration('max_capture'), CALIBRATION_MAX_MIN_CAPTURE_DURATION_MS);
                return;
            }
            fingerMinDistances = Object.assign({}, tempFingerMinDistances);
            fingerMaxDistances = Object.assign({}, tempFingerMaxDistances);
            saveFingerMinMaxDistances();
            fingerRangeSampleData = {};
            calibrationState = 'range_capturing';
            updateCalibrationUI();
            startCalibrationStepTimer(() => autoAdvanceCalibration('range_capture'), CALIBRATION_RANGE_CAPTURE_DURATION_MS);
            break;
        case 'range_capture':
            ALL_FINGER_KEY_IDS.forEach(keyId => {
                var _a, _b;
                const samples = fingerRangeSampleData[keyId] || [];
                if (samples.length > 5) {
                    const operatingMinClosedness = Math.min(...samples);
                    const operatingMaxClosedness = Math.max(...samples);
                    if (operatingMaxClosedness > operatingMinClosedness + (MAX_THRESHOLD * 0.05)) {
                        const range = operatingMaxClosedness - operatingMinClosedness;
                        let newThreshold = Math.round(operatingMinClosedness + range * 0.25);
                        fingerKeyThresholds[keyId] = Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, newThreshold));
                    }
                    else {
                        fingerKeyThresholds[keyId] = (_a = fingerKeyThresholds[keyId]) !== null && _a !== void 0 ? _a : DEFAULT_INDIVIDUAL_FINGER_THRESHOLD;
                        console.warn(`Calibration for ${keyId}: Not enough dynamic range detected during range capture. Using default/existing threshold.`);
                    }
                }
                else {
                    fingerKeyThresholds[keyId] = (_b = fingerKeyThresholds[keyId]) !== null && _b !== void 0 ? _b : DEFAULT_INDIVIDUAL_FINGER_THRESHOLD;
                    console.warn(`Calibration for ${keyId}: Not enough samples (${samples.length}) collected during range capture. Using default/existing threshold.`);
                }
                updateFingerThresholdDisplay(keyId);
            });
            saveFingerKeyThresholds();
            const wasCameraStartedForCalibration = cameraManuallyStartedForCalibration;
            cameraManuallyStartedForCalibration = false;
            isCalibrationSoundMuted = false;
            if (wasCameraStartedForCalibration && !isTracking && camera) {
                camera.stop();
                if (statusMessage)
                    statusMessage.textContent = "Авто-настройка завершена! Пороги установлены. Камера остановлена.";
            }
            else {
                if (statusMessage)
                    statusMessage.textContent = "Авто-настройка успешно завершена! Пороги установлены.";
            }
            calibrationState = 'idle';
            updateCalibrationUI();
            if (!equalizerVisualUpdateRequested) {
                equalizerVisualUpdateRequested = true;
                requestAnimationFrame(renderEqualizerBarsFromData);
            }
            break;
    }
}
function updateCalibrationUI() {
    if (!calibrationInstructions || !startCalibrationButton || !calibrationActionButtons || !cancelCalibrationButton || !controlButton || !toggleThresholdVisibilityButton || !toggleLandmarkNumbersButton || !toggleHandShapesButton || !calibrationContentToToggle || !calibrationOverlayMessageElement || !calibrationOverlayInstructionTextElement)
        return;
    const isCalibrating = calibrationState !== 'idle';
    const otherControlsToDisableQuery = `
        #playback-mode-selector input, #playback-mode-selector button, #playback-mode-toggle-legend,
        #performance-profile-selector input, #performance-profile-toggle-legend,
        #distance-mode-selector input, #distance-mode-selector button, #distance-mode-toggle-legend,
        #custom-pairs-config-container select,
        .equalizer-bar-wrapper, .threshold-adjust-button, .finger-file-input-button,
        #sound-settings-controls input, #sound-settings-controls select, #sound-settings-toggle-legend, #local-audio-upload-input, #audio-effects-panel input, #audio-effects-panel select,
        #visualization-toggle-legend,
        .help-button
    `;
    // Note: audio-panning-mode-selector is removed from query as it's integrated
    const controlsToManage = document.querySelectorAll(otherControlsToDisableQuery);
    if (isCalibrating) {
        calibrationOverlayMessageElement.classList.remove('content-hidden');
        startCalibrationButton.style.display = 'none';
        calibrationActionButtons.style.display = 'flex';
        controlButton.disabled = true;
        toggleThresholdVisibilityButton.disabled = true;
        toggleLandmarkNumbersButton.disabled = true;
        if (toggleHandShapesButton)
            toggleHandShapesButton.disabled = true;
        controlsToManage.forEach(el => el.setAttribute('disabled', 'true'));
        if (cancelCalibrationButton)
            cancelCalibrationButton.removeAttribute('disabled');
        if (calibrationToggleLegend)
            calibrationToggleLegend.setAttribute('aria-disabled', 'true');
        if (visualizationToggleLegend)
            visualizationToggleLegend.setAttribute('aria-disabled', 'true');
        if (performanceProfileToggleLegend)
            performanceProfileToggleLegend.setAttribute('aria-disabled', 'true');
        let overlayInstructionText = "";
        switch (calibrationState) {
            case 'max_capture_pending':
                overlayInstructionText = "Этап 1/3: Держите МАКСИМАЛЬНО расправленные ладони обеих рук.";
                break;
            case 'min_capture_pending':
                overlayInstructionText = "Этап 2/3: Сожмите обе ладони в кулаки (МИНИМАЛЬНОЕ расстояние).";
                break;
            case 'range_capturing':
                overlayInstructionText = "Этап 3/3: Запись диапазона. Свободно пошевелите пальцами.";
                break;
        }
        calibrationOverlayInstructionTextElement.innerHTML = overlayInstructionText;
        calibrationInstructions.textContent = "Идет автоматическая настройка...";
    }
    else {
        calibrationOverlayMessageElement.classList.add('content-hidden');
        if (calibrationOverlayCountdownTimerElement)
            calibrationOverlayCountdownTimerElement.textContent = "";
        startCalibrationButton.style.display = 'block';
        calibrationActionButtons.style.display = 'none';
        updateCalibrationCountdownDisplay(null);
        if (calibrationToggleLegend)
            calibrationToggleLegend.removeAttribute('aria-disabled');
        if (visualizationToggleLegend)
            visualizationToggleLegend.removeAttribute('aria-disabled');
        if (performanceProfileToggleLegend)
            performanceProfileToggleLegend.removeAttribute('aria-disabled');
        if (currentPlaybackMode === 'fingerkeys') {
            toggleThresholdVisibilityButton.disabled = false;
            // toggleLandmarkNumbersButton and toggleHandShapesButton disabled states are handled by updatePlaybackModeVisuals
            if (isTracking) {
                calibrationInstructions.textContent = "Остановите отслеживание, чтобы начать авто-настройку.";
                startCalibrationButton.disabled = true;
            }
            else {
                calibrationInstructions.innerHTML = "&nbsp;";
                startCalibrationButton.disabled = false;
            }
        }
        else {
            calibrationInstructions.textContent = "Авто-настройка доступна только в режиме 'Пальцевые индикаторы'.";
            startCalibrationButton.disabled = true;
            toggleThresholdVisibilityButton.disabled = true;
            toggleLandmarkNumbersButton.disabled = true; // Explicitly disable here too
            if (toggleHandShapesButton)
                toggleHandShapesButton.disabled = true; // Explicitly disable here too
        }
        controlButton.disabled = false;
        controlsToManage.forEach(el => el.removeAttribute('disabled'));
        updatePlaybackModeVisuals();
    }
}
function startCalibrationProcess() {
    return __awaiter(this, void 0, void 0, function* () {
        if (currentPlaybackMode !== "fingerkeys")
            return;
        yield initializeAudio();
        stopAllSounds();
        isCalibrationSoundMuted = true;
        tempFingerMaxDistances = {};
        tempFingerMinDistances = {};
        fingerRangeSampleData = {};
        ALL_FINGER_KEY_IDS.forEach(keyId => latestRawDistancesForCalibration[keyId] = 0);
        const startSequence = () => __awaiter(this, void 0, void 0, function* () {
            calibrationState = 'max_capture_pending';
            updateCalibrationUI();
            startCalibrationStepTimer(() => autoAdvanceCalibration('max_capture'), CALIBRATION_MAX_MIN_CAPTURE_DURATION_MS);
        });
        if (isTracking) {
            if (statusMessage)
                statusMessage.textContent = "Начата авто-настройка (отслеживание уже активно).";
            yield startSequence();
        }
        else {
            cameraManuallyStartedForCalibration = true;
            if (!hands || !camera) {
                initializeHandsAndCamera();
            }
            if (statusMessage)
                statusMessage.textContent = 'Запуск камеры для авто-настройки...';
            updateCalibrationUI();
            try {
                if (camera) {
                    yield camera.start();
                    if (statusMessage)
                        statusMessage.textContent = 'Камера активна. Начата авто-настройка.';
                    yield startSequence();
                }
                else {
                    throw new Error("Camera not initialized for calibration start.");
                }
            }
            catch (e) {
                console.error("Camera start error for calibration:", e);
                if (statusMessage)
                    statusMessage.textContent = 'Ошибка запуска камеры для авто-настройки. Проверьте разрешения.';
                cameraManuallyStartedForCalibration = false;
                isCalibrationSoundMuted = false;
                calibrationState = 'idle';
                updateCalibrationUI();
            }
        }
    });
}
function cancelCalibrationProcess() {
    clearTimeout(calibrationStepTimeoutId);
    calibrationStepTimeoutId = null;
    clearInterval(calibrationCountdownIntervalId);
    calibrationCountdownIntervalId = null;
    updateCalibrationCountdownDisplay(null);
    isCalibrationSoundMuted = false;
    const wasCameraStartedForCalibration = cameraManuallyStartedForCalibration;
    calibrationState = 'idle';
    cameraManuallyStartedForCalibration = false;
    if (wasCameraStartedForCalibration && !isTracking && camera) {
        camera.stop();
        if (statusMessage)
            statusMessage.textContent = "Авто-настройка отменена. Камера остановлена.";
    }
    else if (isTracking) {
        if (statusMessage)
            statusMessage.textContent = "Авто-настройка отменена. Отслеживание продолжается.";
    }
    else {
        if (statusMessage)
            statusMessage.textContent = "Авто-настройка отменена.";
    }
    updateCalibrationUI();
    if (!equalizerVisualUpdateRequested) {
        equalizerVisualUpdateRequested = true;
        requestAnimationFrame(renderEqualizerBarsFromData);
    }
}
// --- End Calibration Functions ---
function handleControlButtonClick() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const audioReady = yield initializeAudio();
        if (!audioReady) {
            if (statusMessage && statusMessage.textContent === 'Предоставьте доступ к камере') {
                statusMessage.textContent = "Ошибка аудио. Проверьте консоль и разрешения.";
            }
        }
        if (!isTracking) {
            controlButton.textContent = 'Стоп';
            controlButton.setAttribute('aria-pressed', 'true');
            if (statusMessage)
                statusMessage.textContent = 'Загрузка моделей и запуск камеры...';
            if (!hands || !camera) {
                initializeHandsAndCamera();
            }
            else {
                initializeHandsAndCamera();
            }
            if (!camera) {
                console.error("Camera failed to initialize before start.");
                if (statusMessage)
                    statusMessage.textContent = 'Критическая ошибка: камера не инициализирована.';
                controlButton.textContent = 'Старт';
                controlButton.setAttribute('aria-pressed', 'false');
                return;
            }
            try {
                yield camera.start();
                if (statusMessage)
                    statusMessage.textContent = 'Отслеживание запущено. Управляйте руками.';
                isTracking = true;
            }
            catch (e) {
                console.error("Error during tracking start (camera):", e);
                if (statusMessage)
                    statusMessage.textContent = ((_a = e.message) === null || _a === void 0 ? void 0 : _a.includes("camera")) || e.name === "NotAllowedError" || e.name === "NotFoundError"
                        ? 'Ошибка запуска камеры. Проверьте разрешения.'
                        : 'Ошибка при запуске отслеживания.';
                isTracking = false;
                controlButton.textContent = 'Старт';
                controlButton.setAttribute('aria-pressed', 'false');
                stopAllSounds();
            }
        }
        else {
            if (camera && !cameraManuallyStartedForCalibration) {
                camera.stop();
            }
            isTracking = false;
            controlButton.textContent = 'Старт';
            controlButton.setAttribute('aria-pressed', 'false');
            if (statusMessage)
                statusMessage.textContent = 'Отслеживание остановлено.';
            stopAllSounds();
            if (calibrationState !== 'idle') {
                console.warn("Tracking stopped during active calibration. Cancelling calibration.");
                cancelCalibrationProcess();
            }
        }
        updateCalibrationUI();
    });
}
function setupToggle(legendElement, contentElement, initiallyExpanded = false) {
    if (!legendElement || !contentElement)
        return;
    if (!legendElement.hasAttribute('aria-controls') && contentElement.id) {
        legendElement.setAttribute('aria-controls', contentElement.id);
    }
    const toggleContent = (event) => {
        if (event && event.target && event.target.classList.contains('help-button')) {
            return;
        }
        if (legendElement.getAttribute('aria-disabled') === 'true')
            return;
        const isNowHidden = contentElement.classList.toggle('content-hidden');
        legendElement.setAttribute('aria-expanded', (!isNowHidden).toString());
    };
    const isInitiallyHiddenByClass = contentElement.classList.contains('content-hidden');
    const expand = initiallyExpanded && !isInitiallyHiddenByClass;
    legendElement.setAttribute('aria-expanded', expand.toString());
    if (!expand && !isInitiallyHiddenByClass) {
        contentElement.classList.add('content-hidden');
    }
    else if (expand && isInitiallyHiddenByClass) {
        contentElement.classList.remove('content-hidden');
    }
    legendElement.addEventListener('click', toggleContent);
    legendElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            if (event.target && event.target.classList.contains('help-button')) {
                return;
            }
            event.preventDefault();
            toggleContent();
        }
    });
}
function setupHelpToggle(button, descriptionPanel, helpText) {
    if (!button || !descriptionPanel) {
        return;
    }
    descriptionPanel.innerHTML = helpText;
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        const isHidden = descriptionPanel.classList.toggle('content-hidden');
        button.setAttribute('aria-expanded', (!isHidden).toString());
    });
    button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.stopPropagation();
            event.preventDefault();
            const isHidden = descriptionPanel.classList.toggle('content-hidden');
            button.setAttribute('aria-expanded', (!isHidden).toString());
        }
    });
    const initiallyHidden = descriptionPanel.classList.contains('content-hidden');
    button.setAttribute('aria-expanded', (!initiallyHidden).toString());
    if (!initiallyHidden) {
        descriptionPanel.classList.remove('content-hidden');
    }
    else {
        descriptionPanel.classList.add('content-hidden');
    }
}
document.addEventListener('DOMContentLoaded', () => {
    if (controlButton)
        controlButton.addEventListener('click', handleControlButtonClick);
    if (localAudioUploadInput)
        localAudioUploadInput.addEventListener('change', handleLocalFileChange);
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        const inputElement = document.getElementById(`${keyId.toLowerCase()}-file-input`);
        if (inputElement) {
            inputElement.addEventListener('change', (e) => handleFingerSpecificFileChange(e, keyId));
        }
        const buttonLabel = document.querySelector(`label[for="${keyId.toLowerCase()}-file-input"]`);
        if (buttonLabel) {
            buttonLabel.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputElement === null || inputElement === void 0 ? void 0 : inputElement.click();
                }
            });
        }
    });
    loadFingerKeyThresholds();
    loadFingerKeyMutedStates();
    loadUserCustomLandmarkPairs();
    loadFingerMinMaxDistances();
    loadSoundSettings();
    loadPerformanceProfile();
    loadAudioPanningMode();
    loadShowHandShapesSetting();
    // Audio effects are loaded within loadSoundSettings or initializeAudio
    const playbackModeRadios = document.querySelectorAll('input[name="playback-mode"]');
    playbackModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newMode = e.target.value;
            if (newMode !== currentPlaybackMode) {
                stopAllSounds();
                currentPlaybackMode = newMode;
                saveToLocalStorage(LOCALSTORAGE_KEY_PLAYBACK_MODE, currentPlaybackMode);
                updatePlaybackModeVisuals();
                updateOscillatorRelatedFileInputVisibility();
                if (calibrationState !== 'idle')
                    cancelCalibrationProcess();
                updateCalibrationUI();
            }
        });
    });
    currentPlaybackMode = loadFromLocalStorage(LOCALSTORAGE_KEY_PLAYBACK_MODE, "fingerkeys");
    const currentPlaybackModeRadio = document.getElementById(`mode-${currentPlaybackMode}`);
    if (currentPlaybackModeRadio) {
        currentPlaybackModeRadio.checked = true;
    }
    else {
        const defaultRadio = document.getElementById('mode-fingerkeys');
        if (defaultRadio)
            defaultRadio.checked = true;
        currentPlaybackMode = "fingerkeys";
    }
    const distanceModeRadios = document.querySelectorAll('input[name="distance-mode"]');
    distanceModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentDistanceMode = e.target.value;
            saveToLocalStorage(LOCALSTORAGE_KEY_DISTANCE_MODE, currentDistanceMode);
            updatePlaybackModeVisuals();
            if (calibrationState !== 'idle') {
                if (statusMessage)
                    statusMessage.textContent = "Режим расчета расстояния изменен. Калибровка отменена. Пожалуйста, перекалибруйтесь при необходимости.";
                cancelCalibrationProcess();
            }
        });
    });
    currentDistanceMode = loadFromLocalStorage(LOCALSTORAGE_KEY_DISTANCE_MODE, "wrist_tip");
    const currentDistanceModeRadio = document.getElementById(`mode-dist-${currentDistanceMode.replace('_', '-')}`);
    if (currentDistanceModeRadio)
        currentDistanceModeRadio.checked = true;
    const performanceProfileRadios = document.querySelectorAll('input[name="performance-profile"]');
    performanceProfileRadios.forEach(radio => {
        radio.addEventListener('change', (e) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const newProfile = e.target.value;
            if (newProfile === currentPerformanceProfile)
                return;
            const oldProfile = currentPerformanceProfile;
            currentPerformanceProfile = newProfile;
            savePerformanceProfile();
            updatePerformanceProfileDescription(currentPerformanceProfile);
            if (toggleLandmarkNumbersButton) {
                if (newProfile === "ultra_min") {
                    showLandmarkNumbers = false;
                    toggleLandmarkNumbersButton.disabled = true;
                    toggleLandmarkNumbersButton.textContent = "Показать номера точек";
                    toggleLandmarkNumbersButton.setAttribute('aria-pressed', 'false');
                }
                else if (oldProfile === "ultra_min") {
                    toggleLandmarkNumbersButton.disabled = currentPlaybackMode !== 'fingerkeys';
                    toggleLandmarkNumbersButton.textContent = showLandmarkNumbers ? "Скрыть номера точек" : "Показать номера точек";
                    toggleLandmarkNumbersButton.setAttribute('aria-pressed', showLandmarkNumbers.toString());
                }
            }
            if (toggleHandShapesButton) { // Handle new button
                if (newProfile === "ultra_min") {
                    toggleHandShapesButton.disabled = true;
                }
                else if (oldProfile === "ultra_min") {
                    toggleHandShapesButton.disabled = currentPlaybackMode !== 'fingerkeys';
                    // Text and aria-pressed are based on showHandShapes, which is preserved
                }
            }
            if (newProfile === "ultra_min" && !['custom_local_file', 'finger_specific_local_files', 'dual_hand_wav', 'bell_mp3'].includes(currentOscillatorType)) {
                const bellMp3Radio = document.getElementById('osc-bell-mp3');
                const dualWavRadio = document.getElementById('osc-dual-hand-wav');
                let targetOscType = 'bell_mp3'; // Default preferred
                let targetRadio = bellMp3Radio;
                let switchedMessage = 'Профиль "Ультра Мин." активирован. Тип осциллятора изменен на "Колокольчик (MP3)".';
                if (bellMp3Radio && !bellMp3Radio.disabled) {
                    targetOscType = 'bell_mp3';
                    targetRadio = bellMp3Radio;
                }
                else if (dualWavRadio && !dualWavRadio.disabled) { // Fallback to dual_hand_wav if bell_mp3 is disabled
                    targetOscType = 'dual_hand_wav';
                    targetRadio = dualWavRadio;
                    switchedMessage = 'Профиль "Ультра Мин." активирован. MP3 "Колокольчик" недоступен, тип осциллятора изменен на "Двойной WAV (Л/П)".';
                }
                else { // Fallback to triangle if both sample types are disabled
                    targetOscType = 'triangle';
                    targetRadio = document.querySelector(`input[name="osc-type"][value="${targetOscType}"]`);
                    switchedMessage = `Профиль "Ультра Мин." активирован. MP3 и WAV файлы недоступны, тип осциллятора изменен на "Треугольная".`;
                }
                if (currentOscillatorType !== targetOscType && targetRadio) {
                    stopAllSounds();
                    currentOscillatorType = targetOscType;
                    targetRadio.checked = true;
                    updateActiveOscillatorTypes();
                    saveSoundSettings();
                    updateOscillatorRelatedFileInputVisibility();
                    if (statusMessage)
                        statusMessage.textContent = switchedMessage;
                }
                else if (currentOscillatorType === targetOscType) {
                    if (statusMessage && targetOscType === 'bell_mp3' && bellMp3Radio && !bellMp3Radio.disabled) {
                        statusMessage.textContent = 'Профиль "Ультра Мин." активирован. Тип осциллятора уже "Колокольчик (MP3)".';
                    }
                    else if (statusMessage && targetOscType === 'dual_hand_wav' && dualWavRadio && !dualWavRadio.disabled) {
                        statusMessage.textContent = 'Профиль "Ультра Мин." активирован. Тип осциллятора уже "Двойной WAV (Л/П)".';
                    }
                    else if (statusMessage && targetOscType === 'triangle') {
                        statusMessage.textContent = `Профиль "Ультра Мин." активирован. Тип осциллятора уже "Треугольная" (MP3/WAV недоступны).`;
                    }
                }
            }
            else if (newProfile !== "ultra_min" && oldProfile === "ultra_min") {
                if (statusMessage && !((_a = statusMessage.textContent) === null || _a === void 0 ? void 0 : _a.includes('Тип осциллятора изменен'))) {
                    statusMessage.textContent = `Профиль изменен на "${newProfile}".`;
                }
            }
            updatePerformanceProfileDescription(currentPerformanceProfile);
            updatePlaybackModeVisuals();
            const wasTracking = isTracking;
            if (wasTracking) {
                if (statusMessage && !((_b = statusMessage.textContent) === null || _b === void 0 ? void 0 : _b.includes('Тип осциллятора изменен'))) {
                    statusMessage.textContent = 'Изменение профиля... Перезапуск камеры...';
                }
                if (camera && typeof camera.stop === 'function') {
                    yield camera.stop();
                }
            }
            else {
                if (statusMessage && !((_c = statusMessage.textContent) === null || _c === void 0 ? void 0 : _c.includes('Тип осциллятора изменен'))) {
                    statusMessage.textContent = 'Профиль производительности изменен. Настройки применятся при следующем запуске.';
                }
            }
            hands = null;
            camera = null;
            initializeHandsAndCamera();
            if (wasTracking) {
                if (!camera) {
                    console.error("Camera is null after profile change and re-initialization attempt.");
                    if (statusMessage)
                        statusMessage.textContent = 'Критическая ошибка: Камера не смогла переинициализироваться. Отслеживание остановлено.';
                    isTracking = false;
                    if (controlButton) {
                        controlButton.textContent = 'Старт';
                        controlButton.setAttribute('aria-pressed', 'false');
                    }
                    stopAllSounds();
                    updateCalibrationUI();
                    return;
                }
                try {
                    yield camera.start();
                    if (statusMessage && !((_d = statusMessage.textContent) === null || _d === void 0 ? void 0 : _d.includes('Тип осциллятора изменен'))) {
                        statusMessage.textContent = 'Профиль изменен. Отслеживание возобновлено.';
                    }
                    else if (statusMessage && ((_e = statusMessage.textContent) === null || _e === void 0 ? void 0 : _e.includes('Тип осциллятора изменен')) && !((_f = statusMessage.textContent) === null || _f === void 0 ? void 0 : _f.includes('Отслеживание возобновлено'))) {
                        statusMessage.textContent += ' Отслеживание возобновлено.';
                    }
                }
                catch (err) {
                    console.error("Error restarting camera after profile change:", err);
                    if (statusMessage)
                        statusMessage.textContent = 'Ошибка перезапуска камеры. Отслеживание остановлено. Профиль изменен.';
                    isTracking = false;
                    if (controlButton) {
                        controlButton.textContent = 'Старт';
                        controlButton.setAttribute('aria-pressed', 'false');
                    }
                    stopAllSounds();
                    updateCalibrationUI();
                }
            }
        }));
    });
    document.querySelectorAll('.threshold-adjust-button').forEach(button => {
        button.addEventListener('click', (e) => {
            var _a;
            const target = e.currentTarget;
            const keyId = target.dataset.fingerKeyId;
            const action = target.dataset.action;
            let currentThreshold = (_a = fingerKeyThresholds[keyId]) !== null && _a !== void 0 ? _a : DEFAULT_INDIVIDUAL_FINGER_THRESHOLD;
            if (action === 'increase') {
                currentThreshold = Math.min(MAX_THRESHOLD, currentThreshold + THRESHOLD_STEP);
            }
            else {
                currentThreshold = Math.max(MIN_THRESHOLD, currentThreshold - THRESHOLD_STEP);
            }
            fingerKeyThresholds[keyId] = currentThreshold;
            updateFingerThresholdDisplay(keyId);
            saveFingerKeyThresholds();
        });
    });
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        const wrapper = document.getElementById(`${keyId.toLowerCase()}-bar-wrapper`);
        if (wrapper) {
            wrapper.addEventListener('click', (e) => {
                if (e.target.closest('.finger-audio-file-controls')) {
                    return;
                }
                if (currentPlaybackMode !== 'fingerkeys' || calibrationState !== 'idle')
                    return;
                fingerKeyMutedStates[keyId] = !fingerKeyMutedStates[keyId];
                updateFingerMuteVisuals(keyId);
                saveFingerKeyMutedStates();
            });
            wrapper.addEventListener('keydown', (e) => {
                if (e.target.closest('.finger-audio-file-controls')) {
                    return;
                }
                if (currentPlaybackMode === 'fingerkeys' && calibrationState === 'idle' && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    fingerKeyMutedStates[keyId] = !fingerKeyMutedStates[keyId];
                    updateFingerMuteVisuals(keyId);
                    saveFingerKeyMutedStates();
                }
            });
        }
    });
    if (customPairsConfigContainer) {
        customPairsConfigContainer.addEventListener('change', (e) => {
            const target = e.target;
            if (target.tagName === 'SELECT' && target.dataset.fingerKeyId && target.dataset.pointIndex) {
                const currentKeyIdFromDataset = target.dataset.fingerKeyId;
                const pointIndex = parseInt(target.dataset.pointIndex, 10);
                const value = parseInt(target.value, 10);
                if (!userCustomLandmarkPairs[currentKeyIdFromDataset]) {
                    const finger = currentKeyIdFromDataset.substring(2);
                    const tip = FINGER_TIPS_INDICES[finger];
                    userCustomLandmarkPairs[currentKeyIdFromDataset] = [tip, WRIST];
                }
                userCustomLandmarkPairs[currentKeyIdFromDataset][pointIndex] = value;
                saveUserCustomLandmarkPairs();
                if (calibrationState !== 'idle') {
                    if (statusMessage)
                        statusMessage.textContent = "Пары точек изменены. Калибровка отменена. Пожалуйста, перекалибруйтесь.";
                    cancelCalibrationProcess();
                }
            }
        });
    }
    oscillatorTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => __awaiter(void 0, void 0, void 0, function* () {
            const newOscType = e.target.value;
            if (newOscType === 'bell_mp3' && !bellMp3Buffer && audioContext) {
                if (statusMessage)
                    statusMessage.textContent = 'Загрузка MP3 звука "Колокольчик"...';
                yield initializeAudio();
                if (!bellMp3Buffer) {
                    if (statusMessage)
                        statusMessage.textContent = 'Ошибка загрузки MP3 "Колокольчик", выберите другой звук.';
                    const previousOscTypeRadio = document.querySelector(`input[name="osc-type"][value="${currentOscillatorType}"]`);
                    if (previousOscTypeRadio)
                        previousOscTypeRadio.checked = true;
                    return;
                }
                else {
                    if (statusMessage && statusMessage.textContent === 'Загрузка MP3 звука "Колокольчик"...')
                        statusMessage.textContent = 'MP3 "Колокольчик" загружен.';
                }
            }
            else if (newOscType === 'dual_hand_wav' && (!leftWavBuffer || !rightWavBuffer) && audioContext) {
                if (statusMessage)
                    statusMessage.textContent = 'Загрузка left.wav/right.wav...';
                yield initializeAudio(); // This will attempt to load them
                if (!leftWavBuffer || !rightWavBuffer) {
                    if (statusMessage)
                        statusMessage.textContent = 'Ошибка загрузки left.wav/right.wav, выберите другой звук.';
                    const previousOscTypeRadio = document.querySelector(`input[name="osc-type"][value="${currentOscillatorType}"]`);
                    if (previousOscTypeRadio)
                        previousOscTypeRadio.checked = true;
                    return;
                }
                else {
                    if (statusMessage && statusMessage.textContent === 'Загрузка left.wav/right.wav...')
                        statusMessage.textContent = 'Файлы для Двойного WAV загружены.';
                }
            }
            currentOscillatorType = newOscType;
            stopAllSounds();
            updateActiveOscillatorTypes();
            saveSoundSettings();
            updateOscillatorRelatedFileInputVisibility();
            updatePlaybackModeVisuals();
        }));
    });
    if (filterCutoffSlider && filterCutoffValueDisplay) {
        filterCutoffSlider.addEventListener('input', (e) => {
            filterCutoffFrequency = parseFloat(e.target.value);
            if (filterCutoffValueDisplay)
                filterCutoffValueDisplay.textContent = `${filterCutoffFrequency} Гц`;
            if (globalLowPassFilter && audioContext && audioContext.state !== 'closed') {
                globalLowPassFilter.frequency.setTargetAtTime(filterCutoffFrequency, audioContext.currentTime, 0.01);
            }
            saveSoundSettings();
        });
    }
    if (filterQSlider && filterQValueDisplay) {
        filterQSlider.addEventListener('input', (e) => {
            filterQValue = parseFloat(e.target.value);
            if (filterQValueDisplay)
                filterQValueDisplay.textContent = filterQValue.toFixed(1);
            if (globalLowPassFilter && audioContext && audioContext.state !== 'closed') {
                globalLowPassFilter.Q.setTargetAtTime(filterQValue, audioContext.currentTime, 0.01);
            }
            saveSoundSettings();
        });
    }
    // Audio Effects Event Listeners
    // Reverb event listeners removed
    if (enableDelayCheckbox) {
        enableDelayCheckbox.addEventListener('change', (e) => {
            currentAudioEffects.isDelayEnabled = e.target.checked;
            applyAudioEffects();
            saveAudioEffectsSettings();
        });
    }
    if (delayTimeSlider && delayTimeValueDisplay) {
        delayTimeSlider.addEventListener('input', (e) => {
            currentAudioEffects.delayTimeMs = parseInt(e.target.value, 10);
            delayTimeValueDisplay.textContent = `${currentAudioEffects.delayTimeMs} мс`;
            applyAudioEffects();
            saveAudioEffectsSettings();
        });
    }
    if (delayFeedbackSlider && delayFeedbackValueDisplay) {
        delayFeedbackSlider.addEventListener('input', (e) => {
            currentAudioEffects.delayFeedback = parseFloat(e.target.value);
            delayFeedbackValueDisplay.textContent = `${Math.round(currentAudioEffects.delayFeedback * 100)}%`;
            applyAudioEffects();
            saveAudioEffectsSettings();
        });
    }
    if (delayLevelSlider && delayLevelValueDisplay) {
        delayLevelSlider.addEventListener('input', (e) => {
            currentAudioEffects.delayLevel = parseFloat(e.target.value);
            delayLevelValueDisplay.textContent = `${Math.round(currentAudioEffects.delayLevel * 100)}%`;
            applyAudioEffects();
            saveAudioEffectsSettings();
        });
    }
    const panningModeRadios = document.querySelectorAll('input[name="panning-mode"]');
    panningModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newMode = e.target.value;
            if (newMode !== currentAudioPanningMode) {
                currentAudioPanningMode = newMode;
                saveAudioPanningMode();
                updateActivePannersOnModeChange();
            }
        });
    });
    if (startCalibrationButton)
        startCalibrationButton.onclick = startCalibrationProcess;
    if (cancelCalibrationButton)
        cancelCalibrationButton.onclick = cancelCalibrationProcess;
    if (toggleThresholdVisibilityButton) {
        toggleThresholdVisibilityButton.addEventListener('click', () => {
            showIndividualThresholdControls = !showIndividualThresholdControls;
            toggleThresholdVisibilityButton.textContent = showIndividualThresholdControls ? "Скрыть настройки порогов" : "Показать настройки порогов";
            toggleThresholdVisibilityButton.setAttribute('aria-expanded', showIndividualThresholdControls.toString());
            updatePlaybackModeVisuals();
        });
        toggleThresholdVisibilityButton.textContent = showIndividualThresholdControls ? "Скрыть настройки порогов" : "Показать настройки порогов";
        toggleThresholdVisibilityButton.setAttribute('aria-expanded', showIndividualThresholdControls.toString());
    }
    if (toggleLandmarkNumbersButton) {
        toggleLandmarkNumbersButton.addEventListener('click', () => {
            if (currentPerformanceProfile === "ultra_min" || currentPlaybackMode !== "fingerkeys")
                return;
            showLandmarkNumbers = !showLandmarkNumbers;
            toggleLandmarkNumbersButton.textContent = showLandmarkNumbers ? "Скрыть номера точек" : "Показать номера точек";
            toggleLandmarkNumbersButton.setAttribute('aria-pressed', showLandmarkNumbers.toString());
        });
        // Initial state set by loadPerformanceProfile and updatePlaybackModeVisuals
    }
    if (toggleHandShapesButton) {
        toggleHandShapesButton.addEventListener('click', () => {
            if (currentPerformanceProfile === "ultra_min" || currentPlaybackMode !== "fingerkeys")
                return;
            showHandShapes = !showHandShapes;
            toggleHandShapesButton.textContent = showHandShapes ? "Скрыть индикаторы рук" : "Показать индикаторы рук";
            toggleHandShapesButton.setAttribute('aria-pressed', showHandShapes.toString());
            saveToLocalStorage(LOCALSTORAGE_KEY_SHOW_HAND_SHAPES, showHandShapes);
        });
        // Initial state set by loadShowHandShapesSetting, then potentially disabled by loadPerformanceProfile/updatePlaybackModeVisuals
    }
    setupToggle(settingsToggleLegend, settingsContent, false);
    setupToggle(performanceProfileToggleLegend, performanceProfileContentToToggle, false);
    setupToggle(calibrationToggleLegend, calibrationContentToToggle, false);
    setupToggle(playbackModeToggleLegend, playbackModeContentToToggle, false);
    setupToggle(soundSettingsToggleLegend, soundSettingsContentToToggle, false);
    // Removed setupToggle for audioPanningMode
    setupToggle(distanceModeToggleLegend, distanceModeContentToToggle, false);
    setupToggle(visualizationToggleLegend, visualizationContentToToggle, false);
    setupHelpToggle(document.getElementById('main-settings-help-button'), document.getElementById('main-settings-help-description'), "Этот раздел содержит все основные настройки приложения, сгруппированные по категориям. Нажмите на заголовок категории, чтобы развернуть или свернуть её содержимое. Кнопка '(?)' рядом с названием каждой категории покажет краткое описание этой группы настроек.");
    setupHelpToggle(document.getElementById('performance-profile-help-button'), document.getElementById('performance-profile-help-description'), "Выберите профиль производительности, чтобы сбалансировать качество обнаружения рук и скорость работы приложения. 'Макс. (качество)' обеспечивает наилучшую точность за счет больших ресурсов, 'Средний (баланс)' предлагает компромисс, а 'Мин. (скорость)' - максимальную скорость при возможной потере точности. 'Ультра Мин. (экстрим)' - для самых слабых устройств, отключает отрисовку точек, линий и индикаторов рук, использует минимальное разрешение камеры и автоматически переключает тип осциллятора на 'Колокольчик (MP3)' (или 'Треугольная'/'Двойной WAV', если MP3 недоступен, и если не выбран 'Локальный файл') для снижения нагрузки.");
    setupHelpToggle(document.getElementById('calibration-help-button'), document.getElementById('calibration-help-description'), "Автоматическая настройка помогает определить оптимальные пороги срабатывания для каждого пальца на основе ваших индивидуальных жестов (насколько сильно нужно 'сжать' палец для активации). Рекомендуется выполнять при первом использовании или при изменении условий освещения/положения рук. Доступно только в режиме 'Пальцевые индикаторы'.");
    setupHelpToggle(document.getElementById('playback-mode-help-button'), document.getElementById('playback-mode-help-description'), "Выберите, как приложение будет реагировать на движения ваших рук:<br><b>Визуализатор и звук (Терменвокс):</b> Положение руки в пространстве управляет высотой и громкостью звука (обычно левая рука - громкость, правая - высота).<br><b>Сенсорные пэды:</b> Касание виртуальных зон на экране кончиком указательного пальца активирует предопределенные звуки/ноты.<br><b>Пальцевые индикаторы:</b> Звук генерируется, когда расстояние между кончиком пальца и определенной точкой на ладони (или другой заданной точкой) становится меньше установленного порога. Каждый палец можно настроить индивидуально.");
    setupHelpToggle(document.getElementById('sound-settings-help-button'), document.getElementById('sound-settings-help-description'), "Настройте глобальные параметры звука:<br>" +
        "<b>Тип осциллятора:</b> Изменяет тембр (окраску) звука.<br>" +
        "  - 'Колокольчик (MP3)' воспроизводит загруженный MP3-файл.<br>" +
        "  - 'Локальный файл (глоб.)' позволяет загрузить свой MP3/WAV для глобального использования.<br>" +
        "  - <b>'Двойной WAV (Л/П)':</b> Воспроизводит предустановленные 'left.wav' для физически левой руки и 'right.wav' для физически правой руки. Файлы должны быть в корне проекта.<br>" +
        "  - <b>'Индивидуальные (MP3/WAV)':</b> <i>(Только для режима 'Пальцевые индикаторы')</i> Позволяет загрузить уникальный MP3/WAV для каждого пальца. " +
        "Элементы управления файлами появятся под соответствующим индикатором в эквалайзере. " +
        "Если файл не загружен, палец звучать не будет. При 'касании' играет ваш MP3/WAV. " +
        "При 'удержании' звучит 'треугольная' волна. " +
        "Файлы действуют только в текущей сессии.<br>" +
        "<b>Фильтр (срез/резонанс):</b> Управляют яркостью и характером звука.<br>" +
        "<b>Режим аудиовыхода:</b> Определяет, как звук будет распределяться по стереоканалам:<br>" +
        "  - <i>Стерео (по рукам):</i> Звук от физически левой руки идет в правый канал, от правой руки - в левый.<br>" +
        "  - <i>Моно (центр):</i> Весь звук сведен в центр.<br>" +
        "<b>Аудиоэффекты (для MP3/WAV):</b> Добавляют Дилэй (эхо) к звукам MP3/WAV. ");
    // Removed setupHelpToggle for audio-panning
    setupHelpToggle(document.getElementById('distance-mode-help-button'), document.getElementById('distance-mode-help-description'), "Выберите, как будет измеряться 'сжатие' пальцев для режима 'Пальцевые индикаторы':<br><b>От запястья до кончика:</b> Расстояние измеряется между основанием ладони (запястьем) и кончиком каждого пальца.<br><b>Между указанными точками:</b> Используются стандартные, предопределенные пары точек для каждого пальца (например, кончик пальца и его основание).<br><b>Кастомный (пользовательский):</b> Позволяет вручную выбрать две ключевые точки на модели руки для каждого пальца в разделе 'Настройка пар точек'.");
    setupHelpToggle(document.getElementById('visualization-help-button'), document.getElementById('visualization-help-description'), "Управляйте отображением дополнительных визуальных элементов, доступных в режиме 'Пальцевые индикаторы':<br>" +
        "<b>Показать/Скрыть индикаторы рук:</b> Отображает или прячет визуальные индикаторы для каждой руки (круг для левой, треугольник для правой). (Примечание: В профиле 'Ультра Мин.' индикаторы рук всегда скрыты, а кнопка заблокирована).<br>" +
        "<b>Показать/Скрыть настройки порогов:</b> Отображает или прячет индивидуальные регуляторы чувствительности (пороги) под каждым индикатором пальца.<br>" +
        "<b>Показать/Скрыть номера точек:</b> Отображает или прячет числовые идентификаторы ключевых точек (landmarks) на видео с камеры. Полезно для режима 'Кастомный (пользовательский)' при настройке пар точек. (Примечание: В профиле 'Ультра Мин.' номера точек всегда скрыты).<br>" +
        "<b>Элементы управления файлами для пальцев:</b> Появятся под настройками порогов, если выбран тип осциллятора 'Индивидуальные (MP3/WAV)' и активен режим 'Пальцевые индикаторы'.");
    setupHelpToggle(document.getElementById('custom-pairs-help-button'), document.getElementById('custom-pairs-help-description'), "Здесь вы можете точно настроить, какие две ключевые точки на модели руки будут использоваться для измерения 'сжатия' каждого пальца. Это актуально, если выбран режим 'Кастомный (пользовательский)' в настройках 'Режим расчета расстояния'. Изменение этих пар может потребовать повторной калибровки для оптимальной работы.");
    updatePlaybackModeVisuals();
    updateCalibrationUI();
    updateOscillatorRelatedFileInputVisibility();
    if (statusMessage)
        statusMessage.textContent = 'Предоставьте доступ к камере';
});
window.addEventListener('beforeunload', () => {
    stopAllSounds();
    if (camera && isTracking && !cameraManuallyStartedForCalibration) {
        camera.stop();
    }
});
document.addEventListener('DOMContentLoaded', () => {
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        updateFingerMuteVisuals(keyId);
        latestFingerVisuals[keyId] = { heightPercent: 0, isActive: false, keyId: keyId, handedness: undefined };
        const fileStatusElement = document.getElementById(`${keyId.toLowerCase()}-file-status`);
        if (fileStatusElement) {
            fileStatusElement.textContent = customFingerAudioFileNames[keyId] || "Не выбран";
        }
    });
    if (!equalizerVisualUpdateRequested) {
        equalizerVisualUpdateRequested = true;
        requestAnimationFrame(renderEqualizerBarsFromData);
    }
});
const LANDMARK_NAMES = [
    "WRIST", "THUMB_CMC", "THUMB_MCP", "THUMB_IP", "THUMB_TIP",
    "INDEX_FINGER_MCP", "INDEX_FINGER_PIP", "INDEX_FINGER_DIP", "INDEX_FINGER_TIP",
    "MIDDLE_FINGER_MCP", "MIDDLE_FINGER_PIP", "MIDDLE_FINGER_DIP", "MIDDLE_FINGER_TIP",
    "RING_FINGER_MCP", "RING_FINGER_PIP", "RING_FINGER_DIP", "RING_FINGER_TIP",
    "PINKY_MCP", "PINKY_PIP", "PINKY_DIP", "PINKY_TIP"
];
function getLandmarkName(index) {
    return LANDMARK_NAMES[index] || `Landmark ${index}`;
}
console.log("Hand Gesture Visualizer script loaded. Performance optimizations applied.");
