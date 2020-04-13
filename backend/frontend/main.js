const FRAME_RATE = 45;
const CANVAS_HEIGHT = 400;
const CANVAS_WIDTH = 600;

const CANVAS_BG = 153;

const HOLDOFF_WIDTH = 200;

const PADDLE_THICKNESS = 10;
const PADDLE_LENGTH = 100;
const HALF_PADDLE_LENGTH = PADDLE_LENGTH / 2;

const BALL_DIAMETER = 10;
const BALL_RADIUS = BALL_DIAMETER / 2;

const BASE_BALLX = CANVAS_WIDTH / 2;
const BASE_BALLY = CANVAS_HEIGHT / 2;

const BASE_BALL_VX = 5;
const BASE_BALL_VY = 5;

let ballX = BASE_BALLX; // horizontal
let ballY = BASE_BALLY;

let xDirection = 1;
let speedX = xDirection * BASE_BALL_VX; // horizontal
let speedY = BASE_BALL_VY;

let playerY = CANVAS_HEIGHT / 2; // vertical
let playerX = 0;
let otherPlayerY = CANVAS_HEIGHT / 2; // vertical;
let otherPlayerX = CANVAS_WIDTH;

var playerXScore = 0;
var playerYScore = 0;

var socket = io();
var gameId = null;

var ctx = null;

let SOUNDS = {};
let loadSounds = () => {
  SOUNDS["hit"] = new Howl({
    src: ["hitbounce.wav"],
    volume: 0.6,
  });
  SOUNDS["bounce"] = new Howl({
    src: ["wallbounce.wav"],
    volume: 1.0,
  });
};

let playSound = (kind) => {
  // console.log("play sounds", kind);
  // FIXME to fix this error:
  // The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page.
  // if (getAudioContext().state !== "running") {
  //   getAudioContext().resume();
  // }
  if (kind in SOUNDS) {
    let hack = () => SOUNDS[kind].play();
    hack();
  }
};

let renderer = (p) => {
  p.setup = () => {
    ctx = p;

    let canvas = ctx.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.frameRate(FRAME_RATE);
    canvas.parent("canvas");
    loadSounds();
    setupRemoteListeners();
  };

  p.draw = () => {
    ctx.clear();
    ctx.background(CANVAS_BG);
    drawPlayers();
    drawCenterLine();
    drawBall();
    displayScoreCard();
    sendPlayerMoveEvent();
  };

  p.mouseMoved = () => {
    playerY = ctx.mouseY;
    if (playerY < HALF_PADDLE_LENGTH) {
      playerY = HALF_PADDLE_LENGTH;
    } else if (playerY > CANVAS_HEIGHT - HALF_PADDLE_LENGTH) {
      playerY = CANVAS_HEIGHT - HALF_PADDLE_LENGTH;
    }
  };
};

let startGame = (serverTime) => {
  adjustInitialBallPosition(serverTime);
  new p5(renderer);
};

socket.on("welcome", function (data) {
  console.log(data.message);
});

socket.on("game_id", function (data) {
  console.log(data);
});

$(document).ready(function () {
  $("#start").click(function () {
    console.log("Emitting event for game start");
    socket.emit("gamestart");
    $("#start").hide();
    $("#join-game").hide();

    $("#waiting-msg").show().text("Loading..");
    socket.on("gamestart", function (data) {
      console.log(Date.now());
      gameId = data["message"];
      $("#waiting-msg")
        .show()
        .text("GameID: " + gameId + " " + "Waiting for Player2 to join...");

      socket.on("actually_start", (data) => {
        $("#waiting-msg").hide();
        $("#score").show().text(playerXScore);
        console.log("actually_start received", data);
        let serverTime = data["server_time"];
        socket.off("actually_start");
        startGame(serverTime);
      });

      socket.off("gamestart");
    });
  });

  $("#join").click(function () {
    xDirection = -1;
    speedX = xDirection * BASE_BALL_VX;
    gameId = $("#game-id").val();

    console.log("Emitting event for join game. gameID: ", gameId);
    $("#start").hide();
    $("#join-game").hide();

    $("#waiting-msg").show().text("Loading..");

    socket.emit("joingame", {
      gameId: gameId,
    });

    socket.on("actually_start", (data) => {
      $("#waiting-msg").hide();
      console.log("actually_start received", data);
      socket.off("actually_start");
      let serverTime = data["server_time"];
      startGame(serverTime);
    });
  });
});

let setupRemoteListeners = () => {
  socket.on("player_move", (data) => {
    otherPlayerY = data["message"]["otherPosition"][1];
    // console.log("on player_move", playerY, otherPlayerY);
  });

  socket.on("new_ball", (data) => {
    console.log("new_ball event received");
    let serverTime = data["server_time"];
    createNewBall();
    adjustInitialBallPosition(serverTime);
  });
};

