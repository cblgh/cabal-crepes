var WebSocket = require("ws")

function CentralWSS (server) {
    this.events = {
        "register": (data) => {
        },
        "deregister": (data) => {
        },
        "peerConnected": (data) => {
        },
        "peerDisconnected": (data) => {
        },
        "messageReceived": (data) => {
        },
        "messagePosted": (data) => {
        }
    }

    this.wss = new WebSocket.Server({ server })
    this.sockets = []
    this.wss.on("connection", (ws) => {
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
            if (m.type in this.events) this.events[m.type](m.data) 
        })
    })
}

module.exports = CentralWSS
