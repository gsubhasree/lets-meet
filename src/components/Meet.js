import React, { Component } from 'react';

import io from 'socket.io-client'

import { changeCssVideos } from '../utils/videoDimension';
import { black,silence } from '../utils/blackSilence';

import {IconButton, Badge, Input, Button} from '@material-ui/core'
import VideocamIcon from '@material-ui/icons/Videocam'
import VideocamOffIcon from '@material-ui/icons/VideocamOff'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import StopScreenShareIcon from '@material-ui/icons/StopScreenShare'
import CallEndIcon from '@material-ui/icons/CallEnd'
import ChatIcon from '@material-ui/icons/Chat'


import { Row } from 'reactstrap'
import Modal from 'react-bootstrap/Modal'
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
			screen: false,
			showModal: false,
			isScreen: false,
			messages: [],
			message: "",
			newmessages: 0,
			isUsername: true,
			username: "",
		}

		connections={}
		this.getPermissions()
	}

	//to get user permission for audio,video access and screensharing
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
			//set isScreen 
			if (navigator.mediaDevices.getDisplayMedia) {
				this.setState({ isScreen: true })
			} else {
				this.setState({ isScreen: false })
			}
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

	//for streaming according to current state
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

		//when a user turns off video or mutes microphone 
		stream.getTracks().forEach(track => track.onended = () => {
			this.setState({
				video: false,
				audio: false,
			}, () => {
				this.stopTrack()
				//update for all connections
				this.streamForAllConnections(true)
			})
		})
	}
	//to share screen if enabled
	getDislayMedia = () => {
		if (this.state.screen) {
			if (navigator.mediaDevices.getDisplayMedia) {
				navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
					.then(this.getDislayMediaSuccess)
					.then((stream) => {})
					.catch((e) => console.log(e))
			}
		}
	}
	//function works similar to getUserMediaSuccess, difference is uses isScreen instead of video and audio
	getDislayMediaSuccess = (stream) => {
		try {
			window.localStream.getTracks().forEach(track => track.stop())
		} catch(e) { console.log(e) }

		window.localStream = stream
		this.localVideoref.current.srcObject = stream

		//to stream for all connections other then self
		this.streamForAllConnections(false)

		//when a user stops sharing screen
		stream.getTracks().forEach(track => track.onended = () => {
			this.setState({
				screen: false,
			}, () => {
				//stop the stream
				this.stopTrack()
				//to check if video should be streamed
				this.getUserMedia()
			})
		})
	}
	//to stream for all connections
	streamForAllConnections =(selfStream)=>{
		for (let id in connections) {
			//if selfstream is false, dont stream for same socketId
			if(id === socketId)
				if(!selfStream) continue

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
	//to stop streaming
	stopTrack = ()=>{
		try {
			let tracks = this.localVideoref.current.srcObject.getTracks()
			tracks.forEach(track => track.stop())
		} catch(e) { console.log(e) }
		//videoAudio:to display black color for turned off video(black) & silence the audio for muted microphone (silence)
		let videoAudio = (...args) => new MediaStream([black(...args), silence()])
		window.localStream = videoAudio()
		this.localVideoref.current.srcObject = window.localStream
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
							let cssProperty = changeCssVideos(main,elms)

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
						let videoAudio = (...args) => new MediaStream([black(...args), silence()])
						window.localStream = videoAudio()
						connections[socketListId].addStream(window.localStream)
					}
				})
				//if we are the joined user 
				if (id === socketId) {
					this.streamForAllConnections(false)
				}
			})
			
			socket.on('chat-message', this.addMessage)

			//when a user leaves meeting
			socket.on('user-left', (id) => {
				let video = document.querySelector(`[data-socket="${id}"]`)
				if (video !== null) {
					elms--
					//remove the user's video
					video.parentNode.removeChild(video)

					let main = document.getElementById('main')
					//change the css properties of other videos
					changeCssVideos(main,elms)
				}
			})
		})
	}

	/*functions to handle camera, mic and screenshare options:
	 change the state of video/audio and call getUserMedia */
	handleVideo = () => this.setState({ video: !this.state.video }, () => this.getUserMedia())
	handleAudio = () => this.setState({ audio: !this.state.audio }, () => this.getUserMedia())
	//change the state of screen and call getDislayMedia
	handleScreen = () => this.setState({ screen: !this.state.screen }, () => this.getDislayMedia())

	//stop all the tracks and redirect to home page
	handleEndCall = () => {
		try {
			let tracks = this.localVideoref.current.srcObject.getTracks()
			tracks.forEach(track => track.stop())
		} catch (e) {}
		window.location.href = "/"
	}
	openChat = () => this.setState({ showModal: true, newmessages: 0 })
	closeChat = () => this.setState({ showModal: false })
	handleMessage = (e) => this.setState({ message: e.target.value })
	//appends message
	addMessage = (data, sender, socketIdSender) => {
		this.setState(prevState => ({
			messages: [...prevState.messages, { "sender": sender, "data": data }],
		}))
		if (socketIdSender !== socketId) {
			this.setState({ newmessages: this.state.newmessages + 1 })
		}
	}
	
	sendMessage = () => {
		socket.emit('chat-message', this.state.message, this.state.username)
		this.setState({ message: "", sender: this.state.username })
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

							{this.state.isScreen === true ?
								<IconButton style={{ color: "#424242" }} onClick={this.handleScreen}>
									{this.state.screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
								</IconButton>
							: null}
							<Badge badgeContent={this.state.newmessages} max={999} color="secondary" onClick={this.openChat}>
								<IconButton style={{ color: "#424242" }} onClick={this.openChat}>
									<ChatIcon />
								</IconButton>
							</Badge>
						</div>

						<Modal show={this.state.showModal} onHide={this.closeChat} style={{ position: "absolute", bottom: "0px",
  						right: "0px",zIndex: "999999" }}>
							<Modal.Header closeButton>
								<Modal.Title>Chat</Modal.Title>
							</Modal.Header>
							<Modal.Body style={{ overflow: "auto", overflowY: "auto", height: "400px", textAlign: "left" }} >
								{this.state.messages.length > 0 ? this.state.messages.map((item, index) => (
									<div key={index} style={{textAlign: "left"}}>
										<p style={{ wordBreak: "break-all" }}><b>{item.sender}</b>: {item.data}</p>
									</div>
								)) : <p>No message yet</p>}
							</Modal.Body>
							<Modal.Footer className="div-send-msg">
								<Input placeholder="Message" value={this.state.message} onChange={e => this.handleMessage(e)} />
								<Button variant="contained" color="primary" onClick={this.sendMessage}>Send</Button>
							</Modal.Footer>
						</Modal>

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
