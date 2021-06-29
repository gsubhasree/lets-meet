import React, { Component } from 'react'
//to render routes based on path
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import Meet from './components/Meet'
import HomePage from './components/HomePage'

class App extends Component {
	render() {
		return (
			<div>
				<Router>
					<Switch>
						<Route path="/" exact component={HomePage} />
						<Route path="/:url" component={Meet} />
					</Switch>
				</Router>
			</div>
		)
	}
}

export default App;