var express = require("express");
var http = require("http");
var fs = require("fs");
//variables for the game
var game_id;
var player1_socket_id;
var player2_socket_id;
var ball_x;
var ball_y;
var player1_y;
var player2_y;

var app = express();
var server = app.listen(3000);

// serve frontend dir
app.use(express.static(__dirname + "/frontend"));

//Socket.io server listens to the app
//Apparently, socket.io is a http server by itself
var io = require("socket.io").listen(server);

io.on('connection', function(socket) {

	socket.on('gamestart', () => {
		console.log('Got gamestart event from the clientside');
		player1_socket_id = socket.id;
		socket.emit('game_id', {message: '123', id: socket.id});
	});

	socket.on('joingame', (game_id) => {
		console.log('Joining Game with socket_id ' + socket.id);
		player2_socket_id = socket.id;
		socket.emit('welcome', {message: "You've now joined the game", id: socket.id });
	});

	socket.on('player_hit', function(data) {
		socket.broadcast.emit('move', { message: data });
	});

	socket.on('player_move', function(data) {
		socket.broadcast.emit('player_move', { message: data });
	});

	//Using socket to communicate with the client
  	socket.emit("welcome", { message: "Welcome!", id: socket.id });
  	socket.on("i am client", console.log);
});


