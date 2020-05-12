const purple = "#8D52F4"
const teal = "#30D6C5"
const red = "#FF898C"
const gold = "#FBDC93"

function Graph () {
    if (!(this instanceof Graph)) return new Graph()
    this.peers = new Set()
    this.graph = new jsnx.DiGraph()
    this.d3opts = {
        element: "#canvas",
        withLabels: true, 
        withEdgeLabels: true,
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
        edgeLabels: function (d) {
            return d.data.weight
        },
        labelStyle: { fill: "white" },
        edgeLabelStyle: { fill: purple },
        edgeStyle: { 
            fill: function (d) {
                // if edge in reverse direction exists, we have a bidirectional edge
                // colour it differently, to make it stand out
                if (d.G.hasEdge(d.edge[1], d.edge[0])) return gold
                return teal 
            }
        }
    }
}

Graph.prototype.setEdge = function (src, dst, weight) {
    this.graph.addEdge(src, dst, { weight })
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
