var Headless = require('./headless')
var WebSocket = require("ws")
var minimist = require("minimist")
var argv = minimist(process.argv.slice(2))

if (!argv.addr) {
    console.error("ya gotta gimme a ws server with --addr <srv>")
    process.exit(0)
}

var key = argv.cabal || 'cabal://9c010443f6516ea635aef5ccc2025a3ab67c70a59791aa10f1e5f1da59f77f4e'

function Puppet (cabalkey, server, opts) {
    if (!(this instanceof Puppet)) return new Puppet(cabalkey, opts)
    if (!opts) opts = {}
    this.ws = new WebSocket(server)
    this.headless = Headless(cabalkey)
    this.POST_INTETRVAL = 5000 /* ms */

    this.wsevents = {
        connect: () => {
            this.headless.connect
        },
        disconnect: () => {
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
        console.log(`${peerId} connected`)
        console.log('got peers', this.headless.peers())
    })

    this.headless.onPeerDisconnected((peerId) => {
        this.send({ type: "peerDisconnected", data: peerId})
      console.log(`${peerId} left`)
    })

    this.headless.onMessageReceived((data) => {
        this.send({ type: "messageReceived", data: peerId})
      console.log(data)
    })
}

Puppet.prototype.init = function () {
    this.headless.nick('headless')
    this.headless.connect()
}

Puppet.prototype.send = function (obj) {
    this.ws.send(JSON.stringify(obj))
}

Puppet.prototype.post = function (msg) {
    this.send({ type: "messagePosted", data: msg })
}

Puppet.prototype.nick = function (nick) {
    console.log("change nick :))")
    this.headless.nick(nick)
    this.send({ type: "nickChanged", data: nick })
}

Puppet.prototype.startPosting = function () {
    if (this.postloop) {
        clearInterval(this.postloop)
    }
    this.postLoop = startInterval(() => {
        this.post({ type: "messagePosted", data: "" + new Date().toUTCString() })
    }, this.POST_INTERVAL)
}

Puppet.prototype.stopPosting = function () {
    if (this.postloop) {
        clearInterval(this.postloop)
    }
}

var puppet = new Puppet(key, argv.addr)
puppet.init()
