let audioFile;
let meydaAnalyzer;
let backgroundCol = 0;

// shapes params and type
let shapes = [];
let shapeType = "rectangle";

// playback controls
let playButton, stopButton;
let volumeSlider;

// fft spectrum
let fft;
let fftGradientA, fftGradientB;

// speech recognition
let voiceInput;

function preload() {
    soundFormats("mp3");
    audioFile = loadSound("sounds/Kalte_Ohren_(_Remix_).mp3");
}

function setup() {
    createCanvas(1200, 800);
    colorMode(HSB);
    fftGradientA = color(0);
    fftGradientB = color(0);

    // setup speech recognition
    voiceInput = new p5.SpeechRec("en-UK", handleSpeech);
    voiceInput.continuous = true;
    voiceInput.interimResults = true;
    voiceInput.start();

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
    background(backgroundCol);
    drawSpeechCommands();

    // start meyda analyzer only if audio is playing
    audioFile.isPlaying() ? meydaAnalyzer.start() : meydaAnalyzer.stop();

    // draw volume slider
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

    // draw shapes based on the params
    shapes.forEach((param) => {
        push();
        translate(param.x, param.y);
        rotate(param.rotation);
        fill(param.fillColor);
        stroke(param.borderColor);
        strokeWeight(param.borderSize);

        // draw mix of shapes if shapeType is "mix"
        if (shapeType === "mix") {
            // map position to random number between 0 and 1
            let mixRand = map(param.x + param.y, 0, width + height, 0, 1, true);

            // draw random shape based on mapped value
            if (mixRand < 0.25) {
                drawShape("rectangle", param);
            } else if (mixRand < 0.5) {
                drawShape("circle", param);
            } else if (mixRand < 0.75) {
                drawShape("triangle", param);
            } else {
                drawShape("pentagon", param);
            }
        }
        // draw circle, triangle, pentagon or square
        else {
            drawShape(shapeType, param);
        }

        pop();
    });
}

/** draw different shapes */
function drawShape(type, param) {
    switch (type) {
        case "rectangle":
            rectMode(CENTER);
            rect(0, 0, param.size, param.size);
            break;
        case "circle":
            ellipse(0, 0, param.size, param.size);
            break;
        case "triangle":
            triangle(
                -param.size / 2,
                param.size / 2,
                param.size / 2,
                param.size / 2,
                0,
                -param.size / 2
            );
            break;
        case "pentagon":
            beginShape();
            for (let i = 0; i < 5; i++) {
                let angle = (TWO_PI / 5) * i - HALF_PI; // Subtract HALF_PI to rotate the pentagon
                let x = (param.size * cos(angle)) / 2;
                let y = (param.size * sin(angle)) / 2;
                vertex(x, y);
            }
            endShape(CLOSE);
            break;
        default:
            rectMode(CENTER);
            rect(0, 0, param.size, param.size);
    }
}

/** update params of shapes based on audio features */
function updateVisuals(features) {
    // audio features
    let loudness = features.loudness.total;
    let rms = features.rms;
    let chromaIndex = features.chroma.indexOf(Math.max(...features.chroma));
    let spectralCentroid = features.spectralCentroid;
    let spectralRolloff = features.spectralRolloff;
    let energy = features.energy;
    let sharpness = features.perceptualSharpness;

    // map audio features to different parameters //

    // number of shapes
    let shapeCount = map(loudness, 0, 100, 0, 10);
    shapes = shapes.slice(0, shapeCount);

    // size of shape
    let shapeSize = map(rms, 0, 1, 50, 250);

    // color of shape
    let fillColor = color(map(chromaIndex, 0, 11, 0, 360), 100, 100);
    fillColor.setAlpha(map(energy, 0, 1, 80, 255));

    // border of shape
    let borderSize = map(spectralCentroid, 2000, 5000, 2, 10);
    let borderColorValue = map(spectralRolloff, 0, 22050, 0, 255);
    let borderColor = color(borderColorValue, 100, 255 - borderColorValue);
    borderColor.setAlpha(map(sharpness, 0, 1, 100, 255));

    // rotation of shape
    let rotation = map(rms, 0, 1, 0, PI / 4);

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

    // store params based on the mapped values
    for (let i = 0; i < shapeCount; i++) {
        // add new shape's params
        if (!shapes[i]) {
            let maxX = width - 50;
            let maxY = height - 50;
            shapes[i] = {
                // x: map(spectralCentroid, 0, 2000, 50, maxX),
                // y: map(energy, 0, 1, 50, maxY),
                x: random(50, width - 40),
                y: random(50, height - 40),
                size: shapeSize,
                fillColor: fillColor,
                borderColor: borderColor,
                borderSize: borderSize,
                rotation: rotation,
            };
        }
        // update existing params
        else {
            shapes[i].size = shapeSize;
            shapes[i].fillColor = fillColor;
            shapes[i].borderColor = borderColor;
            shapes[i].borderSize = borderSize;
            shapes[i].rotation += rotation;
        }
    }
}

/** setup the playback control buttons */
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

/** play or pause the audio */
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

/** stop the audio */
function stopAudio() {
    if (audioFile.isPlaying()) {
        // stop audio
        audioFile.stop();
        playButton.style("background-color", "#17ad1c");
        playButton.html("PLAY");
    }
}

/** update relevant params based on speech command given */
function handleSpeech() {
    if (voiceInput.resultValue) {
        // get speech input
        let speech = voiceInput.resultString;
        speech = speech.toLowerCase();
        console.log(speech);

        // set audio status based on speech input
        if (speech.includes("pause") || speech.includes("resume")) {
            playAudio();
        } else if (speech.includes("stop")) {
            stopAudio();
        }

        // set shape type based on speech input
        else if (speech.includes("rectangle") || speech.includes("square")) {
            shapeType = "rectangle";
        } else if (speech.includes("circle")) {
            shapeType = "circle";
        } else if (speech.includes("triangle")) {
            shapeType = "triangle";
        } else if (speech.includes("pentagon")) {
            shapeType = "pentagon";
        } else if (speech.includes("mix")) {
            shapeType = "mix";
        }

        // set background color based on speech input
        else if (speech.includes("red")) {
            backgroundCol = color(0, 100, 100);
        } else if (speech.includes("green")) {
            backgroundCol = color(120, 100, 100);
        } else if (speech.includes("blue")) {
            backgroundCol = color(240, 100, 100);
        } else if (speech.includes("yellow")) {
            backgroundCol = color(60, 100, 100);
        } else if (speech.includes("white")) {
            backgroundCol = color(0, 0, 100);
        } else if (speech.includes("black")) {
            backgroundCol = color(0, 0, 0);
        }
    }
}

/** draws text to show the available speech commands */
function drawSpeechCommands() {
    push();

    // background box
    fill(0, 0, 0, 100);
    rectMode(CORNER);
    rect(940, 0, 260, 140);

    // commands
    fill(255);
    textSize(15);
    text("SPEECH COMMANDS:", 945, 20);
    textSize(14);

    // playback commands
    text("• PLAYBACK: Pause, Resume, Stop", 945, 40);

    // shape commands
    text("• SHAPES: Square, Rectangle, Circle", 945, 60);
    text("Triangle, Pentagon, Mix", 1010, 78);

    // background color commands
    text("• BACKGROUND: Black, White, Red", 945, 98);
    text("Green, Blue, Yellow", 1060, 116);

    pop();
}
