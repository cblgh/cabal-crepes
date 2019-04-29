var WebSocket = require("ws")
var inherits = require("inherits")
var events = require("events")

function CentralWSS (server) {
    if (!(this instanceof CentralWSS)) return new CentralWSS(server)
    events.EventEmitter.call(this)
    /* TODO when v1 working:
     * add sendJSON to ws.prototype 
     * add join(cabalkey) to puppet
     * */

    this.wsevents = {
        "register": (data) => {
            var obj = { puppetid: "", cabal: "" }
            this.emit("puppet-registered", data)
        },
        "deregister": (data) => {
            var obj = { puppetid: "", cabal: "" }
            this.emit("puppet-deregistered", data)
        },
        "peerConnected": (data) => {
            var obj = { puppetid: "", peer: "", cabal: "" }
            this.emit("peer-connected", obj)
        },
        "peerDisconnected": (data) => {
            var obj = { puppetid: "", peer: "", cabal: "" }
            this.emit("peer-disconnected", obj)
        },
        "messageReceived": (data) => {
            var obj = { puppetid: "", epoch: "", contents: "" , cabal: "", channel: ""}
            this.emit("message-received", obj)
        },
        "messagePosted": (data) => {
            var obj = { puppetid: "", epoch: "", contents: "" , cabal: "", channel: ""}
            this.emit("message-posted", obj)
        }
        "nickChanged": (data) => {
            var obj = { puppetid: "", newnick: "" , cabal: "", channel: ""}
            this.emit("message-posted", obj)
        }
    }

    this.wss = new WebSocket.Server({ server })
    this.sockets = []
    this.wss.on("connection", (ws) => {
        /* refactor into this.heartMonitor function */
        ws.alive = true
        this.sockets.push(ws)
        ws.on("pong", () => { ws.isAlive = true })
        setInterval(() => {
            this.sockets.forEach((ws) => {
                if (!ws.alive) {
                    this.sockets.splice(this.sockets.indexOf(ws), 1)
                    ws.terminate()
                }
                ws.alive = false
                ws.ping(() => {})
            })
        }, 1000)

        ws.on("message", (m) => { 
            m = JSON.parse(m)
            console.log("received message: ", m)
            if (m.type in this.wsevents) this.wsevents[m.type](m.data) 
        })
    })
}
/* disconnect from cabal
 * connect to cabal
 * shutdown puppets
 * post message
 *
*/

CentralWSS.prototype.name= function (puppetid, name) {
    this._send(puppetid, { type: "setNick", data: name})
}

CentralWSS.prototype.connect = function (puppetid) {
    this._send(puppetid, { type: "connect" })
}

CentralWSS.prototype.connectAll = function () {
}

CentralWSS.prototype.disconnect = function (puppetid) {
    this._send(puppetid, { type: "disconnect" })
}

CentralWSS.prototype.disconnectAll = function () {
}

CentralWSS.prototype.shutdownAll = function () {
}

CentralWSS.prototype.start = function (puppetid) {
    this._send(puppetid, { type: "startPosting" })
}

CentralWSS.prototype.stop = function (puppetid) {
    this._send(puppetid, { type: "stopPosting" })
}

CentralWSS.prototype._send = function (puppetid, obj) {
    if (!this.sockets[puppetid]) return 
    this.sockets[puppetid].send(JSON.stringify(obj))
}

inherits(CentralWSS, events.EventEmitter)

module.exports = CentralWSS
