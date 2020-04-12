var express = require("express");
var http = require("http");
var fs = require("fs");

//variables for the game
var player1 = [];
var player2 = [];
var game_id;
var player1_socket_id;
var player2_socket_id;

var app = express();
var server = app.listen(3000);

// serve frontend dir
app.use(express.static(__dirname + "/frontend"));

//Socket.io server listens to the app
//Apparently, socket.io is a http server by itself
var io = require("socket.io").listen(server);

io.on('connection', function(socket) {

	socket.on('gamestart', () => {
		console.log('Got gamestart event from the clientside ' + socket.id);
		player1_socket_id = socket.id;
		game_id = Math.random();
		player1.push({
			key: game_id,
			value: player1_socket_id
		});
		io.sockets.connected[player1_socket_id].emit('game_id', { message: game_id });
	});

	socket.on('joingame', (game_id) => {
		console.log('Joining Game with socket_id ' + socket.id);
		player2_socket_id = socket.id;
		player2.push({
			key: game_id,
			value: player2_socket_id
		});
		io.sockets.connected[player2_socket_id].emit('welcome', { message: "You've now joined the game" });
	});

	socket.on('player_hit', function(data) {
		socket.broadcast.emit('move', { message: data });
	});

	socket.on('player_move', function(data) {
		console.log('Moving : ' + socket.id);
		var new_positions = {
			myPosition: data.otherPosition,
			otherPosition: data.myPosition
		}

		if(socket.id === player1_socket_id && typeof player2_socket_id !== 'undefined') {
			console.log('moving position of player2');
			io.sockets.connected[player2_socket_id].emit('player_move', { message: new_positions });
		}
		else if(socket.id === player2_socket_id && typeof player1_socket_id !== 'undefined')
		{
			//This if condition will go away as game is started only when both start
			console.log('moving position of player1');
			io.sockets.connected[player1_socket_id].emit('player_move', { message: new_positions });
		}
	});

	//Using socket to communicate with the client
  	socket.emit("welcome", { message: "Welcome!", id: socket.id });
  	socket.on("i am client", console.log);
});
