import React, { Component } from 'react';
import { Input, Button } from '@material-ui/core';
import { v4 as uuidv4} from 'uuid';
import {version, validate } from 'uuid';
import "./HomePage.css"

/* argument: uuid
	to check if the given uuid is valid v4 uuid */
function uuidValidateV4(uuid) {
  return validate(uuid) && version(uuid) === 4;
}

class HomePage extends Component {
  	constructor (props) {
		super(props)
		this.state = {
			url: ''
		}
	}
	//handle user-input and set url
	handleChange = (e) => this.setState({ url: e.target.value })

	//join meet with given url
	join = () => {
		//if url entered by user is not empty
		if (this.state.url !== "") {
			var url = this.state.url.split("/")
			//if its valid url (checks with uuidv4 pattern)
			if(uuidValidateV4(url[url.length-1])){
				//redirects to the meet
				window.location.href = `/${url[url.length-1]}`
			}
			else
				alert("Enter a valid url!")
		} else {
			alert("Please paste meet-link!");  //empty link
		}
	}
	//generates and redirects to meet url: randomized with uuid-version 4
	start =() =>{
    	var url=uuidv4()
		window.location.href = `/${url}`
	}

	render() {
		return (
			<div className="container">	
				<div>
					<h1 style={{ fontSize: "45px" }}>Let's Meet!</h1>
				</div>

				<div style={{
					background: "white", width: "30%", height: "auto", padding: "20px", minWidth: "400px",
					textAlign: "center", margin: "auto", marginTop: "100px"
				}}>
					<Button variant="contained" color="primary" onClick={this.start} style={{ margin: "20px" }}>Start</Button>
					<p style={{ margin: 0, fontWeight: "bold" }}>OR</p>
					<Input placeholder="paste url here" onChange={e => this.handleChange(e)} required/>
					<br></br>
					<Button variant="contained" color="primary" onClick={this.join} style={{ margin: "20px" }}>Join</Button>
				</div>
			</div>
		)
	}
}

export default HomePage;