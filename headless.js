var Cabal = require('cabal-core')
var swarm = require('cabal-core/swarm.js')
var thunky = require("thunky")
var os = require('os')
var fs = require('fs')
var tools = require("./tools.js")

var homedir = os.homedir()
var rootdir = (homedir + `/.cabal/v${Cabal.databaseVersion}`)
var archivesdir = `${rootdir}/archives/`

/* TODO:
 *
 * emit:
 * on receive message
 * on peer connect
 * on peer disconnect
*/

module.exports = Headless
function Headless (key, opts) {
    if (!(this instanceof Headless)) return new Headless(key, opts)
    if (!opts) opts = {}
    this.key = tools.clean(key)
    this.db = archivesdir + this.key
    this.cabal = Cabal(this.db, this.key)
    this.instance = thunky((cb) => { this.cabal.db.ready(cb) })
}

Headless.prototype.post = function (message, messageType, channel) {
    if (!messageType) { messageType = "chat/text" }
    if (!channel) { channel = "default" }
    this.instance(() => {
        this.cabal.publish({
            type: messageType,
            content: {
                channel: channel,
                text: message
            }
        })
    })
}

Headless.prototype.nick = function (nick) {
    this.instance(() => {
        this.cabal.publishNick(nick)
    })
}

// join swarm
Headless.prototype.connect = function () {
    this.instance(() => {
        this.swarm = swarm(this.cabal)
    })
}

// leave swarm
Headless.prototype.disconnect = function () {
    this.instance(() => {
        if (this.swarm) {
            this.swarm.leave()
            this.swarm = null
        }
    })
}