let sendPlayerMoveEvent = () => {
  // console.log("emitting player_move");
  socket.emit(
    "player_move",
    {
      myPosition: [playerX, playerY],
      game_id: gameId,
    },
    (response) => {
      console.log(response);
    }
  );
};

let ballHitEvent = () => {
  // console.log("emitting ball_hit");
  socket.emit(
    "ball_hit",
    {
      hit: 1,
    },
    (response) => {
      console.log(response);
    }
  );
};

let emitNewBallEvent = () => {
  socket.emit("new_ball", {
    game_id: gameId,
  });
};

let drawPlayers = () => {
  // player 1 (YOU)
  drawPlayer(playerX, playerY);

  // player 2
  drawPlayer(otherPlayerX - PADDLE_THICKNESS, otherPlayerY);
};

let drawPlayer = (x, y) => {
  ctx.noStroke();
  c = ctx.color("hsb(160, 100%, 50%)");
  ctx.fill(c);
  y -= PADDLE_LENGTH / 2;
  ctx.rect(x, y, PADDLE_THICKNESS, PADDLE_LENGTH);
  ctx.stroke("black");
  ctx.fill("white");
};

let drawBall = () => {
  adjustBallXY();
  c = ctx.color(50, 55, 100);
  ctx.fill(c);
  ctx.circle(ballX, ballY, BALL_DIAMETER);
  ctx.fill("white");
};

let drawCenterLine = () => {
  let x = CANVAS_WIDTH / 2;
  ctx.strokeWeight(2);
  for (let y = 0; y < CANVAS_HEIGHT; y += 10) {
    ctx.stroke((y / 10) % 2 == 0 ? CANVAS_BG : "black");
    ctx.line(x, y, x, y + 10);
  }
  ctx.stroke("black");
  ctx.strokeWeight(1);
};

let adjustBallXY = () => {
  let nextBallX = ballX + speedX;
  let nextBallY = ballY + speedY;
  if (shouldCreateNewBall()) {
    emitNewBallEvent();
  } else if (nextBallX < BALL_RADIUS + PADDLE_THICKNESS) {
    if (shouldBounceOffPaddle({ me: true })) {
      ballHitEvent();
      speedX *= -1;
      playSound("hit");
    }
  } else if (nextBallX > CANVAS_WIDTH - BALL_RADIUS - PADDLE_THICKNESS) {
    if (shouldBounceOffPaddle({ me: false })) {
      ballHitEvent();
      speedX *= -1;
      playSound("hit");
    }
  } else if (nextBallY < BALL_RADIUS) {
    speedY *= -1;
    playSound("bounce");
  } else if (nextBallY > CANVAS_HEIGHT - BALL_RADIUS) {
    speedY *= -1;
    playSound("bounce");
  }
  ballX += speedX;
  ballY += speedY;
};

let displayScoreCard =  () => {
  console.log(playerXScore + " " + playerYScore);
  $("#score").show().text(playerXScore + " " + playerYScore);
};

let shouldCreateNewBall = () => {
  let nextBallX = ballX + speedX;
  if (nextBallX < 0) {
    if(xDirection === -1) {
	playerYScore += 10;
    } else {
    	playerXScore += 10;
    }
  } else if (nextBallX > CANVAS_WIDTH) {
    if(xDirection === -1) {
    	playerXScore += 10;
    } else {
    	playerYScore += 10;
    }
  }

  return nextBallX < 0 || nextBallX > CANVAS_WIDTH;
};

let shouldBounceOffPaddle = ({ me }) => {
  let nextBallY = ballY + speedY;
  if (me) {
    return (
      nextBallY >= playerY - HALF_PADDLE_LENGTH &&
      nextBallY <= playerY + HALF_PADDLE_LENGTH
    );
  } else {
    return (
      nextBallY >= otherPlayerY - HALF_PADDLE_LENGTH &&
      nextBallY <= otherPlayerY + HALF_PADDLE_LENGTH
    );
  }
};

let adjustInitialBallPosition = (serverTime) => {
  let now = new Date().getTime();
  let diff = now - serverTime; // ms, I think
  console.log("Adjusting ball position. diff ms:", diff);
  let fpms = FRAME_RATE / 1000;
  let framesPassed = fpms * diff; // should we do integer converion?
  ballX += framesPassed * speedX;
  ballY += framesPassed * speedY;
};

let createNewBall = () => {
  ballX = BASE_BALLX;
  ballY = BASE_BALLY;
  speedX = xDirection * BASE_BALL_VX;
  speedY = BASE_BALL_VY;
};
