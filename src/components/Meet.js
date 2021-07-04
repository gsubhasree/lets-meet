import React, { Component } from 'react';

import io from 'socket.io-client'

import {IconButton, Input, Button} from '@material-ui/core'
import CallEndIcon from '@material-ui/icons/CallEnd'
import VideocamIcon from '@material-ui/icons/Videocam'
import VideocamOffIcon from '@material-ui/icons/VideocamOff'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import { Row } from 'reactstrap'
import 'bootstrap/dist/css/bootstrap.css'
import "./Meet.css"

const server_url = process.env.NODE_ENV === 'production' ? 'https://lets-vmeet.herokuapp.com/' : "http://localhost:4001"

var connections = {}
//using ICE framework for connecting peers
const peerConnectionConfig = {
	'iceServers': [
		{ 'urls': 'stun:stun.l.google.com:19302' },
	]
}
var socket = null
var socketId = null
var elms = 0

class Meet extends Component {
  	constructor (props) {
		super(props)

		this.localVideoref = React.createRef()

		//set true if user allows for audio and video access
		this.videoPermitted = false
		this.audioPermitted = false

		//state variables
		this.state = {
			video: false,
			audio: false,
			isUsername: true,
			username: "",
		}

		connections={}
		this.getPermissions()
	}

	//to get user permission for audio and video access
	getPermissions = async () => {
		try{
			//get user response and set videoPermitted
			await navigator.mediaDevices.getUserMedia({ video: true })
				.then(() => this.videoPermitted = true)
				.catch(() => this.videoPermitted = false)
			//get user response and set audioPermitted
			await navigator.mediaDevices.getUserMedia({ audio: true })
				.then(() => this.audioPermitted = true)
				.catch(() => this.audioPermitted = false)
			//if user allows access for atleast one of the devices
			if (this.videoPermitted || this.audioPermitted) {
				navigator.mediaDevices.getUserMedia({ video: this.videoPermitted, audio: this.audioPermitted })
					//stream in the same page(before connecting to the meet)
					.then((stream) => {
						window.localStream = stream
						this.localVideoref.current.srcObject = stream
					})
					.then((stream) => {})
					.catch((e) => console.log(e))
			}
		} catch(e) { console.log(e) }
	}

	//set availability of video and audio for the meet page
	getMedia = () => {
		this.setState({
			video: this.videoPermitted,
			audio: this.audioPermitted
		}, () => {
			//call function to stream own video 
			this.getUserMedia()
			//connect to the socket server
			this.connectToSocketServer()
		})
	}

	//media of user
	getUserMedia = () => {
		//check if the state variable is true and permission is also granted 
		//for atleast one of the devices
		if ((this.state.video && this.videoPermitted) || (this.state.audio && this.audioPermitted)) {
			navigator.mediaDevices.getUserMedia({ video: this.state.video, audio: this.state.audio })
				.then(this.getUserMediaSuccess)
				.then((stream) => {})
				.catch((e) => console.log(e))
		} else {
			try {
				//stop the tracks if user permission does not match with state variable
				let tracks = this.localVideoref.current.srcObject.getTracks()
				tracks.forEach(track => track.stop())
			} catch (e) {}
		}
	}

	//on success(state variables are true), stream the video 
	getUserMediaSuccess = (stream) => {
		try {
			window.localStream.getTracks().forEach(track => track.stop())
		} catch(e) { console.log(e) }

		window.localStream = stream
		this.localVideoref.current.srcObject = stream
		
		//to stream for all connections other then self
		this.streamForAllConnections(false)

		//when a users turns off video or mutes microphone 
		stream.getTracks().forEach(track => track.onended = () => {
			this.setState({
				video: false,
				audio: false,
			}, () => {
				try {
					//stop the track
					let tracks = this.localVideoref.current.srcObject.getTracks()
					tracks.forEach(track => track.stop())
				} catch(e) { console.log(e) }
				//videoAudio:to display black color in place of turned off video and silence the audio for muted microphone 
				let videoAudio = (...args) => new MediaStream([this.black(...args), this.silence()])
				window.localStream = videoAudio()
				this.localVideoref.current.srcObject = window.localStream

				//update for all connections
				this.streamForAllConnections(true)
			})
		})

	}

