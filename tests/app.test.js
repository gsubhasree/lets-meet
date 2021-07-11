var expect = require("chai").expect;
const request = require("request");
const app = require("../app").server;
var io = require('socket.io-client')
let server;

describe("Server testing", function () {
    before((done) => {
        server = app.listen(4001, done());
    });

    it("Check Server", function (done) {
        var url = "http://localhost:4001/check";
        request.get(url, (error, _response, body) => {
            if (error) done(error);
            expect(body).to.be.an("string");
            expect(body).to.equal("Working");  
            done() 
        })
        
    })

    after((done) => {
        app.close(done());
    });
});

describe('socket connection testing', function() {

    var socket;

    beforeEach(function(done) {
        // Setup
        socket = io.connect('http://localhost:4001', {
            'reconnection delay' : 0
            , 'reopen delay' : 0
            , 'force new connection' : true
        });
        socket.on('connect', function() {
            console.log('worked...');
        });
        socket.on('disconnect', function() {
            console.log('disconnected...');
        })
        done();
    });

    afterEach(function(done) {
        // Cleanup
        if(socket.connected) {
            console.log('disconnecting...');
            socket.disconnect();
        } else {
            // There will not be a connection unless you have done() in beforeEach, socket.on('connect'...)
            console.log('no connection to break...');
        }
        done();
    });

    describe('tests', function() {

        it('Doing some things with indexOf()', function(done) {
            expect([1, 2, 3].indexOf(5)).to.be.equal(-1);
            expect([1, 2, 3].indexOf(0)).to.be.equal(-1);
            done();
        });

        it('Doing something else with indexOf()', function(done) {
            expect([1, 2, 3].indexOf(5)).to.be.equal(-1);
            expect([1, 2, 3].indexOf(0)).to.be.equal(-1);
            done();
        });

    });

});