var Headless = require('cabal-headless')
var thunky = require("thunky")
var WebSocket = require("ws")
var minimist = require("minimist")
var argv = minimist(process.argv.slice(2))
var fs = require("fs")
var configPath = argv.conf || "crepes.conf" 

var conf = ["", ""]
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
    this.cabalkey = cabalkey.replace("cabal://", "").replace("cbl://", "")
    this.ws = new WebSocket(server)
    this.headless = Headless(cabalkey, { temp: opts.temp || false })
    this.POST_INTERVAL = 5000 /* ms */
    this.localKey = thunky((cb) => {
        this.headless.id(cb)
    })

    this.ws.on("ping", () => {
        this.ws.ping(() => {})
        log("ping")
    })

    this.ws.on("pong", function () {
        log("pong")
    })

    this.ws.on("open", () => {
        log("open")
        this.register()
        this.ws.ping(() => {})
    })

    this.wsevents = {
        connect: () => {
            log("connect to swarm")
            this.headless.connect()
        },
        disconnect: () => {
            log("disconnect from swarm")
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
        }
    }

    this.ws.on("message", (m) => {
        m = JSON.parse(m)
        if (m.type in this.wsevents) this.wsevents[m.type](m.data)
    })

    this.headless.onPeerConnected((peerId) => {
        this.send({ type: "peerConnected", data: peerId})
        log(`${peerId} connected`)
        log(`${this.headless.peers().length()} peers connected`)
    })

    this.headless.onPeerDisconnected((peerId) => {
        this.send({ type: "peerDisconnected", data: peerId})
        log(`${peerId} left`)
    })

    this.headless.onMessageReceived((data) => {
        var peerId = data.key
        var contents
        if (data.value && data.value.content && data.value.content.text) {
            contents = data.value.content.text
        }
        this.send({ type: "messageReceived", data: { peerId, contents }})
    })
}

Puppet.prototype.init = function () {
    this.headless.nick('headless')
    this.headless.connect()
}

Puppet.prototype.send = function (obj) {
    this.localKey((key) => {
        obj["peerid"] = key
        obj["cabal"] = this.cabalkey
        this.ws.send(JSON.stringify(obj))
    })
}

Puppet.prototype.post = function (msg) {
    this.send(msg)
    this.headless.post({ message: msg.data })
}

Puppet.prototype.nick = function (nick) {
    log("change nick")
    this.headless.nick(nick)
    this.send({ type: "nickChanged", data: nick })
}

Puppet.prototype.startPosting = function () {
    if (this.postloop) {
        clearInterval(this.postloop)
    }
    this.postloop = startInterval(() => {
        this.post({ type: "messagePosted", data: "" + new Date().toUTCString() })
    }, this.POST_INTERVAL)
}

Puppet.prototype.stopPosting = function () {
    log("stop posting")
    if (this.postloop) {
        clearInterval(this.postloop)
    }
}

Puppet.prototype.register = function () {
    this.send({ type: "register", role: "puppet"})
}

function startInterval (f, interval) {
    f()
    return setInterval(f, interval)
}

function die (msg) {
    console.error(msg)
    process.exit(1)
}

function log (msg) {
    var time = new Date().toISOString().split("T")[1].split(".")[0]
    process.stdout.write(`[${time}] ${msg}\n`)
}

var puppet = new Puppet(key, addr, { temp: argv.temp })
puppet.init()
