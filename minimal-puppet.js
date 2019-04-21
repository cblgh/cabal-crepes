var Headless = require("./headless")
var key = process.argv[2] || "cabal://9c010443f6516ea635aef5ccc2025a3ab67c70a59791aa10f1e5f1da59f77f4e" 

var headless = Headless(key)
headless.nick("headless")
headless.post(new Date().toUTCString())
headless.connect()
