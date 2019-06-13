var WebSocket = require("ws")
var inherits = require("inherits")
var events = require("events")

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
            this.emit("register", data)
        },
        "deregister": (data) => {
            this.emit("deregister", data)
        },
        "peerConnected": (data) => {
            this.emit("peerConnected", data)
        },
        "peerDisconnected": (data) => {
            this.emit("peerDisconnected", data)
        },
        "messageReceived": (data) => {
            this.emit("messageReceived", data)
        },
        "messagePosted": (data) => {
            this.emit("messagePosted", data)
        },
        "nickChanged": (data) => {
            this.emit("nickChanged", data)
        }
    }

    this.wss = new WebSocket.Server({ server })
    this.sockets = []
    this.wss.on("connection", (ws) => {
        console.log("new puppet online")
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
                    // this.sockets.splice(this.sockets.indexOf(sock), 1)
                    // sock.terminate()
                    // clearInterval(heartbeat)
                }
                sock.alive = false
                sock.ping(() => {})
            })
        }, 10000)

        ws.on("message", (m) => { 
            // console.log("received message: ", m)
            m = JSON.parse(m)
            m["time"] = Date.now()
            if (m.type in this.wsevents) this.wsevents[m.type](m) 
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
