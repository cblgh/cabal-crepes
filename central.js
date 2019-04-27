var express = require("express")
var CentralWSS = require("./wss")
var db = require("./db")
var app = express.app()
var port = 8899

var server = app.listen(port, () => {
    console.log("listening on port")
})
var central = new CentralWSS(server)

app.get("/", (req, res) => {
    res.send("you've reached central central, over.")
})
