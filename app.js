const express = require('express')
const app = express()
const http = require('http')
const path= require("path")
var cors = require('cors')
const bodyParser = require('body-parser')

var xss = require("xss")

var server = http.createServer(app)
var io = require('socket.io')(server)

app.use(cors())
app.use(bodyParser.json())

app.set('port', (process.env.PORT || 4001))

sanitizeString = (str) => {
	return xss(str)
}
app.get('/check', (_req, res)=>{res.status(200).send("Working")})

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

	//handles chat
	socket.on('chat-message', (data, sender) => {
		data = sanitizeString(data)
		sender = sanitizeString(sender)

		var key
		var valid = false

		for (const [k, v] of Object.entries(connections)) {
			for(let a = 0; a < v.length; ++a){
				if(v[a] === socket.id){
					key = k
					valid = true
				}
			}
		}

		if(valid === true){
			if(messages[key] === undefined){
				messages[key] = []
			}
			messages[key].push({"sender": sender, "data": data, "socket-id-sender": socket.id})
			console.log("message", key, ":", sender, data)
			//emit for all connections
			for(let a = 0; a < connections[key].length; ++a){
				io.to(connections[key][a]).emit("chat-message", data, sender, socket.id)
			}
		}
	})

	//to disconnect from the meet
	socket.on('disconnect', () => {
		var key
		for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
			for(let a = 0; a < v.length; ++a){
				if(v[a] === socket.id){
					key = k
					//emit user-left for all other connections
					for(let a = 0; a < connections[key].length; ++a){
						io.to(connections[key][a]).emit("user-left", socket.id)
					}
					//removing the connection
					var index = connections[key].indexOf(socket.id)
					connections[key].splice(index, 1)

					if(connections[key].length === 0){
						delete connections[key]
					}
				}
			}
		}
	})

})

if(process.env.NODE_ENV!=='test'){
  server.listen(app.get('port'), () => {
    console.log("listening on", app.get('port'))
  })
}

module.exports = {server}