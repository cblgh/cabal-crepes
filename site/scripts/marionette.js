document.addEventListener("DOMContentLoaded", load)

var commands = ["stat", "start", "stop", "connect", "disconnect", "spawn", "shutdown"]

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
        processMessage(evt.data)
    })
}

function instantiate (cmd) {
    var action = function () {
        var puppetid = document.getElementById("puppet").value
        POST({ url: `${cmd}/${puppetid}`, cb: log})
    }
    createButton(cmd, action)
}

function processMessage (msg) {
    console.log(msg)

    // if new node
    // addNode(msg)
}

function setupD3 () {
    var color = d3.scale.category20()
    var options = {
        element: "#canvas",
        withLabels: true, 
        height: 300,
        width:600,
        layoutAttr: {
            charge: -120,
            linkDistance: 80
        },
        nodeAttr: {
            r: 20,
            title: function(d) { return d.label}
        },
        nodeStyle: {
            fill: function(d) { 
                return color(d.data.group) 
            },
            stroke: "none"
        },
        labelStyle: {fill: "white"},
        edgeStyle: {
            fill: "#999"
        }
    }
}

function addNode () {
    // var peerList = new Set()
    // var nodeNum = 1
    // var localNode
    // var gotLocal = false
    socket.on("peer", function(info) {
        localNode = info.local_key.substr(0, 3) 	
        if (gotLocal == false) {
            G.addNodesFrom([localNode], { group: 1 })
            jsnx.draw(G, options) 
            gotLocal = true
        }

        peer = info.peer.substr(0, 3)
        if (peerList.has(peer) == false) {
            peerList.add(peer)
            G.addNode(peer, { group: 0 })
            peerList.forEach(function(i) {
                G.addEdgesFrom([[localNode, i], [i, localNode]])
            })
            jsnx.draw(G, options) 
        }
    })
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
