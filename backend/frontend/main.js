const FRAME_RATE = 45;
const CANVAS_HEIGHT = 400;
const CANVAS_WIDTH = 600;

const CANVAS_BG = 153;

const HOLDOFF_WIDTH = 200;

const PADDLE_THICKNESS = 10;
const PADDLE_LENGTH = 100;
const HALF_PADDLE_LENGTH = PADDLE_LENGTH / 2;

const BALL_DIAMETER = 20;
const BALL_RADIUS = BALL_DIAMETER / 2;

const BASE_BALLX = CANVAS_WIDTH / 2;
const BASE_BALLY = CANVAS_HEIGHT / 2;

const BASE_BALL_VX = 2;
const BASE_BALL_VY = 2;

let ballX = BASE_BALLX; // horizontal
let ballY = BASE_BALLY;

let xDirection = 1;
let speedX = xDirection * BASE_BALL_VX; // horizontal
let speedY = BASE_BALL_VY;

let playerY = CANVAS_HEIGHT / 2; // vertical
let playerX = 0;
let otherPlayerY = CANVAS_HEIGHT / 2; // vertical;
let otherPlayerX = CANVAS_WIDTH;

var socket = io();
var gameId = null;

var ctx = null;

let SOUNDS = {};
let loadSounds = () => {
  Howler.volume(1.0);
  SOUNDS["bounce"] = new Howl({
    src: ["ball-hit.wav"],
  });
};

let playSound = (kind) => {
  // console.log("play sounds", kind);
  // FIXME to fix this error:
  // The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page.
  // if (getAudioContext().state !== "running") {
  //   getAudioContext().resume();
  // }
  // if (kind in SOUNDS) {
  //   let hack = () => SOUNDS[kind].play();
  //   hack();
  // }
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

let startGame = () => {
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
      gameId = data["message"];
      $("#waiting-msg")
        .show()
        .text("GameID: " + gameId + " " + "Waiting for player2 to join...");

      socket.on("actually_start", (data) => {
        $("#waiting-msg").hide();
        console.log("actually_start received", data);
        socket.off("actually_start");
        startGame();
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
      startGame();
    });
  });
});

let setupRemoteListeners = () => {
  socket.on("player_move", (data) => {
    otherPlayerY = data["message"]["otherPosition"][1];
    // console.log("on player_move", data);
    // console.log("on player_move", playerY, otherPlayerY);
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
  if (shouldCreateNewBall()) {
    createNewBall();
  } else if (ballX < BALL_RADIUS + PADDLE_THICKNESS) {
    if (shouldBounceOffPaddle({ me: true })) {
      ballHitEvent();
      speedX *= -1;
      playSound("bounce");
    }
  } else if (ballX > CANVAS_WIDTH - BALL_RADIUS - PADDLE_THICKNESS) {
    if (shouldBounceOffPaddle({ me: false })) {
      ballHitEvent();
      speedX *= -1;
      playSound("bounce");
    }
  } else if (ballY < BALL_RADIUS) {
    speedY *= -1;
    playSound("bounce");
  } else if (ballY > CANVAS_HEIGHT - BALL_RADIUS) {
    speedY *= -1;
    playSound("bounce");
  }
  ballX += speedX;
  ballY += speedY;
};

let shouldCreateNewBall = () => {
  return ballX < 0 || ballX > CANVAS_WIDTH;
};

let shouldBounceOffPaddle = ({ me }) => {
  if (me) {
    return (
      ballY >= playerY - HALF_PADDLE_LENGTH &&
      ballY <= playerY + HALF_PADDLE_LENGTH
    );
  } else {
    return (
      ballY >= otherPlayerY - HALF_PADDLE_LENGTH &&
      ballY <= otherPlayerY + HALF_PADDLE_LENGTH
    );
  }
};

let createNewBall = () => {
  ballX = BASE_BALLX;
  ballY = BASE_BALLY;
  speedX = xDirection * BASE_BALL_VX;
  speedY = BASE_BALL_VY;
};
