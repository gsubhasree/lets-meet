var expect = require("chai").expect;
const request = require("request");
const app = require("../app").server;
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