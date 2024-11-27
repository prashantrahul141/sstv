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

let imageData: Uint8ClampedArray;

/**
 * Ready image data.
 */
const readyImageData = () => {
  console.log("READING IMAGE DATA.");
  const sourceimage = document.getElementById("img") as HTMLImageElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  canvas.height = canvas.width = 0;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;

  const imgwidth = sourceimage.offsetWidth;
  const imgheight = sourceimage.offsetHeight;
  canvas.width = 320;
  canvas.height = 256;
  context.drawImage(
    sourceimage,
    0,
    0,
    imgwidth,
    imgheight,
    0,
    0,
    IMG_WIDTH,
    IMG_HEIGHT
  );

  imageData = context.getImageData(0, 0, IMG_WIDTH, IMG_HEIGHT).data;
  console.log("IMAGE DATA IS READY.");
};

window.onload = () => {
  readyImageData();
};

// const convertPixelToHz = (alpha: number) => {
//   return alpha * COLOR_FREQ_MULT + 1500;
// };

const convertPixelToHz = (alpha: number) => {
  return (alpha / 255) * 800 + 1500; // Map [0, 255] to [1500, 2300]
};

function startTransmission() {
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
      const pixelStart = (row * IMG_WIDTH + col) * 4; // Direct index calculation
      const red = imageData[pixelStart];
      const green = imageData[pixelStart + 1];
      const blue = imageData[pixelStart + 2];

      // Convert each pixel color to frequency and set value
      oscillator.frequency.setValueAtTime(convertPixelToHz(red), endTime);
      endTime += 0.0007344;

      oscillator.frequency.setValueAtTime(convertPixelToHz(green), endTime);
      endTime += 0.0007344;

      oscillator.frequency.setValueAtTime(convertPixelToHz(blue), endTime);
      endTime += 0.0007344;
    }
  }

  console.log("sounding");
  oscillator.start(startTime);
  oscillator.stop(endTime);
  console.log("finished sounding.");
}
