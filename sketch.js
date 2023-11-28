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
        let h = map(amplitude, 0, 255, 0, height / 2);
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
            let mixRand = map(param.x, 0, width, 0, 1);

            // draw random shape based on mapped value
            if (mixRand < 0.2) {
                drawShape("rectangle", param);
            } else if (mixRand < 0.4) {
                drawShape("square", param);
            } else if (mixRand < 0.6) {
                drawShape("circle", param);
            } else if (mixRand < 0.8) {
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
            rect(0, 0, param.size * 1.7, param.size);
            break;
        case "square":
            rectMode(CENTER);
            rect(0, 0, param.size);
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

    // map loudness to number of shapes
    let shapeCount = map(loudness, 0, 100, 3, 15);
    shapes = shapes.slice(0, Math.round(shapeCount));

    // map rms to rotation
    let rotation = map(rms, 0, 1, 0, PI / 8);

    // map audio features to fft gradient colors
    let saturation = map(spectralRolloff, 0, 22050, 60, 100);
    fftGradientA = color(map(spectralCentroid, 0, 100, 0, 30), saturation, 80);
    fftGradientB = color(
        map(spectralCentroid, 0, 100, 240, 290),
        saturation,
        80
    );

    // base and increment of hue so that each shape has different hue
    let hueIncrement = shapeCount > 1 ? 360 / shapeCount : 0;
    let baseHue = chromaIndex * 30;

    // store params based on the mapped values
    for (let i = 0; i < shapeCount; i++) {
        let shapeSize;

        // set shape color
        let hueVal = (baseHue + i * hueIncrement) % 360;
        let saturationVal = map(spectralCentroid, 0, 100, 50, 100);
        let brightnessVal = map(loudness, 0, 100, 60, 100);
        let alphaVal = map(energy, 0, 1, 100, 255);
        let fillColor = color(hueVal, saturationVal, brightnessVal, alphaVal);

        // set border size and color
        let borderSize = map(spectralCentroid, 0, 100, 2, 5);
        let borderHue = map(spectralRolloff, 0, 22050, 0, random(360));
        let borderColor = color(borderHue, 100, brightnessVal, alphaVal);

        let x, y;
        if (i < 4) {
            // map to different max sizes for variation in size
            let maxSizes = [200, 80, 150, 210];
            shapeSize = map(spectralCentroid, 0, 100, 120, maxSizes[i]);

            // position first 4 shapes in middle of canvas
            x = width / 4 + i * (shapeSize + 70);
            y = height / 2 - shapeSize / 2;
        } else {
            // set smaller shape sizes
            shapeSize = map(spectralCentroid, 0, 100, 5, 25);

            // position remaining shapes randomly above and below the middle
            x = random(width);
            y = random(20, 150);

            // use grey colors for fill and border color
            brightnessVal = map(spectralCentroid, 0, 100, 50, 100);
            saturationVal = map(spectralCentroid, 0, 100, 0, 20);
            fillColor = color(0, saturationVal, brightnessVal);
            borderColor = fillColor;
        }

        // add new shape's params
        if (!shapes[i]) {
            shapes[i] = {
                x: x,
                y: y,
                size: shapeSize,
                fillColor: fillColor,
                borderColor: borderColor,
                borderSize: borderSize,
                rotation: rotation,
            };
        }
        // update existing params
        else {
            // only update alpha value of fill color
            shapes[i].x = x;
            shapes[i].y = y;
            shapes[i].fillColor = fillColor;
            shapes[i].size = shapeSize;
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

/** update relevant params based on speech command */
function handleSpeech() {
    if (voiceInput.resultValue) {
        // map shape to command
        let shapeMap = {
            rectangle: "rectangle",
            square: "square",
            circle: "circle",
            triangle: "triangle",
            pentagon: "pentagon",
            mix: "mix",
        };

        // map color to command
        let colorMap = {
            red: color(0, 100, 100),
            green: color(120, 100, 100),
            blue: color(240, 100, 100),
            yellow: color(60, 100, 100),
            white: color(0, 0, 100),
            black: color(0, 0, 0),
        };

        // get input from speech
        let speech = voiceInput.resultString;
        speech = speech.toLowerCase();
        console.log(speech);

        // update shape type if command matches
        for (let shape in shapeMap) {
            if (speech.includes(shape)) {
                shapeType = shapeMap[shape];
            }
        }

        // update background color if command matches
        for (let color in colorMap) {
            if (speech.includes(color)) {
                backgroundCol = colorMap[color];
            }
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

    // shape commands
    text("• SHAPES: Square, Rectangle, Circle", 945, 40);
    text("Triangle, Pentagon, Mix", 1010, 58);

    // background color commands
    text("• BACKGROUND: Black, White, Red", 945, 78);
    text("Green, Blue, Yellow", 1060, 96);

    pop();
}
