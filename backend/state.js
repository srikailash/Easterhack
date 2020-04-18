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
    if (gameId in this._s) {
      return this._s[gameId];
    }
    return null;
  }
}

module.exports = {
  ServerState,
  Game,
  Player,
};
