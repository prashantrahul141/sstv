"use strict";
const sourceImage = document.getElementById("img");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const input = document.getElementById("input");
const MODE = "WRASSE SC2-180";
const VIS_CODE = 0x55d; //1373 , 0110111
const NUMBER_OF_LINES = 256;
const TRANSMISSION_TIME = 182; // seconds
const COLOR_SCAN_TIME = 235.0; // ms (.7344ms/pixel @ 320 pixels/line)
const IMG_WIDTH = 320;
const IMG_HEIGHT = 256;
const COLOR_FREQ_MULT = 3.1372549;
// Header for WRASSE SC2-180
const Header = [
    [1900, 0.3], // leader
    [1200, 0.01], // break
    [1900, 0.3], // leader
    [1200, 0.3], // VIS start
    // VIS Code: 1300 for 0, 1100 for 1
    [1300, 0.3], // 0
    [1100, 0.3], // 1
    [1100, 0.3], // 1
    [1300, 0.3], // 0
    [1100, 0.3], // 1
    [1100, 0.3], // 1
    [1100, 0.3], // 1
    // parity.
    // N(1's) in VIS code: 5 (odd)
    // freq: 1100 (odd), 1300 (even)
    [1100, 0.3],
    // VIS STOP.
    [1200, 0.3],
];
let imageData;
/**
 * Ready image data.
 */
const readyImageData = () => {
    console.log("READING IMAGE DATA.");
    canvas.width = 320;
    canvas.height = 256;
    context.drawImage(sourceImage, 0, 0, sourceImage.naturalWidth, sourceImage.naturalHeight, 0, 0, sourceImage.width, sourceImage.height);
    imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    console.log("IMAGE DATA IS READY.");
};
function onImageChange() {
    if (!(input === null || input === void 0 ? void 0 : input.files)) {
        return;
    }
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        sourceImage.onload = readyImageData;
        reader.onload = (e) => {
            console.log("done loading", e);
            // @ts-ignore
            sourceImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    else {
        sourceImage.src = "";
    }
}
window.onload = () => {
    input.addEventListener("change", onImageChange);
};
const convertPixelToHz = (alpha) => {
    return (alpha / 255) * 800 + 1500; // Map [0, 255] to [1500, 2300]
};
function startTransmission() {
    if (!imageData) {
        alert("Select an image first.");
        return;
    }
    const audioCtx = new window.AudioContext();
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    oscillator.type = "square";
    oscillator.connect(audioCtx.destination);
    const startTime = audioCtx.currentTime + 1;
    let endTime = audioCtx.currentTime + 1;
    console.log("adding header.");
    for (const p of Header) {
        oscillator.frequency.setValueAtTime(p[0], endTime);
        endTime += p[1];
    }
    const syncPulse = [1200, 0.0055225];
    const porchPulse = [1500, 0.0005];
    console.log("adding rows.");
    for (let row = 0; row < IMG_HEIGHT; row++) {
        console.log(`row: ${row}`);
        oscillator.frequency.setValueAtTime(syncPulse[0], endTime);
        endTime += syncPulse[1];
        oscillator.frequency.setValueAtTime(porchPulse[0], endTime);
        endTime += porchPulse[1];
        for (let col = 0; col < IMG_WIDTH; col++) {
            const pixelStart = (row * IMG_WIDTH + col) * 4;
            oscillator.frequency.setValueAtTime(convertPixelToHz(imageData[pixelStart]), endTime);
            endTime += 0.0007344;
        }
        for (let col = 0; col < IMG_WIDTH; col++) {
            const pixelStart = (row * IMG_WIDTH + col) * 4;
            oscillator.frequency.setValueAtTime(convertPixelToHz(imageData[pixelStart + 1]), endTime);
            endTime += 0.0007344;
        }
        for (let col = 0; col < IMG_WIDTH; col++) {
            const pixelStart = (row * IMG_WIDTH + col) * 4;
            oscillator.frequency.setValueAtTime(convertPixelToHz(imageData[pixelStart + 2]), endTime);
            endTime += 0.0007344;
        }
    }
    console.log("sounding");
    oscillator.start(startTime);
    oscillator.stop(endTime);
    console.log("finished sounding.");
}