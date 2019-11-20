var WebSocket = require("ws")
var inherits = require("inherits")
var events = require("events")
var TrustNet = require("trust-net")

var NAMES = ["zilch", "ein", "zwei", "drei", "shi", "go", "sex", "siete", "hachi", "neuf"]

function CentralWSS (server) {
    if (!(this instanceof CentralWSS)) return new CentralWSS(server)
    events.EventEmitter.call(this)
    /* TODO when v1 working:
     * add sendJSON to ws.prototype 
     * add join(cabalkey) to puppet
     * ingest config to generate http & ws routes, generalizing the structure
     * */

    /* this.puppets = { sock: ws socket, connected: true, posting: false, posted: []) */
    this.puppets = {}
    this.consumers = []
    this.trustnets = {}

    this.wsevents = {
        "register": (data, sock) => {
            sock.role = data.role
            if (data.role === "consumer") { 
                this.consumers.push(sock)
                let socklessPuppets = JSON.parse(JSON.stringify(this.puppets))
                Object.keys(socklessPuppets).forEach((puppetid) => {
                    delete socklessPuppets[puppetid].sock
                })
                console.log(socklessPuppets)
                sock.send(JSON.stringify({ type: "initialize", data: JSON.stringify(socklessPuppets) }))
            }
            if (data.role === "puppet") {
                this.trustnets[data.peerid] = TrustNet()
                this.puppets[data.peerid] = { sock, connected: true, posting: false, posted: [], received: [], cabal: data.cabal, mutes: [], trust: [] }
                var puppetCount = Object.values(this.puppets).length - 1
                let name = puppetCount > 10
                    ? NAMES[parseInt(puppetCount/10)] + NAMES[puppetCount % 10]
                    : NAMES[puppetCount]
                this.name(data.peerid, name)
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
            let msg = data.data
            if (!(data.peerid in this.puppets)) return
            this.puppets[data.peerid].received.push({ author: msg.peerid, content: msg.contents, time: data.time})
            this.emit("messageReceived", data)
        },
        "messagePosted": (data) => {
            if (!(data.peerid in this.puppets)) return
            this.puppets[data.peerid].posted.push({ author: data.peerid, content: data.data, time: data.time})
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
                console.log("sock died, type of", sock.role)
                if (sock.role === "puppet") { 
                    Object.keys(this.puppets).forEach((puppetid) => { 
                        if (this.puppets[puppetid].sock === sock) {
                            delete this.puppets[puppetid]
                        }
                    })
                }
                if (sock.role === "consumer") { this.consumers.splice(this.consumers.indexOf(sock), 1) }
                this.sockets.splice(this.sockets.indexOf(sock), 1)
                sock.terminate()
                if (this.sockets.length === 0) {
                    // make sure all state is cleaned
                    this.puppets = {}
                    this.consumers = []
                }
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
    this.puppets[puppetid].nick = name
    return this._log(`set name to ${name} for `, puppetid)
}

CentralWSS.prototype.connect = function (puppetid) {
    this._send(puppetid, { type: "connect" })
    this.puppets[puppetid].connected = true
    return this._log("connect", puppetid)
}

CentralWSS.prototype.disconnect = function (puppetid) {
    this._send(puppetid, { type: "disconnect" })
    this.puppets[puppetid].connected = false
    return this._log("disconnect", puppetid)
}

CentralWSS.prototype.start = function (puppetid) {
    this._send(puppetid, { type: "startPosting" })
    this.puppets[puppetid].posting = true
    return this._log("start posting", puppetid)
}

CentralWSS.prototype.stop = function (puppetid) {
    this._send(puppetid, { type: "stopPosting" })
    this.puppets[puppetid].posting = false
    return this._log("stop posting", puppetid)
}

CentralWSS.prototype.state = function (puppetid) {
    if (!(puppetid in this.puppets)) return {}
    let state = JSON.parse(JSON.stringify(this.puppets[puppetid])) // clone
    delete state.sock
    return JSON.stringify(state)
    this._log("state", puppetid)
}

CentralWSS.prototype.shutdown = function (puppetid) {
    this._send(puppetid, { type: "shutdown" })
    return this._log("shutdown", puppetid)
}

CentralWSS.prototype.mute = function (originid, targetid) {
    let isMuted = this.puppets[originid].mutes.includes(targetid)
    if (!isMuted) this.puppets[originid].mutes.push(targetid) 
    return this._log("mute", originid)
}

CentralWSS.prototype.unmute = function (originid, targetid) {
    let i = this.puppets[originid].mutes.indexOf(targetid)
    if (i > -1) this.puppets[originid].mutes.splice(i, 1)
    return this._log("unmute", originid)
}

CentralWSS.prototype.trust = function (originid, targetid, amount) {
    let i = this.puppets[originid].trust.findIndex((t) => t.target === targetid)
    if (i === -1) { 
        this.puppets[originid].trust.push({ origin: originid, target: targetid, amount })
    } else {
        this.puppets[originid].trust[i].amount = amount 
    }
    /* TODO: only issue a load for the trust net when we have at least four trust assignments. (trust nodes?) */
    this._updateTrustNet().then(() => {
        console.log("ok let the consumers know that they should update :))")
        this._updateConsumers({ type: "trustNet", data: this._getAllMostTrusted() })
    })
    return "trust update issued by " + originid
}

CentralWSS.prototype._getAllMostTrusted = function () {
    let mostTrusted = {}
    for (let puppetid of Object.keys(this.puppets)) {
        if (this.puppets[puppetid].trust.length > 0) {
            mostTrusted[puppetid] = this.trustnets[puppetid].getMostTrusted()
        }
    }
    console.log("wss - most trusted:", mostTrusted)
    return mostTrusted
}

CentralWSS.prototype._send = function (puppetid, obj) {
    if (!(puppetid in this.puppets)) return 
    this.puppets[puppetid].sock.send(JSON.stringify(obj))
}

CentralWSS.prototype._updateConsumers = function (obj) {
    for (let consumer of this.consumers) {
        consumer.send(JSON.stringify(obj))
    }
}

CentralWSS.prototype._collectTrust = function () {
    let trustEdges = []
    for (let puppetid of Object.keys(this.puppets)) {
        trustEdges = trustEdges.concat(this.puppets[puppetid].trust)
    }
    return trustEdges.map((t) => { return { src: t.origin, dst: t.target, weight: t.amount } })
}

CentralWSS.prototype._updateTrustNet = async function () {
    return new Promise((res, rej) => {
        let trustEdges = this._collectTrust()
        console.log(trustEdges)
        let promises = []
        for (let puppetid of Object.keys(this.puppets)) {
            console.log(puppetid, this.puppets[puppetid].trust.length)
            if (this.puppets[puppetid].trust.length > 0) {
                promises.push(this.trustnets[puppetid].load(puppetid, trustEdges))
            }
        }
        console.log(promises)
        Promise.all(promises).then(() => { res() })
    })
}

CentralWSS.prototype.connectAll = function () {
}

CentralWSS.prototype.disconnectAll = function () {
}

CentralWSS.prototype.shutdownAll = function () {
}

CentralWSS.prototype._log = function (command, puppetid) {
    if (!(puppetid in this.puppets)) {
        msg = `${puppetid.slice(0, 3)}: no such puppet`
    }  else { 
        msg = `${command} puppet.${puppetid.slice(0, 3)}`
    }
    return msg
}


inherits(CentralWSS, events.EventEmitter)

module.exports = CentralWSS
