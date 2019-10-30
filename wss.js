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
    
    this.puppets = []
    this.consumers = []

    this.wsevents = {
        "register": (data, sock) => {
            sock.role = data.role
            if (data.role === "consumer") this.consumers.push(sock)
            if (data.role === "puppet") {
                this.puppets.push(sock)
                var puppetid = this.puppets.length - 1
                this.name(puppetid, NAMES[puppetid])
                this.emit("register", data)
                console.log("new puppet online")
            }
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
    var heartbeat = setInterval(() => {
        this.sockets.forEach((sock) => {
            if (!sock.alive) {
                console.log("sock died")
                if (sock.role === "puppet") { this.puppets.splice(this.puppets.indexOf(sock), 1) }
                if (sock.role === "consumer") { this.consumers.splice(this.consumers.indexOf(sock), 1) }
                this.sockets.splice(this.sockets.indexOf(sock), 1)
                sock.terminate()
            }
            sock.alive = false
            sock.ping(() => {})
        })
    }, 5000)

    this.wss.on("listening", () => {
        console.log("wss started")
    })

    this.wss.on("connection", (ws) => {
        console.log("incoming connection")
        /* refactor into this.heartMonitor function */
        ws.alive = true
        this.sockets.push(ws)
        ws.on("pong", () => { ws.alive = true })
        ws.ping(() => {})

        ws.on("message", (m) => { 
            // forward to consumers
            this.consumers.forEach((c) => c.send(m))
            // parse
            m = JSON.parse(m)
            m["time"] = Date.now()
            if (m.type in this.wsevents) this.wsevents[m.type](m, ws) 
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
    return this._log(`set name to ${name} for `, puppetid)
}

CentralWSS.prototype.connect = function (puppetid) {
    this._send(puppetid, { type: "connect" })
    return this._log("connect", puppetid)
}

CentralWSS.prototype.disconnect = function (puppetid) {
    this._send(puppetid, { type: "disconnect" })
    return this._log("disconnect", puppetid)
}

CentralWSS.prototype.start = function (puppetid) {
    this._send(puppetid, { type: "startPosting" })
    return this._log("start posting", puppetid)
}

CentralWSS.prototype.stop = function (puppetid) {
    this._send(puppetid, { type: "stopPosting" })
    return this._log("stop posting", puppetid)
}

CentralWSS.prototype.stat = function (puppetid) {
    return this._log("stat", puppetid)
}

CentralWSS.prototype.shutdown = function (puppetid) {
    this._send(puppetid, { type: "shutdown" })
    return this._log("shutdown", puppetid)
}

CentralWSS.prototype._send = function (puppetid, obj) {
    if (!this.puppets[puppetid]) return 
    this.puppets[puppetid].send(JSON.stringify(obj))
}

CentralWSS.prototype.connectAll = function () {
}

CentralWSS.prototype.disconnectAll = function () {
}

CentralWSS.prototype.shutdownAll = function () {
}

CentralWSS.prototype._log = function (command, puppetid) {
    if (!this.puppets[puppetid]) {
        msg = `${puppetid}: no such puppet`
    }  else { 
        msg = `${command} puppet#${puppetid}`
    }
    return msg
}


inherits(CentralWSS, events.EventEmitter)

module.exports = CentralWSS
