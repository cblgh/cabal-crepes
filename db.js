function write (data) {
    console.log(format(data))
}

function format(d) {
    return `[${d.cabal.slice(0,8)}:${d.peerid.slice(0,4)}] ${new Date(d.time).toISOString()} ${d.type} ${d.data ? '{'+d.data+'}' : ""}`
}
module.exports = { write }
