var WebSocket = require("ws")
var inherits = require("inherits")
var events = require("events")
var db = require("./db")

var NAMES = ["zilch", "ein", "zwei", "drei", "shi", "go", "sex", "siete", "hachi", "neuf", "diez"]

function CentralWSS (server) {
    if (!(this instanceof CentralWSS)) return new CentralWSS(server)
    events.EventEmitter.call(this)
    /* TODO when v1 working:
     * add sendJSON to ws.prototype 
     * add join(cabalkey) to puppet
     * ingest config to generate http & ws routes, generalizing the structure
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
        },
        "nickChanged": (data) => {
            var obj = { puppetid: "", newnick: "" , cabal: "", channel: ""}
            this.emit("message-posted", obj)
        }
    }

    this.wss = new WebSocket.Server({ server })
    this.sockets = []
    this.wss.on("connection", (ws) => {
        console.log("connection")
        /* refactor into this.heartMonitor function */
        ws.alive = true
        this.sockets.push(ws)
        var puppetid = this.sockets.length - 1
        this.name(puppetid, NAMES[puppetid])
        // TODO: fix heartbeat
        ws.on("pong", () => { ws.alive = true })
        var heartbeat = setInterval(() => {
            this.sockets.forEach((sock) => {
                if (!sock.alive) {
                    console.log(this.sockets.indexOf(sock))
                    // this.sockets.splice(this.sockets.indexOf(sock), 1)
                    sock.terminate()
                    clearInterval(heartbeat)
                }
                sock.alive = false
                sock.ping(() => {})
            })
        }, 1000)

        ws.on("message", (m) => { 
            console.log("received message: ", m)
            m = JSON.parse(m)
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

CentralWSS.prototype.name = function (puppetid, name) {
    db.write("wss set puppet name")
    this._send(puppetid, { type: "setNick", data: name})
}

CentralWSS.prototype.connect = function (puppetid) {
    this._send(puppetid, { type: "connect" })
}

CentralWSS.prototype.disconnect = function (puppetid) {
    this._send(puppetid, { type: "disconnect" })
}

CentralWSS.prototype.start = function (puppetid) {
    this._send(puppetid, { type: "startPosting" })
}

CentralWSS.prototype.stop = function (puppetid) {
    this._send(puppetid, { type: "stopPosting" })
}

CentralWSS.prototype.stat = function (puppetid) {
    console.log(this.sockets.length)
    if (!this.sockets[puppetid]) {
        console.log(`${puppetid}: no such puppet`)
        return
    } 
    console.log(`stat puppet#${puppetid}`)
}

CentralWSS.prototype._send = function (puppetid, obj) {
    if (!this.sockets[puppetid]) return 
    this.sockets[puppetid].send(JSON.stringify(obj))
}

CentralWSS.prototype.connectAll = function () {
}

CentralWSS.prototype.disconnectAll = function () {
}

CentralWSS.prototype.shutdownAll = function () {
}


inherits(CentralWSS, events.EventEmitter)

module.exports = CentralWSS
