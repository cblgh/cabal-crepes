var express = require("express")
var CentralWSS = require("./wss")
var Logger = require("./db")
var static = require("serve-static")
var path = require("path")
var { spawn } = require("child_process")
var debug = require("debug")("crepes")

var public = path.join(__dirname, "/vue-site")
var app = express()
app.use(static(public))
var port = 8877

var server = app.listen(port, () => {
    debug("listening on port", port)
})

var central = new CentralWSS(server)
var db = new Logger({ method: "file" })

Object.keys(central.wsevents).forEach((type) => central.on(type, function (evt) {
    db.log(evt)
}))

app.post("/start/:puppet", (req, res) => {
    debug("start puppet", req.params.puppet)
    var msg = central.start(req.params.puppet)
    res.json({ msg }).send()
})

app.post("/stop/:puppet", (req, res) => {
    debug("stop puppet", req.params.puppet)
    var msg = central.stop(req.params.puppet)
    res.json({ msg }).send()
})

app.post("/state/:puppet", (req, res) => {
    debug("get state for puppet", req.params.puppet)
    var msg = central.state(req.params.puppet)
    res.json({ msg }).send()
})

app.post("/disconnect/:puppet", (req, res) => {
    debug("disconnect puppet", req.params.puppet)
    var msg = central.disconnect(req.params.puppet)
    res.json({ msg }).send()
})

app.post("/connect/:puppet", (req, res) => {
    debug("connect puppet", req.params.puppet)
    var msg = central.connect(req.params.puppet)
    res.json({ msg }).send()
})

app.post("/name/:puppet/:name", (req, res) => {
    debug(`rename puppet #${req.params.puppet} to ${req.params.name}`)
    var msg = central.name(req.params.puppet, req.params.name)
    res.json({ msg }).send()
})

app.post("/spawn/:puppet", (req, res) => {
    debug("spawning new puppet")
    spawn("npm", ["run", "puppet"], { stdio: "inherit" })
    res.json( {msg: "success"} ).send()
})

app.post("/shutdown/:puppet", (req, res) => {
    debug("shutdown puppet", req.params.puppet)
    var msg = central.shutdown(req.params.puppet)
    res.json({ msg }).send()
})

app.post("/trust/:origin/:target/:amount", (req, res) => {
    debug(`trust ${req.params.amount} assigned for puppet #${req.params.target} by ${req.params.origin}`)
    var msg = central.trust(req.params.origin, req.params.target, req.params.amount)
    res.json({ msg }).send()
})

app.post("/distrust/:origin/:target/:bool", (req, res) => {
    const bool = req.params.bool === "true"
    debug(`distrust ${bool ? 'issued' : 'revoked'} for puppet ${req.params.target.slice(0,3)} by ${req.params.origin.slice(0,3)}`)
    var msg = central.distrust(req.params.origin, req.params.target, bool)
    res.json({ msg }).send()
})

app.post("/mute/:origin/:target", (req, res) => {
    debug(`mute issued for puppet #${req.params.target} by ${req.params.origin}`)
    var msg = central.mute(req.params.origin, req.params.target)
    res.json({ msg }).send()
})

app.post("/unmute/:origin/:target", (req, res) => {
    debug(`unmute issued for puppet #${req.params.target} by ${req.params.origin}`)
    var msg = central.unmute(req.params.origin, req.params.target)
    res.json({ msg }).send()
})

app.post("/most-trusted/:puppet/", (req, res) => {
    debug("get most trusted for", req.params.puppet)
    var msg = central.mostTrusted(req.params.puppet)
    res.json({ msg }).send()
})
