"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
const videoElement = document.getElementById('input-video');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');
const controlButton = document.getElementById('control-button');
const statusMessage = document.getElementById('status-message');
const leftInstrumentSelect = document.getElementById('left-instrument-select'); // Physical Left Hand (circle, screen right)
const rightInstrumentSelect = document.getElementById('right-instrument-select'); // Physical Right Hand (triangle, screen left)
const equalizerContainer = document.querySelector('.equalizer-container');
const customPairsConfigContainer = document.getElementById('custom-pairs-config-container');
// Custom Sample UI Elements
const leftCustomSampleInput = document.getElementById('left-custom-sample-input');
const rightCustomSampleInput = document.getElementById('right-custom-sample-input');
const leftCustomSampleNameDisplay = document.getElementById('left-custom-sample-name-display');
const rightCustomSampleNameDisplay = document.getElementById('right-custom-sample-name-display');
// Info Modal Elements
const infoButton = document.getElementById('info-button');
const infoModal = document.getElementById('info-modal');
const closeModalButton = document.getElementById('close-modal-button');
const modalTitleElement = document.getElementById('modal-title-dynamic');
const thereminDescriptionDisplay = document.getElementById('theremin-description-display');
const tapPadDescriptionDisplay = document.getElementById('tappad-description-display');
const fingerKeysDescriptionDisplay = document.getElementById('fingerkeys-description-display');
let audioContext = null;
let isTracking = false;
let hands = null;
let camera = null;
const MIN_FREQ = 100; // Hz (for oscillators)
const MAX_FREQ = 1000; // Hz (for oscillators)
const MIDI_NOTE_MIN = 48; // C3
const MIDI_NOTE_MAX = 84; // C6
const MIN_GAIN = 0;
const MAX_GAIN = 0.5;
// These variable names (leftOscillator, rightOscillator etc.) refer to distinct audio paths.
// Due to the implemented swap, 'leftOscillator' path is now controlled by the physical RIGHT hand,
// and 'rightOscillator' path is controlled by the physical LEFT hand.
let leftOscillator = null; // Path A: Controlled by Physical Right Hand
let leftOscillatorGainNode = null; // Path A
let rightOscillator = null; // Path B: Controlled by Physical Left Hand
let rightOscillatorGainNode = null; // Path B
const soundFontInstrumentNames = ["acoustic_grand_piano", "orchestral_harp", "violin", "glockenspiel", "church_organ"];
let leftSoundFontControl = { instrument: null, handGainNode: null, activeNotePlayer: null, currentMidiNote: null }; // Path A: Controlled by Physical Right Hand
let rightSoundFontControl = { instrument: null, handGainNode: null, activeNotePlayer: null, currentMidiNote: null }; // Path B: Controlled by Physical Left Hand
// For User Custom Samples
const USER_CUSTOM_SAMPLE_ID = "user_custom_sample";
let customSampleBufferPathA = null; // Audio Path A (Physical Right Hand)
let customSampleNamePathA = null;
let customSampleBufferPathB = null; // Audio Path B (Physical Left Hand)
let customSampleNamePathB = null;
let isPathACustomSamplePlaying = false; // For Theremin mode with custom samples Path A
let isPathBCustomSamplePlaying = false; // For Theremin mode with custom samples Path B
// For Standard Sample
const STANDARD_BELL_ID = "standard_sample_bell";
const STANDARD_BELL_FILENAME = "standard-bell.mp3";
let standardBellSampleBuffer = null;
let standardBellSampleLoadingAttempted = false;
let standardBellSampleCurrentlyLoading = false;
let isPathAStandardBellPlaying = false; // For Theremin mode with standard bell Path A
let isPathBStandardBellPlaying = false; // For Theremin mode with standard bell Path B
// Landmark and Equalizer constants
const WRIST = 0;
const FINGER_TIPS_INDICES = {
    T: 4, I: 8, M: 12, R: 16, P: 20 // Thumb, Index, Middle, Ring, Pinky
};
const FINGER_LABELS = ['P', 'R', 'M', 'I', 'T']; // Pinky to Thumb order for easier note mapping
const ALL_FINGER_KEY_IDS = ['R-P', 'R-R', 'R-M', 'R-I', 'R-T', 'L-P', 'L-R', 'L-M', 'L-I', 'L-T'];
const MAX_FINGER_DISTANCE_NORMALIZATION = 0.4; // Used for all distance modes for now.
const TOTAL_LANDMARKS = 21; // 0-20
// Custom Distance Calculation Mode: Landmark pairs (0-based MediaPipe indices)
// P,R,M,I: Tip to MCP. T: THUMB_TIP to INDEX_FINGER_MCP (literal "6-5" from user's 1-based scheme)
const CUSTOM_DISTANCE_LANDMARK_PAIRS = {
    'P': [FINGER_TIPS_INDICES.P, 17], // Pinky: TIP (20) to PINKY_MCP (17)
    'R': [FINGER_TIPS_INDICES.R, 13], // Ring: TIP (16) to RING_MCP (13)
    'M': [FINGER_TIPS_INDICES.M, 9], // Middle: TIP (12) to MIDDLE_MCP (9)
    'I': [FINGER_TIPS_INDICES.I, 5], // Index: TIP (8) to INDEX_FINGER_MCP (5)
    'T': [FINGER_TIPS_INDICES.T, 5] // Thumb: THUMB_TIP (4) to INDEX_FINGER_MCP (5)
};
let currentPlaybackMode = "theremin";
let currentDistanceMode = "wrist_tip";
let userCustomLandmarkPairs = {};
const TAP_PAD_ZONES = {
    SCREEN_LEFT_UPPER: { id: "SLU", rect: { x: 0, y: 0, w: 0.5, h: 0.5 }, midi: 60, freq: 261.63, color: "rgba(255, 193, 7, 0.3)" }, // C4 - Originally Right Hand (screen left, triangle)
    SCREEN_LEFT_LOWER: { id: "SLL", rect: { x: 0, y: 0.5, w: 0.5, h: 0.5 }, midi: 64, freq: 329.63, color: "rgba(255, 193, 7, 0.3)" }, // E4 - Originally Right Hand (screen left, triangle)
    SCREEN_RIGHT_UPPER: { id: "SRU", rect: { x: 0.5, y: 0, w: 0.5, h: 0.5 }, midi: 67, freq: 392.00, color: "rgba(0, 123, 255, 0.3)" }, // G4 - Originally Left Hand (screen right, circle)
    SCREEN_RIGHT_LOWER: { id: "SRL", rect: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, midi: 71, freq: 493.88, color: "rgba(0, 123, 255, 0.3)" }, // B4 - Originally Left Hand (screen right, circle)
};
const TAP_NOTE_DURATION_OSC = 0.15; // seconds for oscillator/SF note decay in tap/fingerkey mode
const TAP_NOTE_DURATION_CUSTOM_SAMPLE = TAP_NOTE_DURATION_OSC * 2; // slightly longer for samples
const padInteractionStates = {};
Object.values(TAP_PAD_ZONES).forEach(padDefinition => {
    padInteractionStates[padDefinition.id] = { isActive: false };
});
// Finger Keys Mode specific constants and state
const FINGER_KEY_NOTES = {
    // Physical Right Hand (Screen Left, Triangle) - P, R, M, I, T
    'R-P': { midi: 60, freq: 261.63 }, // C4 (Pinky)
    'R-R': { midi: 62, freq: 293.66 }, // D4 (Ring)
    'R-M': { midi: 64, freq: 329.63 }, // E4 (Middle)
    'R-I': { midi: 65, freq: 349.23 }, // F4 (Index)
    'R-T': { midi: 67, freq: 392.00 }, // G4 (Thumb)
    // Physical Left Hand (Screen Right, Circle) - P, R, M, I, T (Note: L-T, L-I, L-M, L-R, L-P in display)
    'L-P': { midi: 48, freq: 130.81 }, // C3 (Pinky)
    'L-R': { midi: 50, freq: 146.83 }, // D3 (Ring)
    'L-M': { midi: 52, freq: 164.81 }, // E3 (Middle)
    'L-I': { midi: 53, freq: 174.61 }, // F3 (Index)
    'L-T': { midi: 55, freq: 196.00 }, // G3 (Thumb)
};
const fingerKeyStates = {};
ALL_FINGER_KEY_IDS.forEach(keyId => {
    fingerKeyStates[keyId] = { isActive: false };
});
// Finger Key Thresholds & Mute States & localStorage Keys
const LOCALSTORAGE_KEY_THRESHOLDS = 'fingerKeyThresholds';
const LOCALSTORAGE_KEY_MUTED_STATES = 'fingerKeyMutedStates';
const LOCALSTORAGE_KEY_INSTRUMENT_CIRCLE = 'instrumentSelectionCircleHand'; // Physical Left Hand
const LOCALSTORAGE_KEY_INSTRUMENT_TRIANGLE = 'instrumentSelectionTriangleHand'; // Physical Right Hand
const LOCALSTORAGE_KEY_PLAYBACK_MODE = 'selectedPlaybackMode';
const LOCALSTORAGE_KEY_DISTANCE_MODE = 'selectedDistanceMode';
const LOCALSTORAGE_KEY_CUSTOM_PAIRS = 'fingerKeyCustomLandmarkPairs';
let fingerKeyThresholds = {};
let fingerKeyMutedStates = {};
const DEFAULT_INDIVIDUAL_FINGER_THRESHOLD = 70; // Percent
const THRESHOLD_STEP = 1; // Percent
const MIN_THRESHOLD = 5; // Percent
const MAX_THRESHOLD = 95; // Percent
function isSoundFontInstrument(instrumentName) {
    return soundFontInstrumentNames.includes(instrumentName);
}
async function ensureStandardBellSampleLoaded(audioCtx) {
    if (standardBellSampleBuffer)
        return true; // Already loaded
    if (standardBellSampleCurrentlyLoading) {
        // statusMessage.textContent = "Стандартный колокольчик всё ещё загружается..."; // Optional
        return false;
    }
    if (standardBellSampleLoadingAttempted && !standardBellSampleBuffer)
        return false; // Failed before
    standardBellSampleLoadingAttempted = true;
    standardBellSampleCurrentlyLoading = true;
    const originalStatus = statusMessage.textContent;
    statusMessage.textContent = `Загрузка стандартного сэмпла (${STANDARD_BELL_FILENAME})...`;
    const warningMessagePrefix = `Предупреждение: Файл "${STANDARD_BELL_FILENAME}" не найден.`;
    try {
        const response = await fetch(STANDARD_BELL_FILENAME);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} while fetching ${STANDARD_BELL_FILENAME}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        standardBellSampleBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        statusMessage.textContent = `Стандартный сэмпл "${STANDARD_BELL_FILENAME}" загружен.`;
        standardBellSampleCurrentlyLoading = false;
        return true;
    }
    catch (e) {
        console.error(`Ошибка загрузки стандартного сэмпла "${STANDARD_BELL_FILENAME}":`, e);
        statusMessage.textContent = `${warningMessagePrefix} Для "Стандартного колокольчика" будет использован синус-генератор. Убедитесь, что файл ${STANDARD_BELL_FILENAME} находится рядом с index.html, если хотите его использовать.`;
        standardBellSampleBuffer = null;
        standardBellSampleCurrentlyLoading = false;
        setTimeout(() => {
            if (statusMessage.textContent && statusMessage.textContent.startsWith(warningMessagePrefix)) {
                if (originalStatus && !originalStatus.includes("Ошибка") && !originalStatus.includes("Загрузка") && !originalStatus.includes("Предупреждение")) {
                    statusMessage.textContent = originalStatus;
                }
                else if (isTracking) {
                    statusMessage.textContent = 'Музыка запущена. Управляйте руками.';
                }
                else {
                    statusMessage.textContent = 'Нажмите "Начать музыку" для старта.';
                }
            }
        }, 5000); // Increased timeout for warning
        return false;
    }
}
function onResults(results) {
    if (!canvasCtx || !canvasElement || !audioContext)
        return;
    const now = audioContext.currentTime;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    let physLeftHandAudioControlledThisFrame = false; // Path B (rightOscillator etc.)
    let physRightHandAudioControlledThisFrame = false; // Path A (leftOscillator etc.)
    if (currentPlaybackMode === "tappad") {
        Object.values(TAP_PAD_ZONES).forEach(pad => {
            canvasCtx.beginPath();
            canvasCtx.rect(pad.rect.x * canvasElement.width, pad.rect.y * canvasElement.height, pad.rect.w * canvasElement.width, pad.rect.h * canvasElement.height);
            canvasCtx.fillStyle = padInteractionStates[pad.id]?.isActive ? pad.color.replace("0.3", "0.6") : pad.color;
            canvasCtx.fill();
            canvasCtx.strokeStyle = pad.color.replace("0.3", "0.8");
            canvasCtx.lineWidth = 2;
            canvasCtx.stroke();
        });
    }
    // Reset visualizers (finger bar height and percentage text)
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        const handPrefix = keyId.startsWith('L') ? 'left' : 'right';
        const fingerLabel = keyId.substring(2); // T, I, M, R, P
        const barFill = document.getElementById(`${handPrefix}-finger-${fingerLabel.toLowerCase()}-bar-fill`);
        if (barFill)
            barFill.style.height = '0%';
        const valueDisplay = document.getElementById(`${handPrefix}-finger-${fingerLabel.toLowerCase()}-bar-value`);
        if (valueDisplay)
            valueDisplay.textContent = '0%';
    });
    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].label; // 'Left' or 'Right' (physical hands)
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
            drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2, radius: 3 });
            // Draw landmark numbers
            for (let j = 0; j < landmarks.length; j++) {
                const landmark = landmarks[j];
                const drawX = landmark.x * canvasElement.width;
                const drawY = landmark.y * canvasElement.height;
                const textNumber = (j + 1).toString();
                const textOffsetX = 5;
                const textOffsetY = 5;
                canvasCtx.save();
                canvasCtx.translate(drawX + textOffsetX, drawY + textOffsetY);
                canvasCtx.scale(-1, 1);
                canvasCtx.font = '18px Arial';
                canvasCtx.fillStyle = '#FFFF00';
                canvasCtx.textAlign = 'left';
                canvasCtx.textBaseline = 'top';
                canvasCtx.fillText(textNumber, 0, 0);
                canvasCtx.restore();
            }
            if (landmarks && landmarks[WRIST]) {
                const wristLandmark = landmarks[WRIST]; // Raw X: 0 (left of image) to 1 (right of image)
                const indexFingerTipLandmark = landmarks[FINGER_TIPS_INDICES.I];
                const screenX = wristLandmark.x * canvasElement.width;
                const screenY = wristLandmark.y * canvasElement.height;
                const shapeSize = 20;
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
                FINGER_LABELS.forEach(fingerLabel => {
                    const tipIndex = FINGER_TIPS_INDICES[fingerLabel];
                    const handPrefixForDOM = handedness === 'Left' ? 'left' : 'right';
                    const barFillElement = document.getElementById(`${handPrefixForDOM}-finger-${fingerLabel.toLowerCase()}-bar-fill`);
                    const valueDisplayId = `${handPrefixForDOM}-finger-${fingerLabel.toLowerCase()}-bar-value`;
                    const valueDisplayElement = document.getElementById(valueDisplayId);
                    let point1, point2;
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
                        const handPrefixForKey = handedness === 'Left' ? 'L' : 'R';
                        const fingerKey = `${handPrefixForKey}-${fingerLabel}`;
                        const userPair = userCustomLandmarkPairs[fingerKey];
                        if (userPair && landmarks[userPair[0]] && landmarks[userPair[1]]) {
                            point1 = landmarks[userPair[0]];
                            point2 = landmarks[userPair[1]];
                        }
                    }
                    if (point1 && point2 && barFillElement) {
                        const distance = Math.hypot(point2.x - point1.x, point2.y - point1.y);
                        let barHeightPercent = (distance / MAX_FINGER_DISTANCE_NORMALIZATION) * 100;
                        barHeightPercent = Math.max(0, Math.min(100, barHeightPercent));
                        barFillElement.style.height = `${barHeightPercent}%`;
                        if (valueDisplayElement) {
                            valueDisplayElement.textContent = `${Math.round(barHeightPercent)}%`;
                        }
                    }
                    else {
                        if (valueDisplayElement)
                            valueDisplayElement.textContent = '0%';
                        if (barFillElement)
                            barFillElement.style.height = '0%';
                    }
                });
                if (currentPlaybackMode === "theremin") {
                    const normY = 1.0 - wristLandmark.y;
                    const normXTheremin = wristLandmark.x;
                    const thereminGain = Math.max(0, MIN_GAIN + normXTheremin * (MAX_GAIN - MIN_GAIN));
                    if (handedness === 'Left') { // Physical Left Hand (circle visual) -> controls 'Path B' (rightOscillator etc.)
                        physLeftHandAudioControlledThisFrame = true;
                        const instrumentType = leftInstrumentSelect.value;
                        if (instrumentType === USER_CUSTOM_SAMPLE_ID && customSampleBufferPathB && audioContext && rightOscillatorGainNode) {
                            if (thereminGain > 0.01 && !isPathBCustomSamplePlaying) {
                                isPathBCustomSamplePlaying = true;
                                const source = audioContext.createBufferSource();
                                source.buffer = customSampleBufferPathB;
                                source.connect(rightOscillatorGainNode); // Path's main gain node
                                source.start(now);
                                source.onended = () => { isPathBCustomSamplePlaying = false; };
                            }
                            rightOscillatorGainNode.gain.setTargetAtTime(thereminGain, now, 0.01);
                        }
                        else if (instrumentType === STANDARD_BELL_ID && standardBellSampleBuffer && audioContext && rightOscillatorGainNode) {
                            if (thereminGain > 0.01 && !isPathBStandardBellPlaying) {
                                isPathBStandardBellPlaying = true;
                                const source = audioContext.createBufferSource();
                                source.buffer = standardBellSampleBuffer;
                                source.connect(rightOscillatorGainNode);
                                source.start(now);
                                source.onended = () => { isPathBStandardBellPlaying = false; };
                            }
                            rightOscillatorGainNode.gain.setTargetAtTime(thereminGain, now, 0.01);
                        }
                        else if (isSoundFontInstrument(instrumentType) && rightSoundFontControl.instrument && rightSoundFontControl.handGainNode) {
                            const midiNote = Math.floor(MIDI_NOTE_MIN + normY * (MIDI_NOTE_MAX - MIDI_NOTE_MIN + 1));
                            const safeMidiNote = Math.max(MIDI_NOTE_MIN, Math.min(MIDI_NOTE_MAX, midiNote));
                            rightSoundFontControl.handGainNode.gain.setTargetAtTime(thereminGain, now, 0.01);
                            if (rightSoundFontControl.currentMidiNote !== safeMidiNote) {
                                if (rightSoundFontControl.activeNotePlayer)
                                    rightSoundFontControl.activeNotePlayer.stop(now);
                                rightSoundFontControl.activeNotePlayer = rightSoundFontControl.instrument.play(safeMidiNote.toString(), now, { destination: rightSoundFontControl.handGainNode });
                                rightSoundFontControl.currentMidiNote = safeMidiNote;
                            }
                        }
                        else if (rightOscillator && rightOscillatorGainNode) {
                            const frequency = MIN_FREQ + normY * (MAX_FREQ - MIN_FREQ);
                            rightOscillator.frequency.setTargetAtTime(frequency, now, 0.01);
                            rightOscillatorGainNode.gain.setTargetAtTime(thereminGain, now, 0.01);
                        }
                    }
                    else if (handedness === 'Right') { // Physical Right Hand (triangle visual) -> controls 'Path A' (leftOscillator etc.)
                        physRightHandAudioControlledThisFrame = true;
                        const instrumentType = rightInstrumentSelect.value;
                        if (instrumentType === USER_CUSTOM_SAMPLE_ID && customSampleBufferPathA && audioContext && leftOscillatorGainNode) {
                            if (thereminGain > 0.01 && !isPathACustomSamplePlaying) {
                                isPathACustomSamplePlaying = true;
                                const source = audioContext.createBufferSource();
                                source.buffer = customSampleBufferPathA;
                                source.connect(leftOscillatorGainNode); // Path's main gain node
                                source.start(now);
                                source.onended = () => { isPathACustomSamplePlaying = false; };
                            }
                            leftOscillatorGainNode.gain.setTargetAtTime(thereminGain, now, 0.01);
                        }
                        else if (instrumentType === STANDARD_BELL_ID && standardBellSampleBuffer && audioContext && leftOscillatorGainNode) {
                            if (thereminGain > 0.01 && !isPathAStandardBellPlaying) {
                                isPathAStandardBellPlaying = true;
                                const source = audioContext.createBufferSource();
                                source.buffer = standardBellSampleBuffer;
                                source.connect(leftOscillatorGainNode);
                                source.start(now);
                                source.onended = () => { isPathAStandardBellPlaying = false; };
                            }
                            leftOscillatorGainNode.gain.setTargetAtTime(thereminGain, now, 0.01);
                        }
                        else if (isSoundFontInstrument(instrumentType) && leftSoundFontControl.instrument && leftSoundFontControl.handGainNode) {
                            const midiNote = Math.floor(MIDI_NOTE_MIN + normY * (MIDI_NOTE_MAX - MIDI_NOTE_MIN + 1));
                            const safeMidiNote = Math.max(MIDI_NOTE_MIN, Math.min(MIDI_NOTE_MAX, midiNote));
                            leftSoundFontControl.handGainNode.gain.setTargetAtTime(thereminGain, now, 0.01);
                            if (leftSoundFontControl.currentMidiNote !== safeMidiNote) {
                                if (leftSoundFontControl.activeNotePlayer)
                                    leftSoundFontControl.activeNotePlayer.stop(now);
                                leftSoundFontControl.activeNotePlayer = leftSoundFontControl.instrument.play(safeMidiNote.toString(), now, { destination: leftSoundFontControl.handGainNode });
                                leftSoundFontControl.currentMidiNote = safeMidiNote;
                            }
                        }
                        else if (leftOscillator && leftOscillatorGainNode) {
                            const frequency = MIN_FREQ + normY * (MAX_FREQ - MIN_FREQ);
                            leftOscillator.frequency.setTargetAtTime(frequency, now, 0.01);
                            leftOscillatorGainNode.gain.setTargetAtTime(thereminGain, now, 0.01);
                        }
                    }
                }
                else if (currentPlaybackMode === "tappad" && indexFingerTipLandmark && audioContext) {
                    let targetPads = [];
                    let instrumentValue = "";
                    let normVolumeX;
                    let currentOsc = null;
                    let currentOscGain = null;
                    let currentSfControl = null;
                    let currentCustomSampleBuffer = null;
                    // For Tap Pad, standard bell is also an option
                    let currentStandardBellBuffer = standardBellSampleBuffer;
                    if (handedness === 'Right') { // Physical Right Hand (raw X is large, 0.5-1.0) -> controls 'Path A'
                        targetPads = [TAP_PAD_ZONES.SCREEN_LEFT_UPPER, TAP_PAD_ZONES.SCREEN_LEFT_LOWER];
                        instrumentValue = rightInstrumentSelect.value;
                        currentOsc = leftOscillator;
                        currentOscGain = leftOscillatorGainNode;
                        currentSfControl = leftSoundFontControl;
                        currentCustomSampleBuffer = customSampleBufferPathA;
                        normVolumeX = (wristLandmark.x - 0.5) / 0.5;
                        physRightHandAudioControlledThisFrame = true;
                    }
                    else { // Physical Left Hand (raw X is small, 0-0.5) -> controls 'Path B'
                        targetPads = [TAP_PAD_ZONES.SCREEN_RIGHT_UPPER, TAP_PAD_ZONES.SCREEN_RIGHT_LOWER];
                        instrumentValue = leftInstrumentSelect.value;
                        currentOsc = rightOscillator;
                        currentOscGain = rightOscillatorGainNode;
                        currentSfControl = rightSoundFontControl;
                        currentCustomSampleBuffer = customSampleBufferPathB;
                        normVolumeX = wristLandmark.x / 0.5;
                        physLeftHandAudioControlledThisFrame = true;
                    }
                    normVolumeX = Math.max(0, Math.min(1, normVolumeX));
                    const tapGain = MIN_GAIN + normVolumeX * (MAX_GAIN - MIN_GAIN);
                    for (const pad of targetPads) {
                        const tipX = indexFingerTipLandmark.x;
                        const tipY = indexFingerTipLandmark.y;
                        const isInsidePad = tipX >= pad.rect.x && tipX < (pad.rect.x + pad.rect.w) && tipY >= pad.rect.y && tipY < (pad.rect.y + pad.rect.h);
                        if (isInsidePad && !padInteractionStates[pad.id]?.isActive) {
                            padInteractionStates[pad.id].isActive = true;
                            if (instrumentValue === USER_CUSTOM_SAMPLE_ID && currentCustomSampleBuffer && audioContext) {
                                const source = audioContext.createBufferSource();
                                source.buffer = currentCustomSampleBuffer;
                                const playGainNode = audioContext.createGain(); // Independent gain for tap
                                playGainNode.gain.setValueAtTime(tapGain, now);
                                playGainNode.gain.setTargetAtTime(0, now + TAP_NOTE_DURATION_CUSTOM_SAMPLE, 0.05);
                                source.connect(playGainNode);
                                playGainNode.connect(audioContext.destination);
                                source.start(now);
                                source.onended = () => { playGainNode.disconnect(); };
                            }
                            else if (instrumentValue === STANDARD_BELL_ID && currentStandardBellBuffer && audioContext) {
                                const source = audioContext.createBufferSource();
                                source.buffer = currentStandardBellBuffer;
                                const playGainNode = audioContext.createGain();
                                playGainNode.gain.setValueAtTime(tapGain, now);
                                playGainNode.gain.setTargetAtTime(0, now + TAP_NOTE_DURATION_OSC, 0.05); // Standard sample uses OSC duration for tap
                                source.connect(playGainNode);
                                playGainNode.connect(audioContext.destination);
                                source.start(now);
                                source.onended = () => { playGainNode.disconnect(); };
                            }
                            else if (isSoundFontInstrument(instrumentValue) && currentSfControl?.instrument && currentSfControl.handGainNode) {
                                currentSfControl.handGainNode.gain.setTargetAtTime(tapGain, now, 0.01);
                                currentSfControl.handGainNode.gain.setTargetAtTime(0, now + TAP_NOTE_DURATION_OSC, 0.02);
                                currentSfControl.instrument.play(pad.midi.toString(), now, { destination: currentSfControl.handGainNode });
                            }
                            else if (currentOsc && currentOscGain) {
                                currentOsc.frequency.setValueAtTime(pad.freq, now);
                                currentOscGain.gain.setTargetAtTime(tapGain, now, 0.01);
                                currentOscGain.gain.setTargetAtTime(0, now + TAP_NOTE_DURATION_OSC, 0.02);
                            }
                        }
                        else if (!isInsidePad && padInteractionStates[pad.id]?.isActive) {
                            padInteractionStates[pad.id].isActive = false;
                        }
                    }
                }
                else if (currentPlaybackMode === "fingerkeys" && audioContext) {
                    const isPhysicalLeftHand = handedness === 'Left';
                    let instrumentValue;
                    let currentOsc, currentOscGain, currentSfControl;
                    let currentCustomSampleBuffer = null;
                    let currentStandardBellBuffer = standardBellSampleBuffer;
                    let normVolumeX;
                    if (isPhysicalLeftHand) {
                        physLeftHandAudioControlledThisFrame = true;
                        instrumentValue = leftInstrumentSelect.value;
                        currentOsc = rightOscillator;
                        currentOscGain = rightOscillatorGainNode;
                        currentSfControl = rightSoundFontControl;
                        currentCustomSampleBuffer = customSampleBufferPathB;
                        normVolumeX = wristLandmark.x / 0.5;
                    }
                    else {
                        physRightHandAudioControlledThisFrame = true;
                        instrumentValue = rightInstrumentSelect.value;
                        currentOsc = leftOscillator;
                        currentOscGain = leftOscillatorGainNode;
                        currentSfControl = leftSoundFontControl;
                        currentCustomSampleBuffer = customSampleBufferPathA;
                        normVolumeX = (wristLandmark.x - 0.5) / 0.5;
                    }
                    const handPrefixForFingerKeyId = isPhysicalLeftHand ? 'L' : 'R';
                    const handPrefixForDOM = isPhysicalLeftHand ? 'left' : 'right';
                    normVolumeX = Math.max(0, Math.min(1, normVolumeX));
                    const keyGain = MIN_GAIN + normVolumeX * (MAX_GAIN - MIN_GAIN);
                    FINGER_LABELS.forEach(fingerLabel => {
                        const barFillElement = document.getElementById(`${handPrefixForDOM}-finger-${fingerLabel.toLowerCase()}-bar-fill`);
                        const valueDisplayElement = document.getElementById(`${handPrefixForDOM}-finger-${fingerLabel.toLowerCase()}-bar-value`);
                        const barHeightPercent = parseFloat(valueDisplayElement?.textContent || '0');
                        const fingerKeyId = `${handPrefixForFingerKeyId}-${fingerLabel}`;
                        const currentThreshold = fingerKeyThresholds[fingerKeyId] || DEFAULT_INDIVIDUAL_FINGER_THRESHOLD;
                        const noteInfo = FINGER_KEY_NOTES[fingerKeyId];
                        const state = fingerKeyStates[fingerKeyId];
                        const isMuted = fingerKeyMutedStates[fingerKeyId] === true;
                        if (!isMuted && barHeightPercent < currentThreshold && state && !state.isActive && noteInfo) {
                            state.isActive = true;
                            if (instrumentValue === USER_CUSTOM_SAMPLE_ID && currentCustomSampleBuffer && audioContext) {
                                const source = audioContext.createBufferSource();
                                source.buffer = currentCustomSampleBuffer;
                                const playGainNode = audioContext.createGain();
                                playGainNode.gain.setValueAtTime(keyGain, now);
                                playGainNode.gain.setTargetAtTime(0, now + TAP_NOTE_DURATION_CUSTOM_SAMPLE, 0.05);
                                source.connect(playGainNode);
                                playGainNode.connect(audioContext.destination);
                                source.start(now);
                                source.onended = () => { playGainNode.disconnect(); };
                            }
                            else if (instrumentValue === STANDARD_BELL_ID && currentStandardBellBuffer && audioContext) {
                                const source = audioContext.createBufferSource();
                                source.buffer = currentStandardBellBuffer;
                                const playGainNode = audioContext.createGain();
                                playGainNode.gain.setValueAtTime(keyGain, now);
                                playGainNode.gain.setTargetAtTime(0, now + TAP_NOTE_DURATION_OSC, 0.05); // Standard sample uses OSC duration
                                source.connect(playGainNode);
                                playGainNode.connect(audioContext.destination);
                                source.start(now);
                                source.onended = () => { playGainNode.disconnect(); };
                            }
                            else if (isSoundFontInstrument(instrumentValue) && currentSfControl?.instrument && currentSfControl.handGainNode) {
                                currentSfControl.handGainNode.gain.setTargetAtTime(keyGain, now, 0.01);
                                currentSfControl.handGainNode.gain.setTargetAtTime(0, now + TAP_NOTE_DURATION_OSC, 0.02);
                                currentSfControl.instrument.play(noteInfo.midi.toString(), now, { destination: currentSfControl.handGainNode });
                            }
                            else if (currentOsc && currentOscGain) {
                                currentOsc.frequency.setValueAtTime(noteInfo.freq, now);
                                currentOscGain.gain.setTargetAtTime(keyGain, now, 0.01);
                                currentOscGain.gain.setTargetAtTime(0, now + TAP_NOTE_DURATION_OSC, 0.02);
                            }
                            if (barFillElement) {
                                const originalColor = isPhysicalLeftHand ? '#007bff' : '#ffc107';
                                const activeColor = isPhysicalLeftHand ? '#004494' : '#d97400';
                                barFillElement.style.backgroundColor = activeColor;
                                setTimeout(() => { if (barFillElement)
                                    barFillElement.style.backgroundColor = originalColor; }, 150);
                            }
                        }
                        else if (barHeightPercent >= currentThreshold && state && state.isActive) {
                            state.isActive = false;
                        }
                    });
                }
            }
        }
    }
    if (audioContext) {
        if (currentPlaybackMode === "theremin") {
            if (!physLeftHandAudioControlledThisFrame) {
                if (rightOscillatorGainNode)
                    rightOscillatorGainNode.gain.setTargetAtTime(0, now, 0.1);
                if (rightSoundFontControl.handGainNode)
                    rightSoundFontControl.handGainNode.gain.setTargetAtTime(0, now, 0.1);
                if (rightSoundFontControl.activeNotePlayer) {
                    rightSoundFontControl.activeNotePlayer.stop(now + 0.1);
                    rightSoundFontControl.activeNotePlayer = null;
                    rightSoundFontControl.currentMidiNote = null;
                }
                isPathBCustomSamplePlaying = false;
                isPathBStandardBellPlaying = false;
            }
            if (!physRightHandAudioControlledThisFrame) {
                if (leftOscillatorGainNode)
                    leftOscillatorGainNode.gain.setTargetAtTime(0, now, 0.1);
                if (leftSoundFontControl.handGainNode)
                    leftSoundFontControl.handGainNode.gain.setTargetAtTime(0, now, 0.1);
                if (leftSoundFontControl.activeNotePlayer) {
                    leftSoundFontControl.activeNotePlayer.stop(now + 0.1);
                    leftSoundFontControl.activeNotePlayer = null;
                    leftSoundFontControl.currentMidiNote = null;
                }
                isPathACustomSamplePlaying = false;
                isPathAStandardBellPlaying = false;
            }
        }
    }
    canvasCtx.restore();
}
async function initializeSoundSource(instrumentNameParam, soundFontControlTarget, oscillatorTarget, // This will be the specific oscillator for the path (e.g. leftOscillator)
gainNodeTarget, // This will be the specific gain node for the path (e.g. leftOscillatorGainNode)
physicalHandLabelForMessage // For status messages
) {
    if (!audioContext)
        throw new Error("AudioContext not initialized");
    // Clear previous state of the target audio path
    if (oscillatorTarget) {
        oscillatorTarget.stop();
        oscillatorTarget.disconnect();
        oscillatorTarget = null;
    }
    if (gainNodeTarget) {
        gainNodeTarget.disconnect();
        gainNodeTarget = null;
    }
    if (soundFontControlTarget.instrument && soundFontControlTarget.activeNotePlayer) {
        soundFontControlTarget.activeNotePlayer.stop();
        soundFontControlTarget.activeNotePlayer = null;
    }
    if (soundFontControlTarget.handGainNode) {
        soundFontControlTarget.handGainNode.disconnect();
        soundFontControlTarget.handGainNode = null;
    }
    soundFontControlTarget.instrument = null;
    soundFontControlTarget.currentMidiNote = null;
    let currentInstrumentName = instrumentNameParam;
    let newOscillator = null;
    let newGainNode = null;
    let newSoundFontControlState = {
        instrument: null,
        handGainNode: null,
        activeNotePlayer: null,
        currentMidiNote: null
    };
    const handInfoForMessage = physicalHandLabelForMessage === 'Left' ? 'физ. левой руки (кружок)' : 'физ. правой руки (треугольник)';
    let prepareFallbackOscillator = false;
    if (currentInstrumentName === USER_CUSTOM_SAMPLE_ID) {
        const targetBuffer = physicalHandLabelForMessage === 'Left' ? customSampleBufferPathB : customSampleBufferPathA;
        const targetName = physicalHandLabelForMessage === 'Left' ? customSampleNamePathB : customSampleNamePathA;
        if (targetBuffer && targetName) {
            statusMessage.textContent = `Свой сэмпл "${targetName}" готов для ${handInfoForMessage}.`;
            newGainNode = audioContext.createGain(); // Path's main gain node for custom sample
            newGainNode.gain.setValueAtTime(0, audioContext.currentTime);
            newGainNode.connect(audioContext.destination);
        }
        else {
            statusMessage.textContent = `Свой сэмпл не загружен для ${handInfoForMessage}. Используется синус-генератор.`;
            prepareFallbackOscillator = true;
        }
    }
    else if (currentInstrumentName === STANDARD_BELL_ID) {
        if (standardBellSampleBuffer) {
            statusMessage.textContent = `Стандартный сэмпл "${STANDARD_BELL_FILENAME}" готов для ${handInfoForMessage}.`;
            newGainNode = audioContext.createGain(); // Path's main gain node for standard sample
            newGainNode.gain.setValueAtTime(0, audioContext.currentTime);
            newGainNode.connect(audioContext.destination);
        }
        else {
            if (!standardBellSampleCurrentlyLoading && standardBellSampleLoadingAttempted) {
                statusMessage.textContent = `Стандартный сэмпл "${STANDARD_BELL_FILENAME}" не загружен для ${handInfoForMessage}. Используется синус-генератор.`;
            }
            else if (standardBellSampleCurrentlyLoading) {
                statusMessage.textContent = `Ожидание загрузки "${STANDARD_BELL_FILENAME}" для ${handInfoForMessage}... Используется синус-генератор временно.`;
            }
            else { // Not attempted yet, or some other state
                statusMessage.textContent = `Стандартный сэмпл "${STANDARD_BELL_FILENAME}" будет загружен при старте. Пока используется синус-генератор для ${handInfoForMessage}.`;
            }
            prepareFallbackOscillator = true;
        }
    }
    else if (isSoundFontInstrument(currentInstrumentName)) {
        statusMessage.textContent = `Загрузка ${currentInstrumentName} для ${handInfoForMessage}...`;
        try {
            const sfInstrument = await Soundfont.instrument(audioContext, currentInstrumentName, { gain: 1 });
            newSoundFontControlState.instrument = sfInstrument;
            newSoundFontControlState.handGainNode = audioContext.createGain();
            newSoundFontControlState.handGainNode.connect(audioContext.destination);
            newSoundFontControlState.handGainNode.gain.setValueAtTime(0, audioContext.currentTime);
            statusMessage.textContent = `Инструмент ${currentInstrumentName} загружен для ${handInfoForMessage}.`;
        }
        catch (e) {
            console.error(`Ошибка загрузки SoundFont ${currentInstrumentName} для ${physicalHandLabelForMessage}:`, e);
            statusMessage.textContent = `Ошибка ${currentInstrumentName}. Используется синус-генератор для ${handInfoForMessage}.`;
            prepareFallbackOscillator = true;
        }
    }
    // Check if an oscillator type was directly selected OR if we need a fallback
    const isDirectOscillatorType = !isSoundFontInstrument(currentInstrumentName) &&
        currentInstrumentName !== USER_CUSTOM_SAMPLE_ID &&
        currentInstrumentName !== STANDARD_BELL_ID;
    if (isDirectOscillatorType || prepareFallbackOscillator) {
        newOscillator = audioContext.createOscillator();
        newGainNode = audioContext.createGain(); // Path's main gain node for oscillator
        let finalOscillatorType = 'sine'; // Default for fallback
        let fallbackMessageWasSet = false;
        if (prepareFallbackOscillator) {
            // Status message about using sine generator was already set if it was due to sample/SF failure
            fallbackMessageWasSet = true;
        }
        else {
            finalOscillatorType = currentInstrumentName;
        }
        try {
            newOscillator.type = finalOscillatorType;
            newOscillator.frequency.setValueAtTime(MIN_FREQ, audioContext.currentTime);
        }
        catch (oscError) {
            console.warn(`Invalid oscillator type "${finalOscillatorType}". Falling back to "sine".`, oscError);
            newOscillator.type = 'sine';
            if (!fallbackMessageWasSet) { // Only set if not already set by a sample/SF fallback
                statusMessage.textContent = `Неверный тип осциллятора. Используется синус для ${handInfoForMessage}.`;
            } // No need to set fallbackMessageWasSet = true here, as the message is specific to oscillator type failure.
        }
        if (!fallbackMessageWasSet) { // If it wasn't a fallback from sample/SF and oscillator type was valid
            statusMessage.textContent = `Осциллятор ${newOscillator.type} готов для ${handInfoForMessage}.`;
        }
        newGainNode.gain.setValueAtTime(0, audioContext.currentTime);
        newOscillator.connect(newGainNode);
        newGainNode.connect(audioContext.destination);
        newOscillator.start();
    }
    return { oscillator: newOscillator, gainNode: newGainNode, soundFontControl: newSoundFontControlState };
}
function stopMusicInternal() {
    if (leftOscillator) {
        leftOscillator.stop();
        leftOscillator.disconnect();
        leftOscillator = null;
    }
    if (leftOscillatorGainNode) {
        leftOscillatorGainNode.disconnect();
        leftOscillatorGainNode = null;
    }
    if (rightOscillator) {
        rightOscillator.stop();
        rightOscillator.disconnect();
        rightOscillator = null;
    }
    if (rightOscillatorGainNode) {
        rightOscillatorGainNode.disconnect();
        rightOscillatorGainNode = null;
    }
    if (leftSoundFontControl.activeNotePlayer) {
        leftSoundFontControl.activeNotePlayer.stop();
        leftSoundFontControl.activeNotePlayer = null;
    }
    if (leftSoundFontControl.handGainNode) {
        leftSoundFontControl.handGainNode.disconnect();
    }
    leftSoundFontControl.instrument = null;
    leftSoundFontControl.currentMidiNote = null;
    leftSoundFontControl.handGainNode = null;
    if (rightSoundFontControl.activeNotePlayer) {
        rightSoundFontControl.activeNotePlayer.stop();
        rightSoundFontControl.activeNotePlayer = null;
    }
    if (rightSoundFontControl.handGainNode) {
        rightSoundFontControl.handGainNode.disconnect();
    }
    rightSoundFontControl.instrument = null;
    rightSoundFontControl.currentMidiNote = null;
    rightSoundFontControl.handGainNode = null;
    Object.keys(padInteractionStates).forEach(key => {
        if (padInteractionStates[key])
            padInteractionStates[key].isActive = false;
    });
    Object.keys(fingerKeyStates).forEach(key => {
        if (fingerKeyStates[key])
            fingerKeyStates[key].isActive = false;
    });
    isPathACustomSamplePlaying = false;
    isPathBCustomSamplePlaying = false;
    isPathAStandardBellPlaying = false;
    isPathBStandardBellPlaying = false;
}
function setAppControlsDisabled(disabled) {
    controlButton.disabled = disabled;
    leftInstrumentSelect.disabled = disabled;
    rightInstrumentSelect.disabled = disabled;
    // File inputs should generally remain enabled if their corresponding select is,
    // but might be disabled during global operations. For now, they follow the selects.
    if (leftCustomSampleInput)
        leftCustomSampleInput.disabled = disabled;
    if (rightCustomSampleInput)
        rightCustomSampleInput.disabled = disabled;
    document.querySelectorAll('input[name="playback-mode"]').forEach(radio => radio.disabled = disabled);
    document.querySelectorAll('input[name="distance-mode"]').forEach(radio => radio.disabled = disabled);
    if (infoButton)
        infoButton.disabled = disabled;
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        const point1Select = document.getElementById(`${keyId.toLowerCase()}-point1-select`);
        const point2Select = document.getElementById(`${keyId.toLowerCase()}-point2-select`);
        if (point1Select)
            point1Select.disabled = disabled;
        if (point2Select)
            point2Select.disabled = disabled;
    });
}
async function startMusic() {
    if (isTracking)
        return;
    statusMessage.textContent = "Инициализация...";
    setAppControlsDisabled(true);
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended')
            await audioContext.resume();
        // Attempt to load standard bell sample if not already loaded/failed or currently loading
        if (audioContext && !standardBellSampleBuffer && !standardBellSampleLoadingAttempted && !standardBellSampleCurrentlyLoading) {
            await ensureStandardBellSampleLoaded(audioContext);
        }
        isPathACustomSamplePlaying = false;
        isPathBCustomSamplePlaying = false;
        isPathAStandardBellPlaying = false;
        isPathBStandardBellPlaying = false;
        const physLeftInstName = leftInstrumentSelect.value;
        const physLeftHandAudioSources = await initializeSoundSource(physLeftInstName, rightSoundFontControl, rightOscillator, rightOscillatorGainNode, 'Left');
        rightOscillator = physLeftHandAudioSources.oscillator;
        rightOscillatorGainNode = physLeftHandAudioSources.gainNode;
        rightSoundFontControl = physLeftHandAudioSources.soundFontControl;
        const physRightInstName = rightInstrumentSelect.value;
        const physRightHandAudioSources = await initializeSoundSource(physRightInstName, leftSoundFontControl, leftOscillator, leftOscillatorGainNode, 'Right');
        leftOscillator = physRightHandAudioSources.oscillator;
        leftOscillatorGainNode = physRightHandAudioSources.gainNode;
        leftSoundFontControl = physRightHandAudioSources.soundFontControl;
        // Only set "Запуск камеры..." if no major error/loading messages are active
        if (!statusMessage.textContent?.includes("Ошибка") && !statusMessage.textContent?.includes("Загрузка") && !statusMessage.textContent?.includes("Ожидание") && !statusMessage.textContent?.includes("Предупреждение")) {
            statusMessage.textContent = "Запуск камеры...";
        }
        if (!hands) {
            hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
            hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
            hands.onResults(onResults);
        }
        if (!camera) {
            camera = new Camera(videoElement, {
                onFrame: async () => {
                    if (videoElement && videoElement.readyState >= HTMLMediaElement.HAVE_METADATA) {
                        if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
                            canvasElement.width = videoElement.videoWidth;
                            canvasElement.height = videoElement.videoHeight;
                        }
                        if (hands)
                            await hands.send({ image: videoElement });
                    }
                },
                width: 640, height: 480
            });
        }
        await camera.start();
        isTracking = true;
        controlButton.textContent = 'Остановить музыку';
        controlButton.setAttribute('aria-pressed', 'true');
        if (!statusMessage.textContent?.includes("Ошибка") && !statusMessage.textContent?.includes("Загрузка") && !statusMessage.textContent?.includes("Ожидание") && !statusMessage.textContent?.includes("Предупреждение")) {
            statusMessage.textContent = 'Музыка запущена. Управляйте руками.';
        }
        setAppControlsDisabled(false);
        updateCustomPairsUIConfigVisibility();
    }
    catch (err) {
        console.error('Failed to start music:', err);
        statusMessage.textContent = `Ошибка: ${err.message}. Проверьте разрешения.`;
        stopMusicInternal();
        isTracking = false;
        setAppControlsDisabled(false);
        updateCustomPairsUIConfigVisibility();
    }
}
function stopMusic() {
    if (!isTracking)
        return;
    setAppControlsDisabled(true);
    if (camera)
        camera.stop();
    stopMusicInternal();
    isTracking = false;
    controlButton.textContent = 'Начать музыку';
    controlButton.setAttribute('aria-pressed', 'false');
    statusMessage.textContent = 'Музыка остановлена. Нажмите "Начать музыку" для возобновления.';
    setAppControlsDisabled(false);
    updateCustomPairsUIConfigVisibility();
    if (canvasCtx && canvasElement)
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
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
}
controlButton.addEventListener('click', () => {
    if (!audioContext || audioContext.state === 'suspended') {
        if (!audioContext)
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.resume().then(() => {
            if (isTracking)
                stopMusic();
            else
                startMusic();
        }).catch(e => {
            statusMessage.textContent = "Не удалось инициализировать аудио. Взаимодействуйте со страницей.";
            console.error("AudioContext resume failed:", e);
        });
    }
    else {
        if (isTracking)
            stopMusic();
        else
            startMusic();
    }
});
async function handleInstrumentChange(physicalHand) {
    const selectElement = physicalHand === 'Left' ? leftInstrumentSelect : rightInstrumentSelect;
    const instrumentName = selectElement.value;
    const localStorageKey = physicalHand === 'Left' ? LOCALSTORAGE_KEY_INSTRUMENT_CIRCLE : LOCALSTORAGE_KEY_INSTRUMENT_TRIANGLE;
    const handInfo = physicalHand === 'Left' ? 'физ. левой руки (кружок)' : 'физ. правой руки (треугольник)';
    try {
        localStorage.setItem(localStorageKey, instrumentName);
    }
    catch (e) {
        console.error(`Error saving instrument for ${physicalHand} hand to localStorage:`, e);
    }
    if (instrumentName === USER_CUSTOM_SAMPLE_ID) {
        const fileInput = physicalHand === 'Left' ? leftCustomSampleInput : rightCustomSampleInput;
        if (fileInput)
            fileInput.click(); // Triggers file selection dialog
        if (!isTracking) { // If music is not running, guide user.
            const currentBuffer = physicalHand === 'Left' ? customSampleBufferPathB : customSampleBufferPathA;
            if (!currentBuffer) {
                statusMessage.textContent = `Выберите файл .mp3 или .wav для ${handInfo}.`;
            }
            else {
                statusMessage.textContent = `Для ${handInfo} выбран свой сэмпл. Нажмите "Начать музыку" или выберите другой файл.`;
            }
        }
        // Actual sound re-initialization will be handled by the file input's 'change' event listener.
        return;
    }
    // For non-custom instruments (including standard bell) or if custom sample was selected but no file chosen yet (will fallback in initialize)
    if (isTracking && audioContext) {
        setAppControlsDisabled(true);
        if (physicalHand === 'Left') {
            const sources = await initializeSoundSource(instrumentName, rightSoundFontControl, rightOscillator, rightOscillatorGainNode, 'Left');
            rightOscillator = sources.oscillator;
            rightOscillatorGainNode = sources.gainNode;
            rightSoundFontControl = sources.soundFontControl;
        }
        else {
            const sources = await initializeSoundSource(instrumentName, leftSoundFontControl, leftOscillator, leftOscillatorGainNode, 'Right');
            leftOscillator = sources.oscillator;
            leftOscillatorGainNode = sources.gainNode;
            leftSoundFontControl = sources.soundFontControl;
        }
        if (!statusMessage.textContent?.includes("Ошибка") && !statusMessage.textContent?.includes("Загрузка") && !statusMessage.textContent?.includes("Ожидание") && !statusMessage.textContent?.includes("Предупреждение")) {
            statusMessage.textContent = 'Музыка запущена. Управляйте руками.';
        }
        setAppControlsDisabled(false);
        updateCustomPairsUIConfigVisibility();
    }
    else if (!isTracking) {
        if (instrumentName === STANDARD_BELL_ID && !standardBellSampleBuffer && !standardBellSampleCurrentlyLoading && audioContext) {
            // If standard bell selected while not tracking, and it's not loaded, try to load it now.
            await ensureStandardBellSampleLoaded(audioContext);
        }
        else if (!statusMessage.textContent?.includes("Используется синус-генератор") && !statusMessage.textContent?.includes("Выберите файл") && !statusMessage.textContent?.includes("Загрузка") && !statusMessage.textContent?.includes("Предупреждение")) {
            statusMessage.textContent = `Инструмент для ${handInfo} выбран. Нажмите "Начать музыку".`;
        }
    }
}
leftInstrumentSelect.addEventListener('change', () => handleInstrumentChange('Left'));
rightInstrumentSelect.addEventListener('change', () => handleInstrumentChange('Right'));
// File Input Change Handler
function createFileInputHandler(physicalHand) {
    return async (event) => {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if (audioContext.state === 'suspended')
                    await audioContext.resume();
            }
            catch (e) {
                statusMessage.textContent = "Ошибка: Аудиоконтекст не доступен.";
                console.error("AudioContext creation/resume failed:", e);
                return;
            }
        }
        if (!audioContext) { // Double check after attempt
            statusMessage.textContent = "Ошибка: Аудиоконтекст не доступен.";
            return;
        }
        const input = event.target;
        const file = input.files?.[0];
        const isLeftHand = physicalHand === 'Left';
        const nameDisplay = isLeftHand ? leftCustomSampleNameDisplay : rightCustomSampleNameDisplay;
        const selectEl = isLeftHand ? leftInstrumentSelect : rightInstrumentSelect;
        const handInfoForMessage = isLeftHand ? 'физ. левой руки (кружок)' : 'физ. правой руки (треугольник)';
        if (file) {
            nameDisplay.textContent = `Загрузка: ${file.name.substring(0, 20)}...`;
            statusMessage.textContent = `Загрузка файла "${file.name}" для ${handInfoForMessage}...`;
            setAppControlsDisabled(true);
            try {
                const arrayBuffer = await file.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                if (isLeftHand) {
                    customSampleBufferPathB = audioBuffer;
                    customSampleNamePathB = file.name;
                }
                else {
                    customSampleBufferPathA = audioBuffer;
                    customSampleNamePathA = file.name;
                }
                nameDisplay.textContent = file.name;
                statusMessage.textContent = `Файл "${file.name}" загружен для ${handInfoForMessage}.`;
                if (isTracking) {
                    if (isLeftHand) {
                        const sources = await initializeSoundSource(USER_CUSTOM_SAMPLE_ID, rightSoundFontControl, rightOscillator, rightOscillatorGainNode, 'Left');
                        rightOscillator = sources.oscillator;
                        rightOscillatorGainNode = sources.gainNode;
                        rightSoundFontControl = sources.soundFontControl;
                    }
                    else {
                        const sources = await initializeSoundSource(USER_CUSTOM_SAMPLE_ID, leftSoundFontControl, leftOscillator, leftOscillatorGainNode, 'Right');
                        leftOscillator = sources.oscillator;
                        leftOscillatorGainNode = sources.gainNode;
                        leftSoundFontControl = sources.soundFontControl;
                    }
                }
            }
            catch (e) {
                console.error(`Ошибка загрузки файла ${file.name}:`, e);
                statusMessage.textContent = `Ошибка загрузки "${file.name}". Файл не поддерживается или поврежден.`;
                nameDisplay.textContent = "Ошибка файла";
                if (isLeftHand) {
                    customSampleBufferPathB = null;
                    customSampleNamePathB = null;
                }
                else {
                    customSampleBufferPathA = null;
                    customSampleNamePathA = null;
                }
                if (isTracking) {
                    const fallbackInstrument = 'sine';
                    selectEl.value = fallbackInstrument; // Update UI to show fallback
                    if (isLeftHand) {
                        const sources = await initializeSoundSource(fallbackInstrument, rightSoundFontControl, rightOscillator, rightOscillatorGainNode, 'Left');
                        rightOscillator = sources.oscillator;
                        rightOscillatorGainNode = sources.gainNode;
                        rightSoundFontControl = sources.soundFontControl;
                    }
                    else {
                        const sources = await initializeSoundSource(fallbackInstrument, leftSoundFontControl, leftOscillator, leftOscillatorGainNode, 'Right');
                        leftOscillator = sources.oscillator;
                        leftOscillatorGainNode = sources.gainNode;
                        leftSoundFontControl = sources.soundFontControl;
                    }
                }
                else {
                    // If not tracking, ensure the select is not stuck on "user_custom_sample" if it failed
                    if (selectEl.value === USER_CUSTOM_SAMPLE_ID)
                        selectEl.value = 'sine';
                }
            }
            finally {
                setAppControlsDisabled(false);
                updateCustomPairsUIConfigVisibility();
                input.value = '';
            }
        }
        else { // No file selected (e.g., user cancelled dialog)
            nameDisplay.textContent = (isLeftHand ? customSampleNamePathB : customSampleNamePathA) || "Нет файла";
            if (selectEl.value === USER_CUSTOM_SAMPLE_ID && !(isLeftHand ? customSampleBufferPathB : customSampleBufferPathA)) {
                statusMessage.textContent = `Файл не выбран для ${handInfoForMessage}. Будет использован синус-генератор если музыка запущена.`;
            }
        }
    };
}
if (leftCustomSampleInput)
    leftCustomSampleInput.addEventListener('change', createFileInputHandler('Left'));
