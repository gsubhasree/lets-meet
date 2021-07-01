import React, { Component } from 'react';

import io from 'socket.io-client'

import {Input, Button} from '@material-ui/core'

import { Row } from 'reactstrap'
import 'bootstrap/dist/css/bootstrap.css'
import "./Meet.css"

const server_url = "http://localhost:4001"

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
				})
			})
		})
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
						<div style={{background: "white", width: "30%", height: "auto", padding: "5px", minWidth: "400px",
								textAlign: "center", margin: "auto", marginTop: "10px", justifyContent: "center"}}>
							<p style={{ margin: 0, fontWeight: "bold", paddingRight: "50px" }}>Set your username</p>
							<Input placeholder="Username" value={this.state.username} onChange={e => this.handleUsername(e)} />
							<Button variant="contained" color="primary" onClick={this.connect} style={{ margin: "10px" }}>Connect</Button>
						</div>

						<div className="container-1" style={{ justifyContent: "center", textAlign: "center" }}>
							<video id="my-video" ref={this.localVideoref} autoPlay muted style={{
								borderStyle: "solid",borderColor: "#bdbdbd"}}></video>
						</div>
					</div>
					:
					//meet page
					<div>
						<div className="container" id="#container">

							<Row id="main" className="flex-container" style={{ margin: 0, padding: 0 }}>
								<video id="my-video" ref={this.localVideoref} autoPlay muted style={{
									borderStyle: "solid",borderColor: "#bdbdbd",margin: "10px",objectFit: "fill",
									width: "100%",height: "100%"}}></video>
							</Row>
						</div>
					</div>
				}
			</div>
		)
	}
}

export default Meet;
