var fs = require("fs")

function Logger(opts) {
    if (!(this instanceof Logger)) return new Logger(opts)
    if (!opts) opts = {}
    this.method = opts.method || "stdout"
    this.style = opts.style || "human"
    this.file = "log.txt"
}

Logger.prototype.log = function (data) {
    // TODO: future method of hypercore
    switch (this.method) {
        case "file":
            this.save(data)
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
    fs.writeFile(this.file, this.format(data)+"\n", (err) => { if (err) throw err })
}

Logger.prototype.format(d) {
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
