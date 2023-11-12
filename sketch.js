let audioFile;
let meydaAnalyzer;

let rectangles = [];
let maxRectangles = 8;
let backgroundCol;

// playback controls
let playButton, stopButton;
let volumeSlider;

function preload() {
  soundFormats('mp3', 'wav');
  audioFile = loadSound('sounds/Kalte_Ohren_(_Remix_).mp3');
}

function setup() {
  createCanvas(900, 700);
  colorMode(HSB, 360, 100, 100);
  backgroundCol = color(255);

  setupButtons();

  if (typeof Meyda === 'undefined') {
    console.log('Meyda not found');
  } else {
    meydaAnalyzer = Meyda.createMeydaAnalyzer({
      audioContext: getAudioContext(),
      source: audioFile,
      bufferSize: 512,
      featureExtractors: [
        'loudness',
        'rms',
        'chroma',
        'spectralCentroid',
        'spectralRolloff',
        'energy',
        'perceptualSharpness',
        'mfcc',
      ],
      callback: (features) => updateVisuals(features),
    });
  }
}

function draw() {
  if (audioFile.isPlaying()) {
    meydaAnalyzer.start();
  } else {
    meydaAnalyzer.stop();
  }

  // background(backgroundCol);
  background(0);

  rectangles.forEach((myrect) => {
    push();
    translate(myrect.x, myrect.y);
    rotate(myrect.rotation);
    fill(myrect.fillColor);
    stroke(myrect.borderColor);
    strokeWeight(myrect.borderSize);
    rectMode(CENTER);
    rect(0, 0, myrect.size, myrect.size);
    pop();
  });
}

function updateVisuals(features) {
  let loudness = features.loudness.total;
  let rms = features.rms;
  let chromaIndex = features.chroma.indexOf(Math.max(...features.chroma));
  let spectralCentroid = features.spectralCentroid;
  let spectralRolloff = features.spectralRolloff;
  let energy = features.energy;
  let sharpness = features.perceptualSharpness;

  // Map loudness to the number of rectangles
  let rectCount = map(loudness, 0, 100, 0, maxRectangles);

  // Adjust rectangles array based on loudness
  rectangles = rectangles.slice(0, rectCount);

  // Map rms to rectangle size
  let rectSize = map(rms, 0, 1, 50, 250);

  // Map chroma to rectangle fill color hue
  let fillColor = color(map(chromaIndex, 0, 11, 0, 360), 100, 100);

  // Map energy to rectangle fill color opacity
  fillColor.setAlpha(map(energy, 0, 1, 80, 255));

  // Map spectralCentroid to rectangle border size
  let borderSize = map(spectralCentroid, 2000, 5000, 2, 10);

  // Map spectralRolloff to rectangle border color
  let borderColorValue = map(spectralRolloff, 0, 22050, 0, 255);
  let borderColor = color(borderColorValue, 100, 255 - borderColorValue);

  // Map perceptualSharpness to rectangle border opacity
  borderColor.setAlpha(map(sharpness, 0, 1, 100, 255));

  // Map rms to rectangle rotation
  let rotation = map(rms, 0, 1, 0, PI / 4);

  // set params for each rectangle
  for (let i = 0; i < rectCount; i++) {
    if (!rectangles[i]) {
      rectangles[i] = {
        x: random(50, width - 40),
        y: random(50, height - 40),
        size: rectSize,
        fillColor: fillColor,
        borderColor: borderColor,
        borderSize: borderSize,
        rotation: rotation,
      };
    } else {
      rectangles[i].size = rectSize;
      rectangles[i].fillColor = fillColor;
      rectangles[i].borderColor = borderColor;
      rectangles[i].borderSize = borderSize;
      rectangles[i].rotation += rotation;
    }
  }

  // Map MFCCs to background color
  let mfcc = features.mfcc;
  let mfccAvg = mfcc.reduce((a, b) => a + b) / mfcc.length;
  backgroundCol = color(mfccAvg * 255);
}

function setupButtons() {
  playButton = createButton('play');
  playButton.position(20, 20);
  playButton.size(80, 30);
  playButton.addClass('button');
  playButton.style('background-color', '#409b55');
  playButton.mousePressed(playAudio);

  stopButton = createButton('stop');
  stopButton.position(110, 20);
  stopButton.size(80, 30);
  stopButton.addClass('button');
  stopButton.style('background-color', '#c25d5d');
  stopButton.mousePressed(stopAudio);

  // TODO adjust volume with slider
  volumeSlider = createSlider(0, 1, 0.5, 0.01);
  volumeSlider.position(200, 20);
  volumeSlider.size(200, 30);
  volumeSlider.addClass('slider');
}

function playAudio() {
  if (!audioFile.isPlaying()) {
    // play audio
    audioFile.play();
    playButton.style('background-color', 'orange');
    playButton.html('pause');
  } else if (audioFile.isPlaying()) {
    // pause audio
    audioFile.pause();
    playButton.style('background-color', '#409b55');
    playButton.html('play');
  }
}

function stopAudio() {
  if (audioFile.isPlaying()) {
    audioFile.stop();
  }
}
