const express = require('express')
const app = express()
const http = require('http')
var cors = require('cors')
const bodyParser = require('body-parser')

var server = http.createServer(app)
var io = require('socket.io')(server)

app.use(cors())
app.use(bodyParser.json())

if(process.env.NODE_ENV==='production'){
	app.use(express.static(__dirname+"/build"))
	app.get("*", (req, res) => {
		res.sendFile(path.join(__dirname+"/build/index.html"))
	})
}

app.set('port', (process.env.PORT || 4001))

connections = {}
messages = {}

io.on('connection', (socket) => {
	//receives path(url)
	socket.on('join-call', (path) => {
		//if the connection[path] does not exist (for new meets), it is created
		if(connections[path] === undefined){
			connections[path] = []
		}
		//adds the id to the connection
		connections[path].push(socket.id)

		for(let a = 0; a < connections[path].length; ++a){
			//for each id in the connection, emit event user-joined
			io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
		}

		console.log(path, connections[path])
	})

	socket.on('signal', (toId, message) => {
		io.to(toId).emit('signal', socket.id, message)
	})

})

server.listen(app.get('port'), () => {
	console.log("listening on", app.get('port'))
})