document.addEventListener("DOMContentLoaded", load)

var commands = ["stat", "start", "stop", "connect", "disconnect"]

function el (node) {
    return document.createElement(node)
}

function load () {
    commands.forEach(instantiate)
    var rename = function () {
        var puppetid = document.getElementById("puppet").value
        var newName = document.getElementById("puppetname").value
        POST({ url: `name/${puppetid}/${newName}`, cb: log})
    }
    createButton("name", rename)
    engageWebsockets()
}

function engageWebsockets () {
    var socket = new WebSocket(window.location.toString().replace(/https?:\/\//, "ws://"))
    socket.addEventListener("open", function() {
        console.log("server started")
        socket.send(JSON.stringify({ type: "register", role: "consumer" }))
    })

    socket.addEventListener("message", function (evt) {
        console.log(evt)
        console.log(evt.data)
        log(evt.data)
    })
}

function instantiate (cmd) {
    var action = function () {
        var puppetid = document.getElementById("puppet").value
        POST({ url: `${cmd}/${puppetid}`, cb: log})
    }
    createButton(cmd, action)
}

function createButton (cmd, action) {
    var button = el("button")
    button.innerHTML = cmd
    button.onclick = action
    var controls = document.getElementById("controls")
    controls.append(button)
}


function POST (opts) {
    if (!opts.cb) opts.cb = noop
    var fetchOptions =  {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    }
    if (opts.data) { fetchOptions.body = JSON.stringify(opts.data) }
    fetch(window.location + opts.url, fetchOptions)
        .then(res => res.json()).then(opts.cb)
        .catch((err) => {
            console.error(err)
            log(`Error: ${opts.url} doesn't return json`)
        })
}

function log (msg) {
    if (typeof msg === 'object') { msg = msg.msg } // unpack
    var term = document.getElementById("terminal")
    var time = new Date().toISOString().split("T")[1].split(".")[0]
    var entry = el("div")
    entry.innerHTML = `[${time}] ${msg}`
    term.append(entry)
}

function noop () {}
