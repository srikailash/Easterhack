var express = require("express");
var http = require("http");
var fs = require("fs");
var randomstring = require("randomstring");

//variables for the game
// var player1 = {};
// var player2 = {};

var app = express();
var server = app.listen(3000);

// serve frontend dir
app.use(express.static(__dirname + "/frontend"));

// socket.io server listens to the app
var io = require("socket.io").listen(server);

// let sendToClient = (client_socket_id, message_type, message_data, game_id) => {
//   if (typeof client_socket_id === "undefined") {
//     return;
//   }
//   if (typeof io.sockets.connected[client_socket_id] === "undefined") {
//     //One of the players closed the connection

//     console.log(
//       "CONNECTED CLOSED BY PLAYER WITH SOCKET_ID  : " + client_socket_id
//     );
//     //console.log(game_id + "  ####  " + player1[game_id] + "  ####   " + player2[game_id]);

//     if (typeof io.sockets.connected[player1[game_id]] === "undefined") {
//       console.log("SENDING GAME ENDING EVENT TO : " + player1[game_id]);
//       io.sockets.connected[player2[game_id]].emit("gameover", {
//         message: "The other player left the game",
//       });
//     }

//     if (typeof io.sockets.connected[player2[game_id]] === "undefined") {
//       console.log("SENDING GAME ENDING EVENT TO : " + player1[game_id]);
//       io.sockets.connected[player1[game_id]].emit("gameover", {
//         message: "The other player left the game",
//       });
//     }

//     return;
//   }

//   if (typeof io.sockets.connected[client_socket_id] !== "undefined") {
//     io.sockets.connected[client_socket_id].emit(message_type, message_data);
//   }
// };

let state = new ServerState();

let generateNewGameId = () => randomstring(3);

io.on("connection", function (socket) {
  socket.on("createGameRequest", () => {
    console.log("GAME STARTED BY SOCKET: " + socket.id);

    let playerOneSocketId = socket.id;
    let gameId = generateNewGameId();

    let g = new Game(gameId);
    g.join(new Player(playerOneSocketId, true));
    state.addGame(g);

    io.sockets.connected[playerOneSocketId].emit("createGameResponse", {
      gameId: gameId,
    });
  });

  socket.on("joinGameRequest", function (data) {
    let playerTwoSocketId = socket.id;
    let gameId = data["gameId"];

    console.log(
      "GAME_ID REQUESTED TO JOIN :   " +
        gameId +
        " BY SOCKET_ID   " +
        playerTwoSocketId
    );

    let g = state.getGameObj(gameId);

    if (g) {
      g.join(new Player(playerTwoSocketId, false));

      // TODO broadcast game start event
    } else {
      io.sockets.connected[playerTwoSocketId].emit("invalidJoinGameId", {
        gameId: gameId,
      });
    }

    if (player2[game_id] === -1) {
      var player1_socket_id = player1[game_id];
      player2[game_id] = player2_socket_id;
      console.log(
        "SENDING WELCOME MESSAGE TO THE SECOND PLAYER   :  " + player2[game_id]
      );
      sendToClient(
        player2[game_id],
        "welcome",
        { message: "You've now joined the game" },
        game_id
      );

      //Setting server_time to a time in the future, so that both clients start at the same time
      var server_time = new Date().getTime() + 500;
      sendToClient(
        player1_socket_id,
        "actually_start",
        { message: "Starting the Game " + game_id, server_time: server_time },
        game_id
      );
      sendToClient(
        player2_socket_id,
        "actually_start",
        { message: "Starting the Game " + game_id, server_time: server_time },
        game_id
      );
    } else {
      sendToClient(
        player2_socket_id,
        "invalid_game_id",
        { message: "Game Id you've entered is not a valid one" },
        game_id
      );
    }
  });

  socket.on("player_move", function (data) {
    var new_positions = {
      myPosition: data.otherPosition,
      otherPosition: data.myPosition,
    };
    var game_id = data["game_id"];

    //console.log(game_id + "  ####  " + player1[game_id] + "  ####   " + player2[game_id]);
    if (socket.id === player1[game_id]) {
      sendToClient(
        player2[game_id],
        "player_move",
        { message: new_positions },
        game_id
      );
    } else if (socket.id === player2[game_id]) {
      sendToClient(
        player1[game_id],
        "player_move",
        { message: new_positions },
        game_id
      );
    }
  });

  socket.on("new_ball", function (data) {
    var game_id = data["game_id"];
    var server_time = new Date().getTime();

    sendToClient(
      player1[game_id],
      "new_ball",
      { server_time: server_time },
      game_id
    );
    sendToClient(
      player2[game_id],
      "new_ball",
      { server_time: server_time },
      game_id
    );
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
    this.state = {};
  }

  addGame(gameObj) {
    this.state[gameObj.id] = gameObj;
  }

  getGameObj(gameId) {
    if (gameId in this.state) {
      this.state[gameId];
    }
    return null;
  }
}
