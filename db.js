var fs = require("fs")
var rotate = require("log-rotate")

function Logger(opts) {
    if (!(this instanceof Logger)) return new Logger(opts)
    if (!opts) opts = {}
    this.method = opts.method || "stdout"
    this.style = opts.style || "human"
    this.file = "log.txt"
    // create a new log file for each session and rotate usage of them
    if (this.method === "file") {
        rotate(this.file, {count: 4}, function (err) {
            if (err) {
                console.error(err)
                throw err
            }
        })
    }
}

Logger.prototype.log = function (data) {
    // TODO: future method of hypercore
    switch (this.method) {
        case "file":
            this.save(data)
            break
        case "stdout": 
        default: 
            this.print(data)
            break
    }
}

Logger.prototype.print = function (data) {
    console.log(this.format(data))
}

Logger.prototype.save = function (data) {
    if (!this.ws) {
        this.ws = fs.createWriteStream(this.file, { flags: "a" })
    }
    this.ws.write(this.format(data)+"\n", (err) => { if (err) throw err })
}

Logger.prototype.format = function(d) {
    // TODO future style of stringified json objects for structured logging
    switch (this.style) {
        case "json":
            return JSON.stringify(d)
        case "csv":
            return `${d.cabal},${d.peerid},${new Date(d.time).toISOString()},${d.type}${d.data ? ','+d.data : ""}`
        case "human":
        default:
            return `[${d.cabal.slice(0,8)}:${d.peerid.slice(0,4)}] ${new Date(d.time).toISOString()} ${d.type} ${d.data ? '{'+d.data+'}' : ""}`
    }
}

module.exports = Logger
