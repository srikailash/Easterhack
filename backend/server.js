var express = require("express");
var randomstring = require("randomstring");

var app = express();
var server = app.listen(3000);

// serve frontend dir
app.use(express.static(__dirname + "/frontend"));

// socket.io server listens to the app
var io = require("socket.io").listen(server);

let state = new ServerState();

let generateNewGameId = () => randomstring(3);

io.on("connection", function (socket) {
  socket.on("createGameReq", () => {
    console.log("GAME STARTED BY SOCKET: " + socket.id);

    let playerOneSocketId = socket.id;
    let gameId = generateNewGameId();

    let g = new Game(gameId);
    g.join(new Player(playerOneSocketId, true));
    state.addGame(g);

    io.sockets.connected[playerOneSocketId].emit("createGameRes", {
      id: gameId,
    });
  });

  socket.on("joinGameReq", function (data) {
    let playerTwoSocketId = socket.id;
    // TODO add data validations
    let gameId = data.id;

    console.log(
      "GAME_ID REQUESTED TO JOIN :   " +
        gameId +
        " BY SOCKET_ID   " +
        playerTwoSocketId
    );

    let g = state.getGameObj(gameId);

    if (g) {
      g.join(new Player(playerTwoSocketId, false));

      let playerOneSocketId = g.playerOne.socketId;

      io.sockets.connected[playerOneSocketId].emit("clientStartGame", {
        state: g.serialize(),
      });
      io.sockets.connected[playerTwoSocketId].emit("clientStartGame", {
        state: g.serialize(),
      });
    } else {
      io.sockets.connected[playerTwoSocketId].emit("invalidGameId", {
        id: gameId,
      });
    }
  });

  socket.on("playerMove", function (data) {
    // TODO add data validations
    let playerXY = data.myPos; // [x, y]
    let gameId = data.id;

    let playerSocketId = socket.id;

    let g = state.getGameObj(gameId);
    if (g) {
      if (playerSocketId === g.playerOne.socketId) {
        g.playerOne.updatePosition(playerXY[0], playerXY[1]);
      } else if (playerSocketId === g.playerTwo.socketId) {
        g.playerTwo.updatePosition(playerXY[0], playerXY[1]);
      } else {
        // TODO
      }
    } else {
      // TODO
      console.error("Invalid playerMove. Game with id not found. data:", data);
    }
  });
});

const CANVAS_HEIGHT = 400;
const CANVAS_WIDTH = 600;

const PADDLE_THICKNESS = 10;
const PADDLE_LENGTH = 100;
const HALF_PADDLE_LENGTH = PADDLE_LENGTH / 2;

const BALL_DIAMETER = 10;
const BALL_RADIUS = BALL_DIAMETER / 2;

const FRAME_RATE = 50;
const TICK_INTERVAL = 1000 / FRAME_RATE;

const BALL_VX = 3;
const BALL_VY = 3;

class Position {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  serialize() {
    return [this.x, this.y];
  }
}

class Player {
  constructor(socketId, isPlayerOne) {
    this.socketId = socketId;
    this.position = this.initialPosition(isPlayerOne);
    this.score = 0;
  }

  initialPosition(isPlayerOne) {
    return isPlayerOne
      ? new Position(0, CANVAS_HEIGHT / 2)
      : new Position(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
  }

  updatePosition(newX, newY) {
    this.x = newX;
    this.y = newY;
  }
}

class Game {
  constructor(id) {
    this.id = id;
    this.playerOne = null;
    this.playerTwo = null;
    this.ballPosition = this.initialBallPosition();
    this.timerId = null;
  }

  serialize() {
    // This data is sent over wire
    // Make sure this is as minimal as possible
    return {
      id: this.id,
      ballPos: this.ballPosition.serialize(),
      pOnePos: this.playerOne.position.serialize(),
      pTwoPos: this.playerTwo.position.serialize(),
      scores: [this.playerOne.score, this.playerTwo.score],
    };
  }

  initialBallPosition() {
    return new Position(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  join(player) {
    if (!this.playerOne) {
      this.playerOne = player;
    } else {
      this.playerTwo = player;
    }
  }

  start() {
    this.timerId = setInterval(this.tick.bind(this), TICK_INTERVAL);
  }

  stop() {
    clearTimeout(this.timerId);
  }

  tick() {
    this.updateBallPosition();
  }

  updateBallPosition() {
    this.ballPosition.x += BALL_VX;
    this.ballPosition.y += BALL_VY;

    // TODO
  }
}

class ServerState {
  constructor() {
    this._s = {};
  }

  addGame(gameObj) {
    this._s[gameObj.id] = gameObj;
  }

  getGameObj(gameId) {
    if (gameId in this.state) {
      this._s[gameId];
    }
    return null;
  }
}
