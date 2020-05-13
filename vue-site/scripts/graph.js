const purple = "#8D52F4"
const teal = "#30D6C5"
const darkteal = "#1D8777"
const red = "#FF898C"
const gold = "#FBDC93"
const MUTED = -1
const DISTRUSTED = -2
const NORMAL = 0
/* jsnetworkx docs:
 * https://github.com/fkling/JSNetworkX/wiki/Drawing-graphs
 * http://jsnetworkx.org/api/#/v/v0.3.4/DiGraph
*/
function Graph () {
    if (!(this instanceof Graph)) return new Graph()
    this.peers = new Set()
    this.graph = new jsnx.DiGraph()
    this.d3opts = {
        element: "#canvas",
        withLabels: true, 
        edgeOffset: 20,
        // withEdgeLabels: true, /* uncomment me to add edge labels with weights */
        height: 300,
        width: 600,
        layoutAttr: {
            charge: -200,
            linkDistance: 120
        },
        nodeAttr: {
            r: 20,
            title: function(d) { return d.label}
        },
        nodeStyle: {
            fill: function(d) { 
                if (d.data.group === MUTED) return red
                else if (d.data.group === DISTRUSTED) return darkteal
                // normal node
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
            "stroke-width": function (d) {
                const base = 6
                if (d.G.hasEdge(d.edge[1], d.edge[0])) return base - 3
                return base
            },
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

Graph.prototype.addNode = function (info, redraw) {
    let node = info.nick

    if (this.peers.has(node) === false) {
        this.peers.add(node)
        this.graph.addNode(node, { group: info.muted ? -1 : 0, peerid: info.peerid })
    }
    if (typeof redraw === "undefined" || redraw) {
        jsnx.draw(this.graph, this.d3opts) 
    }
}

Graph.prototype.updateNode = function (info) {
    this.removeNode(info, false)
    this.addNode(info, true)
}

Graph.prototype.removeNode = function (info, redraw) {
    let node = info.nick 	
    this.peers.delete(node)
    this.graph.removeNode(node)
    if (typeof redraw === "undefined" || redraw) {
        jsnx.draw(this.graph, this.d3opts) 
    }
}
