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

  updatePosition(newY) {
    this.position.y = newY;
  }
}

class Ball {
  constructor() {
    this.position = new Position(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    this.vx = BALL_VX;
    this.vy = BALL_VY;
  }

  reverseX() {
    this.vx *= -1;
  }

  reverseY() {
    this.vy *= -1;
  }

  updatePosition() {
    this.position.x += this.vx;
    this.position.y += this.vy;
  }

  reset() {
    this.position.x = CANVAS_WIDTH / 2;
    this.position.y = CANVAS_HEIGHT / 2;
    this.vx = BALL_VX;
    this.vy = BALL_VY;
  }
}

class Game {
  constructor(id) {
    this.id = id;
    this.playerOne = null;
    this.playerTwo = null;
    this.ball = new Ball();
    this.timerId = null;
  }

  serialize() {
    // This data is sent over wire
    // Make sure this is as minimal as possible
    return {
      id: this.id,
      ballPos: this.ball.position.serialize(),
      pOnePos: this.playerOne.position.serialize(),
      pTwoPos: this.playerTwo.position.serialize(),
      scores: [this.playerOne.score, this.playerTwo.score],
    };
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

  hasStarted() {
    return this.timerId !== null;
  }

  stop() {
    clearTimeout(this.timerId);
    this.timerId = null;
  }

  tick() {
    this.updateBallPosition();
  }

  updateBallPosition() {
    let newBallX = this.ball.position.x + this.ball.vx;
    let newBallY = this.ball.position.y + this.ball.vy;

    if (this.shouldCreateNewBall(newBallX)) {
      this.ball.reset();
    } else if (newBallX < BALL_RADIUS + PADDLE_THICKNESS) {
      if (this.shouldBounceOffPaddle()) {
        this.ball.reverseX();
      }
    } else if (newBallX > CANVAS_WIDTH - BALL_RADIUS - PADDLE_THICKNESS) {
      if (this.shouldBounceOffPaddle()) {
        this.ball.reverseX();
      }
    } else if (
      newBallY < BALL_RADIUS ||
      newBallY > CANVAS_HEIGHT - BALL_RADIUS
    ) {
      // bounce of top or bottom wall
      this.ball.reverseY();
    }

    this.ball.updatePosition();
  }

  shouldBounceOffPaddle() {
    let newBallY = this.ball.position.y + this.ball.vy;
    let pOneX = this.playerOne.x;
    let pTwoX = this.playerTwo.x;
    return (
      (newBallY >= pOneX - HALF_PADDLE_LENGTH &&
        newBallY <= pOneX + HALF_PADDLE_LENGTH) ||
      (newBallY >= pTwoX - HALF_PADDLE_LENGTH &&
        newBallY <= pTwoX + HALF_PADDLE_LENGTH)
    );
  }

  shouldCreateNewBall(newBallX) {
    // some offset to delay new ball creation
    return newBallX < -20 || newBallX > CANVAS_WIDTH + 20;
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

  getAllGameObjs() {
    return Object.values(this._s);
  }
}

module.exports = {
  ServerState,
  Game,
  Player,
  FRAME_RATE,
};
