const purple = "#8D52F4"
const teal = "#30D6C5"
const red = "#FF898C"

function Graph () {
    if (!(this instanceof Graph)) return new Graph()
    this.peers = new Set()
    this.graph = new jsnx.Graph()
    this.d3opts = {
        element: "#canvas",
        withLabels: true, 
        height: 300,
        width: 600,
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
                if (typeof d.data.group === "undefined") return red
                return purple
            },
            stroke: "none"
        },
        labelStyle: { fill: "white" },
        edgeStyle: { fill: teal }
    }
}

Graph.prototype.setEdge = function (src, dst) {
    this.graph.addEdge(src, dst)
    jsnx.draw(this.graph, this.d3opts) 
}

Graph.prototype.removeEdge = function (src, dst) {
    this.graph.removeEdge(src, dst)
    jsnx.draw(this.graph, this.d3opts) 
}

Graph.prototype.addNode = function (info) {
    let node = info.nick
    let cabal = info.cabal.substr(0, 3)

    if (this.peers.has(node) === false) {
        this.peers.add(node)
        this.graph.addNode(node, { group: 0, peerid: info.peerid, cabal: info.cabal })
        // this.peers.forEach((i) => {
        //     this.graph.addEdgesFrom([[cabal, i], [i, cabal]])
        // })
    }
    jsnx.draw(this.graph, this.d3opts) 
}

Graph.prototype.removeNode = function (info) {
    let node = info.nick 	
    this.peers.delete(node)
    this.graph.removeNode(node)
    jsnx.draw(this.graph, this.d3opts) 
}
