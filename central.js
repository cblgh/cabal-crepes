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

app.post("/start/:puppet", (req, res) => {
    console.log("start puppet", req.puppet)
    central.start(req.puppet)
})

app.post("/stop/:puppet", (req, res) => {
    console.log("stop puppet", req.puppet)
    central.stop(req.puppet)
})

app.post("/disconnect/:puppet", (req, res) => {
    console.log("disconnect puppet", req.puppet)
    central.disconnect(req.puppet)
})

app.post("/connect/:puppet", (req, res) => {
    console.log("disconnect puppet", req.puppet)
    central.connect(req.puppet)
})

app.post("/name/:puppet", (req, res) => {
    central.name(req.puppet)
})

app.post("/shutdown", (req, res) => {
})
