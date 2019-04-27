var Headless = require('./headless')
var key = process.argv[2] || 'cabal://9c010443f6516ea635aef5ccc2025a3ab67c70a59791aa10f1e5f1da59f77f4e'

var headless = Headless(key)
headless.nick('headless')
headless.post(new Date().toUTCString())

headless.onPeerConnected((peerId) => {
  console.log(`${peerId} connected`)
  console.log('got peers', headless.peers())
})

headless.onPeerDisconnected((peerId) => {
  console.log(`${peerId} left`)
})

headless.onMessageReceived((data) => {
  console.log(data)
})

headless.connect()
