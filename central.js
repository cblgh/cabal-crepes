var express = require("express")
var CentralWSS = require("./wss")
var db = require("./db")
var app = express()
var port = 8899

var server = app.listen(port, () => {
    console.log("listening on port", port)
})

var central = new CentralWSS(server)


Object.keys(central.wsevents).forEach((type) => central.on(type, db.write))

app.get("/", (req, res) => {
    res.send("you've reached central central, over.")
})

app.post("/start/:puppet", (req, res) => {
    console.log("start puppet", req.params.puppet)
    central.start(req.params.puppet)
    res.status(200).send()
})

app.post("/stop/:puppet", (req, res) => {
    console.log("stop puppet", req.params.puppet)
    central.stop(req.params.puppet)
    res.status(200).send()
})

app.post("/stat/:puppet", (req, res) => {
    central.stat(req.params.puppet)
    res.status(200).send()
})

app.post("/disconnect/:puppet", (req, res) => {
    console.log("disconnect puppet", req.params.puppet)
    central.disconnect(req.params.puppet)
    res.status(200).send()
})

app.post("/connect/:puppet", (req, res) => {
    console.log("disconnect puppet", req.params.puppet)
    central.connect(req.params.puppet)
    res.status(200).send()
})

app.post("/name/:puppet/:name", (req, res) => {
    console.log(`rename puppet #${req.params.puppet} to ${req.params.name}`)
    central.name(req.params.puppet, req.params.name)
    res.status(200).send()
})

app.post("/shutdown", (req, res) => {
})
