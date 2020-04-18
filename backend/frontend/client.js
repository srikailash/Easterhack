const FRAME_RATE = 45;
const CANVAS_HEIGHT = 400;
const CANVAS_WIDTH = 600;

const CANVAS_BG = 153;

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

let socket = io();
let gameId = null;

let ctx = null;
let state = null;
let imPlayerOne = false;

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
    ctx.noLoop();
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

let startGame = () => {
  new p5(renderer);
};

let reDrawGame = () => {
  if (ctx) {
    ctx.redraw();
  } else {
    console.error("No p5 context available to draw");
  }
};

$(document).ready(function () {
  $("#start").click(function () {
    console.log("Emitting event for createGameReq");
    imPlayerOne = true;
    socket.emit("createGameReq");
    $("#start").hide();
    $("#join-game").hide();
    $("#error-msg").hide();

    $("#waiting-msg").show().text("Loading..");
    socket.on("createGameRes", function (data) {
      gameId = data.id;
      $("#waiting-msg")
        .show()
        .text("GameID: " + gameId + " Waiting for Player2 to join...");

      socket.on("clientStartGame", (data) => {
        $("#waiting-msg").hide();
        console.log("clientStartGame received", data);

        state = data.state;
        startGame();
        // socket.off("clientStartGame");
      });

      socket.off("createGameRes");
    });
  });

  $("#join").click(function () {
    gameId = $("#game-id").val();

    // console.log("Emitting event for joinGameReq. gameID: ", gameId);
    $("#start").hide();
    $("#join-game").hide();
    $("#error-msg").hide();

    $("#waiting-msg").show().text("Loading..");

    imPlayerOne = false;
    socket.emit("joinGameReq", {
      id: gameId,
    });

    socket.on("invalidGameId", () => {
      // console.log("invalid game id event received");
      $("#start").show();
      $("#join-game").show();
      $("#error-msg").show().text("Invalid game ID!");
      $("#waiting-msg").hide();
    });

    socket.on("clientStartGame", (data) => {
      $("#waiting-msg").hide();
      // console.log("clientStartGame received", data);
      // socket.off("clientStartGame");
      state = data.state;
      startGame();
    });
  });
});

let setupRemoteListeners = () => {
  socket.on("player_move", (data) => {
    otherPlayerY = data["message"]["otherPosition"][1];
    // console.log("on player_move", playerY, otherPlayerY);
  });

  socket.on("gameover", () => {
    // console.log("gameover received");
    $("#score").hide();
    $("#start").show();
    $("#join-game").show();
    $("#error-msg").show().text("Other player lost connection!");
    ctx.remove();
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
      // console.log(response);
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
      // console.log(response);
    }
  );
};

let emitNewBallEvent = () => {
  socket.emit("new_ball", {
    game_id: gameId,
  });
};

let drawPlayers = () => {
  let playerX = state.pOnePos[0];
  let playerY = state.pOnePos[1];
  // player 1
  drawPlayer(playerX, playerY);

  let otherPlayerX = state.pTwoPos[0];
  let otherPlayerY = state.pTwoPos[1];
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
  let ballX = state.ballPos[0];
  let ballY = state.ballPos[1];
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

let displayScoreCard = () => {
  $("#score")
    .show()
    .text(state.scores[0] + " " + state.scores[1]);
};
