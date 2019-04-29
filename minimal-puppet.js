var Headless = require('./headless')
var WebSocket = require("ws")

var addr = ""
var key = process.argv[2] || 'cabal://9c010443f6516ea635aef5ccc2025a3ab67c70a59791aa10f1e5f1da59f77f4e'

function Puppet (cabalkey, server) {
    this.ws = new WebSocket(addr)
    this.headless = Headless(key)
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
        setNick: (nick) = {
            this.nick(nick)
        }
    }

    this.ws.on("message", (m) => {
        m = JSON.parse(m)
        if (m.type in this.wsevents) this.wsevents[m](m.data)
    })

    this.client.onPeerConnected((peerId) => {
        this.send({ type: "peerConnected", data: peerId})
      console.log(`${peerId} connected`)
      console.log('got peers', this.client.peers())
    })

    this.client.onPeerDisconnected((peerId) => {
        this.send({ type: "peerDisconnected", data: peerId})
      console.log(`${peerId} left`)
    })

    this.client.onMessageReceived((data) => {
        this.send({ type: "messageReceived", data: peerId})
      console.log(data)
    })
}

Puppet.prototype.init = function () {
    this.client.nick('headless')
    this.client.connect()
}

Puppet.prototype.send = function (obj) {
    this.ws.send(JSON.stringify(obj))
}

Puppet.prototype.post = function (msg) {
    this.send({ type: "messagePosted", data: msg })
}

Puppet.prototype.nick = function (nick) {
    this.client.nick(nick)
    this.send({ type: "nickChanged", data: "newnick" })
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
