// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    var canvas, context, stage;
    var bgImage, p1Image, p2Image, ammoImage, p1Lives, p2Lives, title, endGameImage;
    var bgBitmap, p1Bitmap, p2Bitmap, ammoBitmap;
    var preload;

    var SCALE_X = window.innerWidth / 800;
    var SCALE_Y = window.innerHeight / 480
    var MARGIN = 25;
    var GROUND_Y = 390 * SCALE_Y;

    var LIVES_PER_PLAYER = 3;
    var player1Lives = LIVES_PER_PLAYER;
    var player2Lives = LIVES_PER_PLAYER;

    var isShotFlying = false;
    var playerTurn = 1;
    var playerFire = false;
    var shotVelocity;

    var MAX_SHOT_POWER = 10;
    var GRAVITY = 0.07;

    var isAiming = false;
    var aimPower = 1;
    var aimStart, aimVector;

    var FIRE_SOUND_FILE = "/sounds/CatapultFire.wav";
    var HIT_SOUND_FILE = "/sounds/BoulderHit.wav";
    var EXPLODE_SOUND_FILE = "/sounds/CatapultExplosion.wav";
    var LOSE_SOUND_FILE = "/sounds/Lose.wav";
    var AIM_SOUND_FILE = "/sounds/RopeStretch.wav";
    var WIN_SOUND_FILE = "/sounds/Win.wav";

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }
            args.setPromise(WinJS.UI.processAll());
        }
    };

    function initialize() {
        canvas = document.getElementById("gameCanvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        context = canvas.getContext("2d");

        canvas.addEventListener("MSPointerUp", endAim, false);
        canvas.addEventListener("MSPointerMove", adjustAim, false);
        canvas.addEventListener("MSPointerDown", beginAim, false);

        stage = new createjs.Stage(canvas);

        preload = new createjs.LoadQueue();
        preload.addEventListener("complete", prepareGame);
        var manifest = [
            { id: "screenImage", src: "images/Backgrounds/gameplay_screen.png" },
            { id: "redImage", src: "images/Catapults/Red/redIdle/redIdle.png" },
            { id: "blueImage", src: "images/Catapults/Blue/blueIdle/blueIdle.png" },
            { id: "ammoImage", src: "images/Ammo/rock_ammo.png" },
            { id: "winImage", src: "images/Backgrounds/victory.png" },
            { id: "loseImage", src: "images/Backgrounds/defeat.png" },
            { id: "blueFire", src: "images/Catapults/Blue/blueFire/blueCatapult_fire.png" },
            { id: "redFire", src: "images/Catapults/Red/redFire/redCatapult.png" },
            { id: "hitSound", src: HIT_SOUND_FILE },
            { id: "explodeSound", src: EXPLODE_SOUND_FILE },
            { id: "fireSound", src: FIRE_SOUND_FILE },
            { id: "loseSound", src: LOSE_SOUND_FILE },
            { id: "aimSound", src: AIM_SOUND_FILE },
            { id: "winSound", src: WIN_SOUND_FILE },
        ];
        preload.loadManifest(manifest);
    }

    function prepareGame() {
        bgImage = preload.getResult("screenImage");
        bgBitmap = new createjs.Bitmap(bgImage);
        bgBitmap.scaleX = SCALE_X;
        bgBitmap.scaleY = SCALE_Y;
        stage.addChild(bgBitmap);

        p1Image = preload.getResult("redImage");
        p1Bitmap = new createjs.Bitmap(p1Image);
        p1Bitmap.scaleX = SCALE_X;
        p1Bitmap.scaleY = SCALE_Y;
        p1Bitmap.x = MARGIN;
        p1Bitmap.y = GROUND_Y - p1Image.height * SCALE_Y;
        stage.addChild(p1Bitmap);

        p2Image = preload.getResult("blueImage");
        p2Bitmap = new createjs.Bitmap(p2Image);
        p2Bitmap.regX = p2Image.width;
        p2Bitmap.scaleX = -SCALE_X;
        p2Bitmap.scaleY = SCALE_Y;
        p2Bitmap.x = canvas.width - MARGIN - (p2Image.width * SCALE_X);
        p2Bitmap.y = GROUND_Y - (p2Image.height * SCALE_Y);
        stage.addChild(p2Bitmap);

        ammoImage = preload.getResult("ammoImage");
        ammoBitmap = new createjs.Bitmap(ammoImage);
        ammoBitmap.scaleX = SCALE_X;
        ammoBitmap.scaleY = SCALE_Y;
        ammoBitmap.visible = false;
        stage.addChild(ammoBitmap);

        p1Lives = new createjs.Text("Lives Left: " + player1Lives, "20px sans-serif", "red");
        p1Lives.scaleX = SCALE_X;
        p1Lives.scaleY = SCALE_Y;
        p1Lives.x = MARGIN;
        p1Lives.y = MARGIN * SCALE_Y;
        stage.addChild(p1Lives);

        p2Lives = new createjs.Text("Lives Left: " + player2Lives, "20px sans-serif", "blue");
        p2Lives.scaleX = SCALE_X;
        p2Lives.scaleY = SCALE_Y;
        p2Lives.x = canvas.width - p2Lives.getMeasuredWidth() * SCALE_X - MARGIN;
        p2Lives.y = MARGIN * SCALE_Y;
        stage.addChild(p2Lives);

        title = new createjs.Text("Catapult Wars!", "30px sans-serif", "black");
        title.scaleX = SCALE_X;
        title.scaleY = SCALE_Y;
        title.x = canvas.width / 2 - (title.getMeasuredWidth() * SCALE_X) / 2;
        title.y = 30 * SCALE_Y;
        stage.addChild(title);

        stage.update();

        startGame();
    }

    function startGame() {
        createjs.Ticker.setInterval(window.requestAnimationFrame);
        createjs.Ticker.addEventListener("tick", gameLoop);
    }

    function gameLoop(event) {
        if (!event.paused) {
            update();
            draw();
        }
    }

    function update() {
        if (isShotFlying) {
            ammoBitmap.x += shotVelocity.x;
            ammoBitmap.y += shotVelocity.y;
            shotVelocity.y += GRAVITY;

            if (ammoBitmap.y + ammoBitmap.image.height >= GROUND_Y ||
                ammoBitmap.x <= 0 ||
                ammoBitmap.x + ammoBitmap.image.width >= canvas.width) {
                
                isShotFlying = false;
                ammoBitmap.visible = false;
                playerTurn = playerTurn % 2 + 1;
            }
            else if (playerTurn == 1) {
                if (checkHit(p2Bitmap)) {
                    p2Lives.text = "Lives Left: " + --player2Lives;
                    processHit();
                }
            }
            else if (playerTurn == 2) {
                if (checkHit(p1Bitmap)) {
                    p1Lives.text = "Lives Left: " + --player1Lives;
                    processHit();
                }
            }
        }
        else if (playerTurn == 1) {
            if (playerFire) {
                playerFire = false;
                ammoBitmap.x = p1Bitmap.x + (p1Bitmap.image.width * SCALE_X / 2);
                ammoBitmap.y = p1Bitmap.y;
                shotVelocity = aimVector;
                fireShot();
            }
            //ammoBitmap.x = p1Bitmap.x + (p1Bitmap.image.width * SCALE_X / 2);
            //ammoBitmap.y = p1Bitmap.y;
            //shotVelocity = new createjs.Point(
            //    Math.random() * (4 * SCALE_X) + 3,
            //    Math.random() * (-3 * SCALE_Y) - 1);
            //fireShot();
        }
        else {
            ammoBitmap.x = p2Bitmap.x + (p2Bitmap.image.width * SCALE_X / 2);
            ammoBitmap.y = p2Bitmap.y;
            shotVelocity = new createjs.Point(
                Math.random() * (-4 * SCALE_X) - 1,
                Math.random() * (-3 * SCALE_Y) - 1);
            fireShot();
        }
    }

    function beginAim(event) {
        if (playerTurn == 1) {
            if (!isAiming) {
                aimStart = new createjs.Point(event.x, event.y);
                isAiming = true;
            }
        }
    }

    function adjustAim(event) {
        if (isAiming) {
            var aimCurrent = new createjs.Point(event.x, event.y);
            aimVector = calculateAim(aimStart, aimCurrent);
            Debug.writeln("Aiming..." + aimVector.x + "/" + aimVector.y);
        }
    }

    function endAim(event) {
        if (isAiming) {
            isAiming = false;
            var aimCurrent = new createjs.Point(event.x, event.y);
            aimVector = calculateAim(aimStart, aimCurrent);
            playerFire = true;
        }
    }

    function calculateAim(start, end) {
        var aim = new createjs.Point(
            (end.x - start.x) / 80,
            (end.y - start.y) / 80);
        aim.x = Math.min(MAX_SHOT_POWER, aim.x);
        aim.x = Math.max(0, aim.x);
        aim.y = Math.max(-MAX_SHOT_POWER, aim.y);
        aim.y = Math.min(0, aim.y);

        return aim;
    }

    function fireShot() {
        playSound(FIRE_SOUND_FILE);
        ammoBitmap.visible = true;
        isShotFlying = true;
    }

    function checkHit(target) {
        var shotX = ammoBitmap.x + ammoBitmap.image.width / 2;
        var shotY = ammoBitmap.y + ammoBitmap.image.height / 2;

        return (((shotX >= target.x) &&
                (shotX <= target.x + (target.image.width * SCALE_X)))
            &&
                ((shotY >= target.y) &&
                  (shotY <= target.y + (target.image.height * SCALE_Y))));
    }

    function endGame() {
        createjs.Ticker.setPaused(true);

        var endGameImage;
        if (player1Lives <= 0) {
            endGameImage = preload.getResult("loseImage");
            playSound(LOSE_SOUND_FILE);
        }
        else if (player2Lives <= 0) {
            endGameImage = preload.getResult("winImage");
            playSound(WIN_SOUND_FILE);
        }

        var endGameBitmap = new createjs.Bitmap(endGameImage);
        stage.addChild(endGameBitmap);
        endGameBitmap.x = (canvas.width / 2) - (endGameImage.width * SCALE_X / 2);
        endGameBitmap.y = (canvas.height / 2) - (endGameImage.height * SCALE_Y / 2);
        endGameBitmap.scaleX = SCALE_X;
        endGameBitmap.scaleY = SCALE_Y;
        stage.update();
    }

    function processHit() {
        playSound(EXPLODE_SOUND_FILE);
        isShotFlying = false;
        ammoBitmap.visible = false;
        playerTurn = playerTurn % 2 + 1;

        if ((player1Lives <= 0) || (player2Lives <= 0)) {
            endGame();
        }
    }

    function draw() {
        stage.update();
    }

    function playSound(path) {
        var sound = document.createElement("audio");
        sound.src = path;
        sound.autoplay = true;
    }

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };

    document.addEventListener("DOMContentLoaded", initialize, false);
    app.start();
})();
