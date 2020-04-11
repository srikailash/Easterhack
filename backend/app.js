
var http = require('http'),
	fs = require('fs'),
	index = fs.readFileSync(__dirname + '/index.html');



//app servers index.html to all requests
var app = http.createServer((req, res) => {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/html');
	res.end(index);
});


//Socket.io server listens to the app
//Apparently, socket.io is a http server by itself
var io = require('socket.io').listen(app);

io.on('connection', function(socket) {
	//Using socket to communicate with the client
	socket.emit('welcome', { message: 'Welcome!', id: socket.id });
	socket.on('i am client', console.log);

});

app.listen(3000);
