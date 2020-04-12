const FRAME_RATE = 45;
const CANVAS_HEIGHT = 400;
const CANVAS_WIDTH = 600;

const HOLDOFF_WIDTH = 200;

const PADDLE_THICKNESS = 10;
const PADDLE_LENGTH = 100;
const HALF_PADDLE_LENGTH = PADDLE_LENGTH / 2;

const BALL_DIAMETER = 20;
const BALL_RADIUS = BALL_DIAMETER / 2;

const BASE_BALLX = CANVAS_WIDTH / 2;
const BASE_BALLY = CANVAS_HEIGHT / 2;

const BASE_BALL_VX = 10;
const BASE_BALL_VY = 10;

let ballX = BASE_BALLX; // horizontal
let ballY = BASE_BALLY;

let speedX = BASE_BALL_VX; // horizontal
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
    ctx.background(153); // some grey
    ctx.drawPlayers();
    ctx.drawBall();

    sendPlayerMoveEvent();
  };
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
      socket.off("gamestart");
    });
  });

  $("#join").click(function () {
    let gameId = $("#game-id").val();
    console.log("Emitting event for join game. gameID: ", gameId);
    $("#start").hide();
    $("#join-game").hide();

    $("#waiting-msg").show().text("Loading..");

    socket.emit(
      "actually_start",
      {
        gameId: gameId,
      },
      (data) => {
        $("#waiting-msg").hide();
        console.log("actually_start received", data);
        socket.off("actually_start");
      }
    );
  });
});

let setupRemoteListeners = () => {
  socket.on("player_move", (data) => {
    otherPlayerY = data["message"]["otherPosition"][1];
    // console.log("on player_move", playerY, otherPlayerY);
  });
};

let sendPlayerMoveEvent = () => {
  // console.log("emitting player_move");
  socket.emit(
    "player_move",
    {
      myPosition: [playerX, playerY],
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

function mouseMoved() {
  playerY = mouseY;
  if (playerY < HALF_PADDLE_LENGTH) {
    playerY = HALF_PADDLE_LENGTH;
  } else if (playerY > CANVAS_HEIGHT - HALF_PADDLE_LENGTH) {
    playerY = CANVAS_HEIGHT - HALF_PADDLE_LENGTH;
  }
}

let drawPlayers = () => {
  // player 1 (YOU)
  drawPlayer(playerX, playerY);

  // player 2
  drawPlayer(otherPlayerX - PADDLE_THICKNESS, otherPlayerY);
};

let drawPlayer = (x, y) => {
  y -= PADDLE_LENGTH / 2;
  ctx.rect(x, y, PADDLE_THICKNESS, PADDLE_LENGTH);
};

let drawBall = () => {
  adjustBallXY();
  ctx.circle(ballX, ballY, BALL_DIAMETER);
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
  return (
    ballX < -1 * CANVAS_WIDTH - HOLDOFF_WIDTH ||
    ballX > CANVAS_WIDTH + HOLDOFF_WIDTH
  );
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
      ballY <= otherPlayerY - HALF_PADDLE_LENGTH
    );
  }
};

let createNewBall = () => {
  ballX = BASE_BALLX;
  ballY = BASE_BALLY;
  speedX = BASE_BALL_VX;
  speedY = BASE_BALL_VY;
};