	streamForAllConnections =(selfStream)=>{
		for (let id in connections) {
			//if selfstream is false, dont stream for same socketId
			if(!selfStream)
				if(id === socketId) continue

			connections[id].addStream(window.localStream)

			connections[id].createOffer().then((description) => {
				connections[id].setLocalDescription(description)
					.then(() => {
						socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
					})
					.catch(e => console.log(e))
			})
		}
	}
	//on receiving signal from server
	gotMessageFromServer = (fromId, message) => {
		var signal = JSON.parse(message)
		//as communication is betwwen 2 different ids
		if (fromId !== socketId) {
			//set up session description protocol
			if (signal.sdp) {
				connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
					if (signal.sdp.type === 'offer') {
						connections[fromId].createAnswer().then((description) => {
							connections[fromId].setLocalDescription(description).then(() => {
								socket.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
							}).catch(e => console.log(e))
						}).catch(e => console.log(e))
					}
				}).catch(e => console.log(e))
			}
			// add ice candidate
			if (signal.ice) {
				connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
			}
		}
	}

	changeCssVideos = (main) => {
		let widthMain = main.offsetWidth
		let minWidth = "30%"
		if ((widthMain * 30 / 100) < 300) {
			minWidth = "300px"
		}
		let minHeight = "40%"
		//set height and width according to no. of connections
		let height = String(100 / elms) + "%"
		let width = ""
		if(elms === 0 || elms === 1) {
			width = "100%"
			height = "100%"
		} else if (elms === 2) {
			width = "45%"
			height = "100%"
		} else if (elms === 3 || elms === 4) {
			width = "35%"
			height = "50%"
		} else {
			width = String(100 / elms) + "%"
		}

		let videos = main.querySelectorAll("video")
		for (let a = 0; a < videos.length; ++a) {
			videos[a].style.minWidth = minWidth
			videos[a].style.minHeight = minHeight
			videos[a].style.setProperty("width", width)
			videos[a].style.setProperty("height", height)
		}

		return {minWidth, minHeight, width, height}
	}

	//connect to the socket server
	connectToSocketServer = () => {
		socket = io.connect(server_url, { secure: true })

		socket.on('signal', this.gotMessageFromServer)

		socket.on('connect', () => {
			//emits join-call, url is passed
			socket.emit('join-call', window.location.href)
			socketId = socket.id
			
			//when a user joins the connection(meet)
			socket.on('user-joined', (id, clients) => {
				clients.forEach((socketListId) => {
					connections[socketListId] = new RTCPeerConnection(peerConnectionConfig)
					// Wait for their ice candidate       
					connections[socketListId].onicecandidate = function (event) {
						if (event.candidate != null) {
							socket.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
						}
					}

					// Wait for their video stream
					connections[socketListId].onaddstream = (event) => {
						// TODO mute button, full screen button
						var searchVideo = document.querySelector(`[data-socket="${socketListId}"]`)
						if (searchVideo !== null) { // if i don't do this check it makes an empty square
							searchVideo.srcObject = event.stream
						} else {
							elms = clients.length
							let main = document.getElementById('main')
							let cssProperty = this.changeCssVideos(main)

							let video = document.createElement('video')

							let css = {minWidth: cssProperty.minWidth, minHeight: cssProperty.minHeight, maxHeight: "100%", margin: "10px",
								borderStyle: "solid", borderColor: "#bdbdbd", objectFit: "fill"}
							for(let i in css) video.style[i] = css[i]

							video.style.setProperty("width", cssProperty.width)
							video.style.setProperty("height", cssProperty.height)
							video.setAttribute('data-socket', socketListId)
							video.srcObject = event.stream
							video.autoplay = true
							video.playsinline = true
							//add the video to the screen
							main.appendChild(video)
						}
					}

					// Add the local video stream
					if (window.localStream !== undefined && window.localStream !== null) {
						connections[socketListId].addStream(window.localStream)
					} else {
						//video is off
						let videoAudio = (...args) => new MediaStream([this.black(...args), this.silence()])
						window.localStream = videoAudio()
						connections[socketListId].addStream(window.localStream)
					}
				})
				//if we are the joined user 
				if (id === socketId) {
					this.streamForAllConnections(false)
				}
			})
			//when a user leaves meeting
			socket.on('user-left', (id) => {
				let video = document.querySelector(`[data-socket="${id}"]`)
				if (video !== null) {
					elms--
					//remove the user's video
					video.parentNode.removeChild(video)

					let main = document.getElementById('main')
					//change the css properties of other videos
					this.changeCssVideos(main)
				}
			})
		})
	}

	//to silence audio of muted user
	silence = () => {
		//returns a new AudioContext object.
		let ctx = new AudioContext()
		//creates an OscillatorNode, a source representing a periodic waveform
		let oscillator = ctx.createOscillator()
		//creates a new MediaStreamAudioDestinationNode object associated with a WebRTC
		let dst = oscillator.connect(ctx.createMediaStreamDestination())
		oscillator.start()
		ctx.resume()
		//disables the audio stream and return
		return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
	}

	//turn off video and display black color
	black = ({ width = 640, height = 480 } = {}) => {
		//creates a canvas element at the place where video of user was streamed
		let canvas = Object.assign(document.createElement("canvas"), { width, height })
		//fills with black
		canvas.getContext('2d').fillRect(0, 0, width, height)
		let stream = canvas.captureStream()
		//disables the audio stream and return
		return Object.assign(stream.getVideoTracks()[0], { enabled: false })
	}

	//if state of video/audio is changed, call getUserMedia
	handleVideo = () => this.setState({ video: !this.state.video }, () => this.getUserMedia())
	handleAudio = () => this.setState({ audio: !this.state.audio }, () => this.getUserMedia())

	//stop all the tracks and redirect to home page
	handleEndCall = () => {
		try {
			let tracks = this.localVideoref.current.srcObject.getTracks()
			tracks.forEach(track => track.stop())
		} catch (e) {}
		window.location.href = "/"
	}
	//gets username from user input
	handleUsername = (e) => this.setState({ username: e.target.value })

	//connects to the meet only if user enters username
	connect = () =>{
		if(this.state.username!=="")
			this.setState({ isUsername: false }, () => this.getMedia()) //getMedia called to stream user's video in meet page
		else
			alert("Enter username to join meet!")
	} 

	render() {
		return (
			<div>
				{this.state.isUsername === true ?
					//page that asks for device permissions and username appears before joining meet
					<div>
						<div className="username">
							<p style={{ margin: 0, fontWeight: "bold", paddingRight: "50px" }}>Set your username</p>
							<Input placeholder="Username" value={this.state.username} onChange={e => this.handleUsername(e)} />
							<Button variant="contained" color="primary" onClick={this.connect} style={{ margin: "10px" }}>Connect</Button>
						</div>

						<div className="container-1" style={{ justifyContent: "center", textAlign: "center" }}>
							<video id="my-video" ref={this.localVideoref} autoPlay muted ></video>
						</div>
					</div>
					:
					//meet page
					<div>
						<div className="btn-down">
							<IconButton style={{ color: "#424242" }} onClick={this.handleVideo}>
								{(this.state.video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
							</IconButton>

							<IconButton style={{ color: "#f44336" }} onClick={this.handleEndCall}>
								<CallEndIcon />
							</IconButton>

							<IconButton style={{ color: "#424242" }} onClick={this.handleAudio}>
								{this.state.audio === true ? <MicIcon /> : <MicOffIcon />}
							</IconButton>
						</div>

						<div className="container" id="#container">

							<Row id="main" className="flex-container" style={{ margin: 0, padding: 0 }}>
								<video id="my-video" ref={this.localVideoref} autoPlay muted style={{
									margin: "10px",objectFit: "fill",width: "100%",height: "100%"}}></video>
							</Row>
						</div>
					</div>
				}
			</div>
		)
	}
}

export default Meet;