if (rightCustomSampleInput)
    rightCustomSampleInput.addEventListener('change', createFileInputHandler('Right'));
function updatePlaybackModeVisuals() {
    if (equalizerContainer) {
        if (currentPlaybackMode === 'fingerkeys') {
            equalizerContainer.classList.add('fingerkeys-mode-active');
        }
        else {
            equalizerContainer.classList.remove('fingerkeys-mode-active');
        }
    }
    document.querySelectorAll('.finger-threshold-controls').forEach(el => {
        if (currentPlaybackMode === 'fingerkeys') {
            el.classList.remove('threshold-controls-hidden');
        }
        else {
            el.classList.add('threshold-controls-hidden');
        }
    });
}
document.querySelectorAll('input[name="playback-mode"]').forEach(radio => {
    radio.addEventListener('change', (event) => {
        currentPlaybackMode = event.target.value;
        updatePlaybackModeVisuals();
        try {
            localStorage.setItem(LOCALSTORAGE_KEY_PLAYBACK_MODE, currentPlaybackMode);
        }
        catch (e) {
            console.error("Error saving playback mode to localStorage:", e);
        }
        let modeName = "";
        if (currentPlaybackMode === 'theremin')
            modeName = "Ручной терменвокс";
        else if (currentPlaybackMode === 'tappad')
            modeName = "Сенсорные пэды";
        else if (currentPlaybackMode === 'fingerkeys')
            modeName = "Пальцевые клавиши";
        statusMessage.textContent = `Режим изменен на: ${modeName}.`;
        if (isTracking && audioContext) {
            if (leftOscillatorGainNode)
                leftOscillatorGainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.01);
            if (rightOscillatorGainNode)
                rightOscillatorGainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.01);
            if (leftSoundFontControl.activeNotePlayer) {
                leftSoundFontControl.activeNotePlayer.stop();
                leftSoundFontControl.activeNotePlayer = null;
                leftSoundFontControl.currentMidiNote = null;
            }
            if (leftSoundFontControl.handGainNode)
                leftSoundFontControl.handGainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.01);
            if (rightSoundFontControl.activeNotePlayer) {
                rightSoundFontControl.activeNotePlayer.stop();
                rightSoundFontControl.activeNotePlayer = null;
                rightSoundFontControl.currentMidiNote = null;
            }
            if (rightSoundFontControl.handGainNode)
                rightSoundFontControl.handGainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.01);
            Object.keys(padInteractionStates).forEach(key => { if (padInteractionStates[key])
                padInteractionStates[key].isActive = false; });
            Object.keys(fingerKeyStates).forEach(key => { if (fingerKeyStates[key])
                fingerKeyStates[key].isActive = false; });
            isPathACustomSamplePlaying = false;
            isPathBCustomSamplePlaying = false;
            isPathAStandardBellPlaying = false;
            isPathBStandardBellPlaying = false;
        }
        console.log("Playback mode changed to:", currentPlaybackMode);
    });
});
function updateCustomPairsUIConfigVisibility() {
    if (customPairsConfigContainer) {
        if (currentDistanceMode === 'custom_user_defined' && !controlButton.disabled) {
            customPairsConfigContainer.classList.remove('hidden-control-group');
        }
        else {
            customPairsConfigContainer.classList.add('hidden-control-group');
        }
    }
}
document.querySelectorAll('input[name="distance-mode"]').forEach(radio => {
    radio.addEventListener('change', (event) => {
        currentDistanceMode = event.target.value;
        updateCustomPairsUIConfigVisibility();
        try {
            localStorage.setItem(LOCALSTORAGE_KEY_DISTANCE_MODE, currentDistanceMode);
        }
        catch (e) {
            console.error("Error saving distance mode to localStorage:", e);
        }
        let modeName = "";
        if (currentDistanceMode === 'wrist_tip')
            modeName = "От запястья до кончика";
        else if (currentDistanceMode === 'custom_points')
            modeName = "Между указанными точками";
        else if (currentDistanceMode === 'custom_user_defined')
            modeName = "Кастомный (пользовательский)";
        statusMessage.textContent = `Режим расчета расстояния изменен на: ${modeName}.`;
        console.log("Distance calculation mode changed to:", currentDistanceMode);
    });
});
videoElement.muted = true;
videoElement.playsInline = true;
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isTracking && audioContext) {
        if (leftOscillatorGainNode)
            leftOscillatorGainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.01);
        if (rightOscillatorGainNode)
            rightOscillatorGainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.01);
        if (leftSoundFontControl.handGainNode)
            leftSoundFontControl.handGainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.01);
        if (rightSoundFontControl.handGainNode)
            rightSoundFontControl.handGainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.01);
        isPathACustomSamplePlaying = false;
        isPathBCustomSamplePlaying = false;
        isPathAStandardBellPlaying = false;
        isPathBStandardBellPlaying = false;
        console.log("Page hidden, sound muted.");
    }
    else if (!document.hidden && isTracking && audioContext) {
        console.log("Page visible.");
    }
});
if (canvasElement) {
    const aspectRatio = 4 / 3;
    let initialWidth = 480;
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer)
        initialWidth = videoContainer.offsetWidth;
    else if (window.innerWidth < 500)
        initialWidth = window.innerWidth * 0.9;
    canvasElement.width = initialWidth;
    canvasElement.height = initialWidth / aspectRatio;
    const eqContainer = document.querySelector('.equalizer-container');
    if (eqContainer) {
        if (window.innerWidth < 600) {
            eqContainer.style.width = '95vw';
        }
        else {
            eqContainer.style.maxWidth = '500px';
            eqContainer.style.width = '90vw';
        }
    }
}
// Modal Logic
function openModal() {
    if (infoModal && modalTitleElement && thereminDescriptionDisplay && tapPadDescriptionDisplay && fingerKeysDescriptionDisplay) {
        thereminDescriptionDisplay.hidden = true;
        tapPadDescriptionDisplay.hidden = true;
        fingerKeysDescriptionDisplay.hidden = true;
        if (currentPlaybackMode === "theremin") {
            modalTitleElement.textContent = "Режим: Ручной терменвокс";
            thereminDescriptionDisplay.hidden = false;
        }
        else if (currentPlaybackMode === "tappad") {
            modalTitleElement.textContent = "Режим: Сенсорные пэды";
            tapPadDescriptionDisplay.hidden = false;
        }
        else if (currentPlaybackMode === "fingerkeys") {
            modalTitleElement.textContent = "Режим: Пальцевые клавиши";
            fingerKeysDescriptionDisplay.hidden = false;
        }
        infoModal.hidden = false;
        infoModal.setAttribute('aria-hidden', 'false');
        if (closeModalButton)
            closeModalButton.focus();
    }
}
function closeModal() {
    if (infoModal) {
        infoModal.hidden = true;
        infoModal.setAttribute('aria-hidden', 'true');
        if (infoButton)
            infoButton.focus();
    }
}
if (infoButton && infoModal && closeModalButton && modalTitleElement && thereminDescriptionDisplay && tapPadDescriptionDisplay && fingerKeysDescriptionDisplay) {
    infoButton.addEventListener('click', openModal);
    closeModalButton.addEventListener('click', closeModal);
    infoModal.addEventListener('click', (event) => {
        if (event.target === infoModal) {
            closeModal();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !infoModal.hidden) {
            closeModal();
        }
    });
}
else {
    console.error("One or more modal-related elements are missing from the DOM.");
}
// Finger Threshold Helper Functions
function updateThresholdDisplay(fingerKeyId) {
    const valueElement = document.getElementById(`${fingerKeyId.toLowerCase()}-threshold-value`);
    if (valueElement) {
        valueElement.textContent = `${fingerKeyThresholds[fingerKeyId]}%`;
    }
}
function adjustThreshold(fingerKeyId, increase) {
    let currentValue = fingerKeyThresholds[fingerKeyId];
    if (increase) {
        currentValue = Math.min(MAX_THRESHOLD, currentValue + THRESHOLD_STEP);
    }
    else {
        currentValue = Math.max(MIN_THRESHOLD, currentValue - THRESHOLD_STEP);
    }
    fingerKeyThresholds[fingerKeyId] = currentValue;
    updateThresholdDisplay(fingerKeyId);
    try {
        localStorage.setItem(LOCALSTORAGE_KEY_THRESHOLDS, JSON.stringify(fingerKeyThresholds));
    }
    catch (error) {
        console.error("Error saving thresholds to localStorage:", error);
    }
}
// Finger Mute Helper Functions
function updateMuteVisual(fingerKeyId) {
    const wrapperId = `${fingerKeyId.toLowerCase()}-bar-wrapper`;
    const wrapperElement = document.getElementById(wrapperId);
    if (wrapperElement) {
        if (fingerKeyMutedStates[fingerKeyId]) {
            wrapperElement.classList.add('finger-muted');
            wrapperElement.setAttribute('aria-pressed', 'true');
            wrapperElement.title = `Палец ${fingerKeyId} заглушен. Нажмите, чтобы включить.`;
        }
        else {
            wrapperElement.classList.remove('finger-muted');
            wrapperElement.setAttribute('aria-pressed', 'false');
            wrapperElement.title = `Палец ${fingerKeyId} активен. Нажмите, чтобы заглушить.`;
        }
    }
}
function toggleMuteState(fingerKeyId) {
    if (fingerKeyMutedStates.hasOwnProperty(fingerKeyId)) {
        fingerKeyMutedStates[fingerKeyId] = !fingerKeyMutedStates[fingerKeyId];
    }
    else {
        fingerKeyMutedStates[fingerKeyId] = true;
    }
    updateMuteVisual(fingerKeyId);
    try {
        localStorage.setItem(LOCALSTORAGE_KEY_MUTED_STATES, JSON.stringify(fingerKeyMutedStates));
    }
    catch (error) {
        console.error("Error saving muted states to localStorage:", error);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // Init custom sample name displays
    if (leftCustomSampleNameDisplay)
        leftCustomSampleNameDisplay.textContent = "Нет файла";
    if (rightCustomSampleNameDisplay)
        rightCustomSampleNameDisplay.textContent = "Нет файла";
    const savedThresholdsString = localStorage.getItem(LOCALSTORAGE_KEY_THRESHOLDS);
    let thresholdsLoadedSuccessfully = false;
    if (savedThresholdsString) {
        try {
            const loadedThresholds = JSON.parse(savedThresholdsString);
            if (typeof loadedThresholds === 'object' && loadedThresholds !== null) {
                let allKeysPresentAndValid = true;
                for (const key of ALL_FINGER_KEY_IDS) {
                    if (typeof loadedThresholds[key] !== 'number' || loadedThresholds[key] < MIN_THRESHOLD || loadedThresholds[key] > MAX_THRESHOLD) {
                        allKeysPresentAndValid = false;
                        break;
                    }
                }
                if (allKeysPresentAndValid) {
                    fingerKeyThresholds = loadedThresholds;
                    thresholdsLoadedSuccessfully = true;
                }
                else {
                    console.warn("Saved thresholds data is incomplete or invalid. Reverting to defaults.");
                }
            }
            else {
                console.warn("Saved thresholds format is invalid. Reverting to defaults.");
            }
        }
        catch (error) {
            console.error("Error parsing saved thresholds from localStorage. Reverting to defaults:", error);
        }
    }
    ALL_FINGER_KEY_IDS.forEach(fingerKeyId => {
        if (!thresholdsLoadedSuccessfully || typeof fingerKeyThresholds[fingerKeyId] !== 'number') {
            fingerKeyThresholds[fingerKeyId] = DEFAULT_INDIVIDUAL_FINGER_THRESHOLD;
        }
        updateThresholdDisplay(fingerKeyId);
    });
    if (!thresholdsLoadedSuccessfully) {
        try {
            localStorage.setItem(LOCALSTORAGE_KEY_THRESHOLDS, JSON.stringify(fingerKeyThresholds));
        }
        catch (error) {
            console.error("Error saving initial default thresholds to localStorage:", error);
        }
    }
    document.querySelectorAll('.threshold-adjust-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const target = event.currentTarget;
            const fingerKeyId = target.dataset.fingerKeyId;
            const action = target.dataset.action;
            if (fingerKeyId && action) {
                adjustThreshold(fingerKeyId, action === 'increase');
            }
        });
    });
    const savedMutedStatesString = localStorage.getItem(LOCALSTORAGE_KEY_MUTED_STATES);
    let mutedStatesLoadedSuccessfully = false;
    if (savedMutedStatesString) {
        try {
            const loadedMutedStates = JSON.parse(savedMutedStatesString);
            if (typeof loadedMutedStates === 'object' && loadedMutedStates !== null) {
                let allKeysPresentAndValid = true;
                for (const key of ALL_FINGER_KEY_IDS) {
                    if (typeof loadedMutedStates[key] !== 'boolean') {
                        allKeysPresentAndValid = false;
                        break;
                    }
                }
                if (allKeysPresentAndValid) {
                    fingerKeyMutedStates = loadedMutedStates;
                    mutedStatesLoadedSuccessfully = true;
                }
                else {
                    console.warn("Saved muted states data is incomplete or invalid. Reverting to defaults.");
                }
            }
            else {
                console.warn("Saved muted states format is invalid. Reverting to defaults.");
            }
        }
        catch (e) {
            console.error("Error parsing saved muted states. Reverting to defaults:", e);
        }
    }
    ALL_FINGER_KEY_IDS.forEach(fingerKeyId => {
        if (typeof fingerKeyMutedStates[fingerKeyId] !== 'boolean') {
            fingerKeyMutedStates[fingerKeyId] = false;
        }
        const wrapperId = `${fingerKeyId.toLowerCase()}-bar-wrapper`;
        const wrapperElement = document.getElementById(wrapperId);
        if (wrapperElement) {
            wrapperElement.addEventListener('click', (event) => {
                if (currentPlaybackMode === 'fingerkeys') {
                    const clickedElement = event.target;
                    if (clickedElement.closest('.finger-threshold-controls')) {
                        return;
                    }
                    toggleMuteState(fingerKeyId);
                }
            });
            wrapperElement.addEventListener('keydown', (event) => {
                if (currentPlaybackMode === 'fingerkeys' && (event.key === 'Enter' || event.key === ' ')) {
                    const activeElement = document.activeElement;
                    if (activeElement && activeElement.classList.contains('threshold-adjust-button') && wrapperElement.contains(activeElement)) {
                        return;
                    }
                    if (event.target === wrapperElement) {
                        event.preventDefault();
                        toggleMuteState(fingerKeyId);
                    }
                }
            });
        }
        updateMuteVisual(fingerKeyId);
    });
    if (!mutedStatesLoadedSuccessfully) {
        try {
            localStorage.setItem(LOCALSTORAGE_KEY_MUTED_STATES, JSON.stringify(fingerKeyMutedStates));
        }
        catch (e) {
            console.error("Error saving initial default muted states to localStorage:", e);
        }
    }
    const savedCustomPairsString = localStorage.getItem(LOCALSTORAGE_KEY_CUSTOM_PAIRS);
    let customPairsLoadedSuccessfully = false;
    if (savedCustomPairsString) {
        try {
            const loadedPairs = JSON.parse(savedCustomPairsString);
            if (typeof loadedPairs === 'object' && loadedPairs !== null) {
                let allKeysValid = true;
                for (const keyId of ALL_FINGER_KEY_IDS) {
                    const pair = loadedPairs[keyId];
                    if (!pair || !Array.isArray(pair) || pair.length !== 2 ||
                        typeof pair[0] !== 'number' || typeof pair[1] !== 'number' ||
                        pair[0] < 0 || pair[0] >= TOTAL_LANDMARKS ||
                        pair[1] < 0 || pair[1] >= TOTAL_LANDMARKS) {
                        allKeysValid = false;
                        break;
                    }
                }
                if (allKeysValid) {
                    userCustomLandmarkPairs = loadedPairs;
                    customPairsLoadedSuccessfully = true;
                }
                else {
                    console.warn("Saved custom landmark pairs data is incomplete or invalid. Reverting to defaults.");
                }
            }
            else {
                console.warn("Saved custom landmark pairs format is invalid. Reverting to defaults.");
            }
        }
        catch (e) {
            console.error("Error parsing custom landmark pairs. Reverting to defaults:", e);
        }
    }
    if (!customPairsLoadedSuccessfully) {
        userCustomLandmarkPairs = {};
        ALL_FINGER_KEY_IDS.forEach(keyId => {
            const fingerChar = keyId.substring(2);
            userCustomLandmarkPairs[keyId] = [WRIST, FINGER_TIPS_INDICES[fingerChar]];
        });
        try {
            localStorage.setItem(LOCALSTORAGE_KEY_CUSTOM_PAIRS, JSON.stringify(userCustomLandmarkPairs));
        }
        catch (e) {
            console.error("Error saving initial default custom pairs:", e);
        }
    }
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        for (let pointIndex = 0; pointIndex < 2; pointIndex++) {
            const selectElement = document.getElementById(`${keyId.toLowerCase()}-point${pointIndex + 1}-select`);
            if (selectElement) {
                for (let i = 0; i < TOTAL_LANDMARKS; i++) {
                    const option = document.createElement('option');
                    option.value = i.toString();
                    option.textContent = `Точка ${i + 1}`;
                    selectElement.appendChild(option);
                }
                const currentPair = userCustomLandmarkPairs[keyId];
                if (currentPair) {
                    selectElement.value = currentPair[pointIndex].toString();
                }
                selectElement.addEventListener('change', (event) => {
                    const changedSelect = event.target;
                    const fingerKey = changedSelect.dataset.fingerKeyId;
                    const pIndex = parseInt(changedSelect.dataset.pointIndex || "0", 10);
                    const newValue = parseInt(changedSelect.value, 10);
                    if (fingerKey && userCustomLandmarkPairs[fingerKey]) {
                        userCustomLandmarkPairs[fingerKey][pIndex] = newValue;
                        try {
                            localStorage.setItem(LOCALSTORAGE_KEY_CUSTOM_PAIRS, JSON.stringify(userCustomLandmarkPairs));
                        }
                        catch (e) {
                            console.error("Error saving custom pairs to localStorage:", e);
                        }
                    }
                });
            }
        }
    });
    const savedLeftInstrument = localStorage.getItem(LOCALSTORAGE_KEY_INSTRUMENT_CIRCLE);
    if (savedLeftInstrument && leftInstrumentSelect) {
        const optionExists = Array.from(leftInstrumentSelect.options).some(opt => opt.value === savedLeftInstrument);
        if (optionExists)
            leftInstrumentSelect.value = savedLeftInstrument;
        else
            console.warn(`Saved instrument "${savedLeftInstrument}" for circle hand not found in select options.`);
    }
    const savedRightInstrument = localStorage.getItem(LOCALSTORAGE_KEY_INSTRUMENT_TRIANGLE);
    if (savedRightInstrument && rightInstrumentSelect) {
        const optionExists = Array.from(rightInstrumentSelect.options).some(opt => opt.value === savedRightInstrument);
        if (optionExists)
            rightInstrumentSelect.value = savedRightInstrument;
        else
            console.warn(`Saved instrument "${savedRightInstrument}" for triangle hand not found in select options.`);
    }
    const savedPlaybackMode = localStorage.getItem(LOCALSTORAGE_KEY_PLAYBACK_MODE);
    if (savedPlaybackMode) {
        const radioElement = document.getElementById(`mode-${savedPlaybackMode}`);
        if (radioElement) {
            radioElement.checked = true;
            currentPlaybackMode = savedPlaybackMode;
        }
        else {
            console.warn(`Saved playback mode "${savedPlaybackMode}" not found. Reverting to default.`);
            try {
                localStorage.setItem(LOCALSTORAGE_KEY_PLAYBACK_MODE, currentPlaybackMode);
            }
            catch (e) {
                console.error("Error saving default playback mode to localStorage:", e);
            }
        }
    }
    updatePlaybackModeVisuals();
    const savedDistanceMode = localStorage.getItem(LOCALSTORAGE_KEY_DISTANCE_MODE);
    if (savedDistanceMode) {
        const radioIdSuffix = savedDistanceMode.replace(/_/g, '-');
        const radioElement = document.getElementById(`mode-dist-${radioIdSuffix}`);
        if (radioElement) {
            radioElement.checked = true;
            currentDistanceMode = savedDistanceMode;
        }
        else {
            console.warn(`Saved distance mode "${savedDistanceMode}" (ID: mode-dist-${radioIdSuffix}) not found. Reverting to default.`);
            try {
                localStorage.setItem(LOCALSTORAGE_KEY_DISTANCE_MODE, currentDistanceMode);
            }
            catch (e) {
                console.error("Error saving default distance mode to localStorage:", e);
            }
        }
    }
    updateCustomPairsUIConfigVisibility();
    const initialDisabledState = !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia;
    setAppControlsDisabled(initialDisabledState);
    if (initialDisabledState) {
        statusMessage.textContent = 'Ваш браузер не поддерживает доступ к камере (getUserMedia). Пожалуйста, используйте современный браузер.';
    }
    else {
        statusMessage.textContent = 'Нажмите "Начать музыку" для старта.';
    }
    updateCustomPairsUIConfigVisibility();
    ALL_FINGER_KEY_IDS.forEach(keyId => {
        const handPrefix = keyId.startsWith('L') ? 'left' : 'right';
        const fingerLabel = keyId.substring(2);
        const valueDisplay = document.getElementById(`${handPrefix}-finger-${fingerLabel.toLowerCase()}-bar-value`);
        if (valueDisplay)
            valueDisplay.textContent = '0%';
    });
});
console.log('Hand Music App initialized. Waiting for user interaction.');
