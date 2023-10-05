var audioFile;
var meydaAnalyzer;

// controls
var playButton;
var pauseButton;
var stopButton;

function preload() {
  soundFormats('mp3', 'wav');
  audioFile = loadSound('sounds/Kalte_Ohren_(_Remix_).mp3');
}

function setup() {
  createCanvas(800, 400);

  setupButtons();
  setupMeyda();
}

function draw() {
  background(0);

  if (audioFile.isPlaying()) {
    meydaAnalyzer.start();
  } else {
    meydaAnalyzer.stop();
  }
}

function setupButtons() {
  playButton = createButton('play');
  playButton.position(20, 20);
  playButton.mousePressed(playAudio);

  pauseButton = createButton('pause');
  pauseButton.position(70, 20);
  pauseButton.mousePressed(pauseAudio);

  stopButton = createButton('stop');
  stopButton.position(130, 20);
  stopButton.mousePressed(stopAudio);
}

function setupMeyda() {
  meydaAnalyzer = Meyda.createMeydaAnalyzer({
    audioContext: getAudioContext(),
    source: audioFile,
    bufferSize: 512,
    featureExtractors: ['rms', 'spectralCentroid', 'zcr', 'spectralFlatness'],
    callback: (features) => {
      let rms = features.rms;
      let centroid = features.spectralCentroid;
      let zcr = features.zcr;
      let flatness = features.spectralFlatness;

      // 1. number of rectangles based on ZCR
      let numRects = int(map(zcr, 0, 30, 1, 10));

      // 2. size of rectangles based on RMS
      let rectWidth = map(rms, 0, 1, 300, 1000);
      let rectHeight = map(rms, 0, 1, 300, 1000);

      // 3. colour of rectangles based on spectral centroid
      let hueValue = map(centroid, 0, 5000, 0, 255);
      let saturationValue = map(zcr, 0, 30, 100, 255);
      let brightnessValue = map(flatness, 0, 1, 100, 255);

      // 4. opacity of rectangles based on RMS
      let alphaValue = map(rms, 0, 1, 50, 255);

      // 5. Rectangle border size, color & opacity
      let borderSize = map(rms, 0, 1, 1, 8);
      let borderColor = color((hueValue + 180) % 255, 255, 255);
      let borderOpacity = map(flatness, 0, 1, 50, 255);

      // 6. rotation angle based on spectral centroid
      let rotationAngle = map(centroid, 0, 5000, 0, TWO_PI);

      colorMode(HSB);
      fill(hueValue, saturationValue, brightnessValue, alphaValue);
      stroke(
        borderColor.levels[0],
        borderColor.levels[1],
        borderColor.levels[2],
        borderOpacity
      );
      strokeWeight(borderSize);

      for (let i = 0; i < numRects; i++) {
        let xOffset = random(-width / 4, width / 4);
        let yOffset = random(-height / 4, height / 4);
        push();
        translate(width / 2 + xOffset, height / 2 + yOffset);
        rotate(rotationAngle);
        rect(0, 0, rectWidth, rectHeight);
        pop();
      }
    },
  });
}

function playAudio() {
  if (!audioFile.isPlaying()) {
    audioFile.play();
  }
}

function pauseAudio() {
  if (audioFile.isPlaying()) {
    audioFile.pause();
  }
}

function stopAudio() {
  if (audioFile.isPlaying()) {
    audioFile.stop();
  }
}
