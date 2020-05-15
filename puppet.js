var Headless = require('cabal-headless')
var thunky = require("thunky")
var WebSocket = require("ws")
var minimist = require("minimist")
var argv = minimist(process.argv.slice(2))
var fs = require("fs")
var configPath = argv.conf || "crepes.conf" 
var conf = ["", ""]
var debug = require("debug")("crepes-puppet")

try {
    conf = fs.readFileSync(configPath).toString().split("\n").filter((l) => l.length > 0)
} catch (err) {
    if (!argv.addr) die("Running without crepes.conf: no --addr arg found, terminating")
    if (!argv.cabal) die("Running without crepes.conf: no --cabal arg found, terminating")
}

var key = argv.cabal || conf[0]
var addr = argv.addr || conf[1]

function Puppet (cabalkey, server, opts) {
    if (!(this instanceof Puppet)) return new Puppet(cabalkey, opts)
    if (!opts) opts = {}
    this.server = server
    this.cabalkey = cabalkey.replace("cabal://", "").replace("cbl://", "")
    this.headless = Headless(cabalkey, { temp: opts.temp || true })
    this.POST_INTERVAL = 8000 /* ms */
    this.SERVER_TIMEOUT = 8000 /* ms */ 
    this.localKey = thunky((cb) => {
        this.headless.id(cb)
    })
    this.dialogue = fs.readFileSync("./dialogue.txt").toString().split("\n")

    this.wsevents = {
        connect: () => {
            debug("connect to swarm")
            this.headless.connect()
        },
        disconnect: () => {
            debug("disconnect from swarm")
            this.headless.disconnect()
        },
        startPosting: () => {
            this.startPosting()
        },
        stopPosting: () => {
            this.stopPosting()
        },
        setNick: (nick) => {
            this.nick(nick)
        },
        trust: (data) => {
            this.trust(data)
        },
        mute: (data) => {
            this.mute(data)
        },
        unmute: (data) => {
            this.unmute(data)
        },
        shutdown: () => {
            debug("shutting down puppet")
            process.exit()
        }
    }

    this.headless.onPeerConnected((peerId) => {
        this.send({ type: "peerConnected", data: peerId})
        debug(`${peerId} connected`)
        debug(`${this.headless.peers().length} peers connected`)
    })

    this.headless.onPeerDisconnected((peerId) => {
        this.send({ type: "peerDisconnected", data: peerId})
        debug(`${peerId} left`)
    })

    this.headless.onMessageReceived((data) => {
        var peerid = data.key
        var contents
        if (data.value && data.value.content && data.value.content.text) {
            contents = data.value.content.text
        }
        this.send({ type: "messageReceived", data: { peerid, contents }})
    })
}

Puppet.prototype._retryWebsocket = function () {
    this.setupWebsocket((err) => {
        if (err) { 
            debug(`still no wss connection. retrying in ${this.SERVER_TIMEOUT/1000}s`)
            setTimeout(this._retryWebsocket.bind(this), this.SERVER_TIMEOUT) 
            return
        }
        this.register()
    })
}

Puppet.prototype._heartbeat = function () {
    clearTimeout(this._timeout)
    this._timeout = setTimeout(() => {
        this.ws.terminate()
        debug("lost connection to websocket server, terminating")
        // debug(`lost connection to websocket server, trying to reestablish`)
        // this._retryWebsocket()
    }, this.SERVER_TIMEOUT)
}

Puppet.prototype.setupWebsocket = function (cb) {
    if (!cb) cb = function () {}
    this.ws = new WebSocket(this.server)

    this.ws.on("error", function (e) {
        cb(e)
    })

    this.ws.on("open", () => {
        debug("open")
        this.ws.ping(this._heartbeat.bind(this))
        cb(null)
    })

    this.ws.on("ping", () => {
        this.ws.ping(this._heartbeat.bind(this))
        debug("ping")
    })

    this.ws.on("pong", function () {
        clearTimeout(this._timeout)
        debug("pong")
    })

    this.ws.on("message", (m) => {
        m = JSON.parse(m)
        if (m.type in this.wsevents) this.wsevents[m.type](m.data)
    })
}


Puppet.prototype.init = function (cb) {
    this.setupWebsocket((err) => {
        if (err) { return cb(err) } 
        this.register()
        this.headless.nick('headless')
        this.headless.connect()
        cb(null)
    })
}

Puppet.prototype.send = function (obj) {
    this.localKey((key) => {
        obj["peerid"] = key
        obj["cabal"] = this.cabalkey
        this.ws.send(JSON.stringify(obj, null, 2))
    })
}

Puppet.prototype.post = function (msg) {
    this.send(msg)
    this.headless.post({ message: msg.data })
}

Puppet.prototype.nick = function (nick) {
    debug("change nick")
    this.headless.nick(nick)
    this.send({ type: "nickChanged", data: nick })
}

Puppet.prototype.startPosting = function () {
    if (this.postloop) {
        clearInterval(this.postloop)
    }
    const randomizedPostInterval = randomizePostInterval(this.POST_INTERVAL)
    this.postloop = startInterval(() => {
        this.post({ type: "messagePosted", data: this.getDialogueLine() })
    }, randomizedPostInterval)
}

function randomizePostInterval (base) {
    return Math.floor(Math.random() * base *  2) + base
}

Puppet.prototype.getDialogueLine = function () {
    return this.dialogue[Math.floor(this.dialogue.length * Math.random())]
}

Puppet.prototype.trust = function (data) {
    let msg = {
        type: "trust",
        content: {
            domain: "mutes",
            weight: data.weight,
            target: data.target
        }
    }
    this.headless.post(msg)
    this.send(msg)
}

Puppet.prototype.mute = function (data) {
    let msg = {
        type: "mute",
        content: {
            target: data.target
        }
    }
    this.headless.post(msg)
    this.send(msg)
}

Puppet.prototype.unmute = function (data) {
    let msg = {
        type: "unmute",
        content: {
            target: data.target
        }
    }
    this.headless.post(msg)
    this.send(msg)
}

Puppet.prototype.stopPosting = function () {
    debug("stop posting")
    if (this.postloop) {
        clearInterval(this.postloop)
    }
}

Puppet.prototype.register = function () {
    this.localKey((peerid) => {
        this.send({ type: "register", role: "puppet", peerid })
    })
}

function startInterval (f, interval) {
    f()
    return setInterval(f, interval)
}

function die (msg) {
    console.error(msg)
    process.exit(1)
}

// function log (msg) {
//     var time = new Date().toISOString().split("T")[1].split(".")[0]
//     process.stdout.write(`[${time}] ${msg}\n`)
// }

function setup () {
    var retryTime = argv.retry || 10000
    var puppet = new Puppet(key, addr, { temp: argv.temp })
    puppet.init((err) => {
        if (err) {
            debug(`couldn't connect to ${addr}`)
            debug(`retrying in ${retryTime/1000}s`)
            setTimeout(setup, retryTime)
        }
    })
}

setup()
