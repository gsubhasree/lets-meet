import React, { Component } from 'react';
import "./HomePage.css"

class Meet extends Component {
  	constructor (props) {
		super(props)	
	}
	
	render() {
		return (
			<div className="container">	
				<div>
					<h1 style={{ fontSize: "45px" }}>Welcome to Meet</h1>
				</div>
			</div>
		)
	}
}

export default Meet;