const mocha = require("mocha");
const { getExternalIP } = require("../lib");

describe("test", function() {

    it("test", function(done) {
        getExternalIP().then(function (t) {
            if (/\d+\.\d+\.\d+\.\d+/.test(t)) {
                console.log("got ip", t);
                done();
            } else {
                done(new Error("error : value " + t))
            }
        });
    });
});
