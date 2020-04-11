const FRAME_RATE = 45;
const CANVAS_HEIGHT = 400;
const CANVAS_WIDTH = 600;

const PADDLE_THICKNESS = 10;
const PADDLE_LENGTH = 100;
const HALF_PADDLE_LENGTH = PADDLE_LENGTH / 2;

const BALL_DIAMETER = 20;
const BALL_RADIUS = BALL_DIAMETER / 2;

let ballX = CANVAS_HEIGHT / 2; // horizontal
let ballY = CANVAS_WIDTH / 2;

let speedX = 10; // horizontal
let speedY = 10;

let playerY = CANVAS_HEIGHT / 2; // vertical
let playerX = 0;

function setup() {
  let canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  frameRate(FRAME_RATE);
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.parent("canvas");
}

function draw() {
  clear();
  background(153); // some grey
  drawPlayer();
  drawBall();
}

function mouseMoved() {
  playerY = mouseY;
  if (playerY < HALF_PADDLE_LENGTH) {
    playerY = HALF_PADDLE_LENGTH;
  } else if (playerY > CANVAS_HEIGHT - HALF_PADDLE_LENGTH) {
    playerY = CANVAS_HEIGHT - HALF_PADDLE_LENGTH;
  }
}

let drawPlayer = () => {
  let [x, y] = [playerX, playerY];
  y -= PADDLE_LENGTH / 2;
  rect(x, y, PADDLE_THICKNESS, PADDLE_LENGTH);
};

let drawBall = () => {
  adjustBallXY();
  circle(ballX, ballY, BALL_DIAMETER);
};

let adjustBallXY = () => {
  ballX += speedX;
  ballY += speedY;
  if (ballX < BALL_RADIUS) {
    speedX *= -1;
  } else if (ballY < BALL_RADIUS) {
    speedY *= -1;
  } else if (ballX > CANVAS_WIDTH - BALL_RADIUS) {
    speedX *= -1;
  } else if (ballY > CANVAS_HEIGHT - BALL_RADIUS) {
    speedY *= -1;
  }
};
