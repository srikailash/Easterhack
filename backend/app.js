var express = require("express");
var http = require("http");
var fs = require("fs");

var app = express();
var server = app.listen(3000);

// serve frontend dir
app.use(express.static(__dirname + "/frontend"));

//Socket.io server listens to the app
//Apparently, socket.io is a http server by itself
var io = require("socket.io").listen(server);

io.on("connection", function (socket) {
  //Using socket to communicate with the client
  socket.emit("welcome", { message: "Welcome!", id: socket.id });
  socket.on("i am client", console.log);
});
