function Graph () {
    if (!(this instanceof Graph)) return new Graph()
    this.peers = new Set()
    this.graph = new jsnx.Graph()
    var color = d3.scale.category20()
    this.d3opts = {
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

Graph.prototype.addNode = function (info) {
    let node = info.peerid.substr(0, 3) 	
    let cabal = info.cabal.substr(0, 3)

    if (this.peers.has(node) === false) {
        this.peers.add(node)
        this.graph.addNode(node, { group: 0 })
        this.peers.forEach((i) => {
            this.graph.addEdgesFrom([[cabal, i], [i, cabal]])
        })
    }
    jsnx.draw(this.graph, this.d3opts) 

}
