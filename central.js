var express = require("express")
var CentralWSS = require("./wss")
var db = require("./db")
var app = express()
var port = 8899

var server = app.listen(port, () => {
    console.log("listening on port", port)
})

var central = new CentralWSS(server)

app.get("/", (req, res) => {
    res.send("you've reached central central, over.")
})

app.post("/start/:puppet", (req, res) => {
    console.log("start puppet", req.params.puppet)
    central.start(req.params.puppet)
})

app.post("/stop/:puppet", (req, res) => {
    console.log("stop puppet", req.params.puppet)
    central.stop(req.params.puppet)
})

app.post("/disconnect/:puppet", (req, res) => {
    console.log("disconnect puppet", req.params.puppet)
    central.disconnect(req.params.puppet)
})

app.post("/connect/:puppet", (req, res) => {
    console.log("disconnect puppet", req.params.puppet)
    central.connect(req.params.puppet)
})

app.post("/name/:puppet/:name", (req, res) => {
    console.log(`rename puppet #${req.params.puppet} to ${req.params.name}`)
    central.name(req.params.puppet, req.params.name)
    res.status(200).send()
})

app.post("/shutdown", (req, res) => {
})
