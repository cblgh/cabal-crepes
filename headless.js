var Cabal = require('cabal-core')
var swarm = require('cabal-core/swarm')
var thunky = require('thunky')
var os = require('os')
var tools = require('./tools')

var homedir = os.homedir()
var rootdir = (homedir + `/.cabal/v${Cabal.databaseVersion}`)
var archivesdir = `${rootdir}/archives/`

module.exports = Headless
function Headless (key, opts) {
  if (!(this instanceof Headless)) return new Headless(key, opts)
  if (!opts) opts = {}

  this.peerlist = new Set()
  this.key = tools.scrub(key)
  this.db = archivesdir + this.key
  this.cabal = Cabal(this.db, this.key)
  this.instance = thunky((cb) => this.cabal.db.ready(cb))
  this.instance(() => {
    this.cabal.on('peer-added', (peer) => this._addPeer(peer))
    this.cabal.on('peer-removed', (peer) => this._removePeer(peer))
  })
}

Headless.prototype.post = function (opts) {
  if (!opts) return
  if (typeof opts === 'string') { opts = { message: opts } }
  if (!opts.messageType) { opts.messageType = 'chat/text' }
  if (!opts.channel) { opts.channel = 'default' }
  this.instance(() => {
    this.cabal.publish({
      type: opts.messageType,
      content: {
        channel: opts.channel,
        text: opts.message
      }
    })
  })
}

Headless.prototype._addPeer = function (peer, cb) {
  if (!cb) { cb = tools.noop }
  this.instance(() => {
    this.cabal.getLocalKey((err, local) => {
      if (err) throw err
      if (peer === local) return
      this.peerlist.add(peer)
      cb(peer)
    })
  })
}

Headless.prototype._removePeer = function (peer, cb) {
  if (!cb) { cb = tools.noop }
  this.instance(() => {
    this.cabal.getLocalKey((err, local) => {
      if (err) throw err
      if (peer === local) return
      this.peerlist.delete(peer)
      cb(peer)
    })
  })
}

Headless.prototype.nick = function (nick) {
  this.instance(() => this.cabal.publishNick(nick))
}

// join swarm
Headless.prototype.connect = function () {
  this.instance(() => {
    if (!this.swarm) { this.swarm = swarm(this.cabal) }
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

Headless.prototype.onPeerConnected = function (cb) {
  this.instance(() => {
    this.cabal.on('peer-added', (peer) => this._addPeer(peer, cb))
  })
}

Headless.prototype.onPeerDisconnected = function (cb) {
  this.instance(() => {
    this.cabal.on('peer-dropped', (peer) => this._removePeer(peer, cb))
  })
}

Headless.prototype.onMessageReceived = function (cb) {
  this.instance(() => this.cabal.messages.events.on('message', cb))
}

Headless.prototype.peers = function () {
  return Array.from(this.peerlist)
}
