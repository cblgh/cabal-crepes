var Headless = require('./headless')
var WebSocket = require("ws")

var addr = ""
var key = process.argv[2] || 'cabal://9c010443f6516ea635aef5ccc2025a3ab67c70a59791aa10f1e5f1da59f77f4e'

function Puppet (cabalkey, server) {
    this.ws = new WebSocket(addr)
    this.headless = Headless(key)

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
        this.send(ws, { type: "messageReceived", data: peerId})
      console.log(data)
    })
}

Puppet.prototype.init = function () {
    this.client.nick('headless')
    this.post(new Date().toUTCString())
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
}
