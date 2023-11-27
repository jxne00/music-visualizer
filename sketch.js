let audioFile;
let meydaAnalyzer;

let rectangles = [];
let maxShapes = 8;
let backgroundCol;
let shapeType = "rectangle";

// playback controls
let playButton, stopButton;
let volumeSlider;

let fft;
let fftGradientA, fftGradientB;

// speech recognition
let speechRec;

function preload() {
    soundFormats("mp3", "wav");
    audioFile = loadSound("sounds/Kalte_Ohren_(_Remix_).mp3");
}

function setup() {
    createCanvas(1000, 750);
    colorMode(HSB);
    fftGradientA = color(0);
    fftGradientB = color(0);

    // setup speech recognition
    speechRec = new p5.SpeechRec("en-UK", handleSpeech);
    speechRec.continuous = true;
    speechRec.interimResults = true;
    speechRec.start();

    // setup playback controls
    setupButtons();

    // setup spectrum analyzer
    fft = new p5.FFT();

    // setup meyda analyzer
    if (typeof Meyda === "undefined") {
        console.log("Meyda not found");
    } else {
        meydaAnalyzer = Meyda.createMeydaAnalyzer({
            audioContext: getAudioContext(),
            source: audioFile,
            bufferSize: 512,
            featureExtractors: [
                "loudness",
                "rms",
                "energy",
                "chroma",
                "spectralCentroid",
                "spectralRolloff",
                "perceptualSharpness",
            ],
            callback: (features) => updateVisuals(features),
        });
    }
}

function draw() {
    // start meyda analyzer only if audio is playing
    audioFile.isPlaying() ? meydaAnalyzer.start() : meydaAnalyzer.stop();

    // draw volume slider
    background(0);
    audioFile.setVolume(volumeSlider.value());
    fill(255);
    textSize(18);
    text("🔊 " + Math.round(volumeSlider.value() * 100), 470, 35);

    // draw spectrum
    let spectrum = fft.analyze();
    push();
    noStroke();
    rectMode(CORNER);
    for (let i = 1; i < spectrum.length; i++) {
        let amplitude = spectrum[i];
        let x = map(i, 0, spectrum.length, 0, width);
        let h = map(amplitude, 0, 255, 0, height);
        let c = lerpColor(fftGradientA, fftGradientB, i / spectrum.length);
        fill(c);
        rect(x, height - h, width / spectrum.length, h);
    }
    pop();

    // draw the rectangles
    if (shapeType === "rectangle") {
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
    } else if (shapeType === "circle") {
        rectangles.forEach((myrect) => {
            push();
            translate(myrect.x, myrect.y);
            rotate(myrect.rotation);
            fill(myrect.fillColor);
            stroke(myrect.borderColor);
            strokeWeight(myrect.borderSize);
            ellipse(0, 0, myrect.size, myrect.size);
            pop();
        });
    } else if (shapeType === "triangle") {
        rectangles.forEach((myrect) => {
            push();
            translate(myrect.x, myrect.y);
            rotate(myrect.rotation);
            fill(myrect.fillColor);
            stroke(myrect.borderColor);
            strokeWeight(myrect.borderSize);
            triangle(
                -myrect.size / 2,
                myrect.size / 2,
                myrect.size / 2,
                myrect.size / 2,
                0,
                -myrect.size / 2
            );
            pop();
        });
    }
}

function updateVisuals(features) {
    // audio features
    let loudness = features.loudness.total;
    let rms = features.rms;
    let chromaIndex = features.chroma.indexOf(Math.max(...features.chroma));
    let spectralCentroid = features.spectralCentroid;
    let spectralRolloff = features.spectralRolloff;
    let energy = features.energy;
    let sharpness = features.perceptualSharpness;

    // map audio features to different parameters
    let rectCount = map(loudness, 0, 100, 0, maxShapes);
    let rectSize = map(rms, 0, 1, 50, 250);
    let fillColor = color(map(chromaIndex, 0, 11, 0, 360), 100, 100);
    let borderSize = map(spectralCentroid, 2000, 5000, 2, 10);
    let borderColorValue = map(spectralRolloff, 0, 22050, 0, 255);
    let borderColor = color(borderColorValue, 100, 255 - borderColorValue);
    let rotation = map(rms, 0, 1, 0, PI / 4);

    rectangles = rectangles.slice(0, rectCount);
    fillColor.setAlpha(map(energy, 0, 1, 80, 255));
    borderColor.setAlpha(map(sharpness, 0, 1, 100, 255));

    // map audio features to fft gradient colors
    let saturation = map(spectralRolloff, 0, 22050, 60, 100);
    fftGradientA = color(
        map(spectralCentroid, 2000, 5000, 240, 290),
        saturation,
        80
    );
    fftGradientB = color(
        map(spectralCentroid, 2000, 5000, 0, 30),
        saturation,
        80
    );

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
}

function setupButtons() {
    playButton = createButton("PLAY");
    playButton.position(20, 20);
    playButton.size(100, 30);
    playButton.addClass("button");
    playButton.style("background-color", "#17ad1c");
    playButton.mousePressed(playAudio);

    stopButton = createButton("STOP");
    stopButton.position(130, 20);
    stopButton.size(100, 30);
    stopButton.addClass("button");
    stopButton.style("background-color", "#a31515");
    stopButton.mousePressed(stopAudio);

    volumeSlider = createSlider(0, 1, 1, 0.01);
    volumeSlider.position(260, 20);
    volumeSlider.size(200, 25);
    volumeSlider.addClass("slider");
}

function playAudio() {
    if (!audioFile.isPlaying()) {
        // play audio
        audioFile.play();
        playButton.style("background-color", "#d96e04");
        playButton.html("PAUSE");
    } else if (audioFile.isPlaying()) {
        // pause audio
        audioFile.pause();
        playButton.style("background-color", "#6db322");
        playButton.html("RESUME");
    }
}

function stopAudio() {
    if (audioFile.isPlaying()) {
        audioFile.stop();
        playButton.style("background-color", "#17ad1c");
        playButton.html("PLAY");
    }
}

// set shape using speech recognition
function handleSpeech() {
    if (speechRec.resultValue) {
        let speech = speechRec.resultString;
        speech = speech.toLowerCase();
        console.log(speech);

        if (
            speech.includes("play") ||
            speech.includes("pause") ||
            speech.includes("resume")
        ) {
            playAudio();
        } else if (speech.includes("stop")) {
            stopAudio();
        } else if (speech.includes("rectangle") || speech.includes("square")) {
            shapeType = "rectangle";
        } else if (speech.includes("circle")) {
            shapeType = "circle";
        } else if (speech.includes("triangle")) {
            shapeType = "triangle";
        }
    }
}
