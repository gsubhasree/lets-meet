const express = require('express')
const app = express()
const http = require('http')
var cors = require('cors')
const bodyParser = require('body-parser')

var server = http.createServer(app)

app.use(cors())
app.use(bodyParser.json())

app.set('port', (process.env.PORT || 4001))

server.listen(app.get('port'), () => {
	console.log("listening on", app.get('port'))
})