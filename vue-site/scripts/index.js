/*
Vue.component("base-component", {
    template: `
    <div>
    </div>
    `,
    props: [],
    methods: {
    },
    computed: {
    },
    data () {
        return {

        },
    }
})
*/

let scenarios = {}

async function wait (ms) {
    return new Promise((res) => {
        setTimeout(() => res(), ms)
    })
}

/*
 a trusts [b, c]
 c trusts d
 x trusts z

 outcome:
 we should see from a's POV that we have a, b and c in our trust network
 */
scenarios["one"] = function () {
    // spawn 6 puppets
    this.sendCommand('spawn') // 0
    this.sendCommand('spawn') // 1
    this.sendCommand('spawn') // 2
    this.sendCommand('spawn') // 3
    this.sendCommand('spawn') // 4
    this.sendCommand('spawn') // 5
    let trust = (src, dst) => {
        this.currentPuppet = src
        this.trustSelect = 0.8
        this.trustidSelect = dst
        this.setTrust()
    }
    // setTimeout(async () => {
    //     let zilch = this.idFromName("zilch")    // a
    //     let ein = this.idFromName("ein")        // b
    //     let zwei = this.idFromName("zwei")      // c
    //     let drei = this.idFromName("drei")      // d
    //     let shi = this.idFromName("shi")        // x
    //     let go = this.idFromName("go")          // y
    //     trust(zilch, ein)
    //     await wait(8000)
    //     trust(zilch, zwei)
    //     await wait(8000)
    //     trust(ein, drei)
    //     await wait(8000)
    //     trust(shi, go)
    // }, 5000)
}

Vue.component("base-view", {
    template: `
        <div class="container">
            <div class="panels">
                <div class="column">
                    <div id="canvas"></div>
                    <div class="controls">
                        <h3 v-if="currentPuppet.length > 0">{{ puppetNick(currentPuppet) }}:{{ currentPuppet.slice(0, 3) }}</h3>
                        <template v-if="currentPuppet.length > 0">
                            <select id="puppet" placeholder="currentPuppet" v-model="currentPuppet">
                                <option v-for="puppet in puppets" :value="puppet.peerid">{{ puppet.nick }}</option>
                            </select>
                            <button @click="toggleConnect()">{{ curr.connected ? "disconnect" : "connect" }}</button>
                            <button @click="togglePosting()">{{ curr.posting ? "stop posting" : "start posting" }}</button>
                            <button @click="shutdown()">shutdown</button>
                            <div class="spacer"></div>
                            <button @click="toggleMute()"> {{ currentMutes.includes(muteSelect) ? "unmute" : "mute" }} </button>
                            <select v-model="muteSelect">
                                <option v-for="id in everyoneButMe" :value="id"> {{ puppets[id].nick }}</option>
                            </select>
                            <div class="quarter-spacer"></div>
                            <button @click="setTrust()"> trust </button>
                            <select v-model="trustidSelect">
                                <option v-for="id in everyoneButMe" :value="id"> {{ puppets[id].nick }}</option>
                            </select>
                                <select v-model="trustSelect">
                                    <option v-for="val in [0.0, 0.25, 0.50, 0.80, 1.0]" :value="val"> {{ val }}</option>
                                </select>
                                <div class="spacer"></div>
                                <div class="panels">
                                    <div class="mute-container">
                                        <div>
                                            <h4> Mutes </h4>
                                            <div v-if="currentMutes.length === 0"><i> none </i></div> 
                                            <ul v-else>
                                                <li v-for="mute in currentMutes"> {{ puppetNick(mute) }} via {{ "self" || puppetNick(currentPuppet) }} </li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4> Rankings </h4>
                                            <div v-if="!(currentPuppet in rankings)"><i> none </i></div> 
                                            <ul v-else>
                                                <li v-for="(rank, puppet) in rankings[currentPuppet]"> {{ puppetNick(puppet) }}: {{ rank }} </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div class="trust-container">
                                        <div>
                                            <h4> Trust assignments</h4>
                                            <div v-if="!(currentPuppet in trust) || Object.keys(trust[currentPuppet]).length === 0"><i> none </i></div> 
                                            <ul v-else>
                                                <li v-for="assignment in trust[currentPuppet]"> {{ puppetNick(assignment.target) }} = {{ assignment.amount }} </li>
                                            </ul>
                                        </div>
                                        <div>
                                        <h4> Most trusted </h4>
                                        <div v-if="!(currentPuppet in mostTrusted) || mostTrusted[currentPuppet].length === 0"><i> none </i></div> 
                                        <ul v-else>
                                            <li v-for="puppet in mostTrusted[currentPuppet]"> {{ puppetNick(puppet) }} </li>
                                        </ul>
                                        </div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
                <div class="log-panel" :class="{'debug-theme': debug}">
                    <button @click="sendCommand('spawn')">new puppet</button>
                    <button @click="debug = !debug"> {{ debug ? "chat" : "debug" }}</button>
                    <div v-show="debug" class="debug" :class="{'active-scroller': debug}">
                        <pre v-for="log in rawlogs">{{ log }}</pre>
                    </div>
                    <div v-show="!debug" class="chat" :class="{'active-scroller': !debug}">
                        <div id="chat">
                            <div v-for="msg in chat[currentPuppet]" :class="{muted: isMuted(msg.author)}">
                                {{ formatDate(msg.timestamp) }} <{{ puppetNick(msg.author) }}> {{ msg.message }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data () {
        return {
            listeners: {},
            rawlogs: [],
            mutes: [], // list of { origin: <puppetid>, target: <puppetid> }
            trust: {}, // trust[origin][target] = amount
            chat: {},
            muteSelect: "",
            mostTrusted: {},
            rankings: {},
            trustSelect: 0,
            trustidSelect: "",
            debug: false,
            puppets: {},
            currentPuppet: ""
        }
    },
    computed: {
        curr () {
            if (!(this.currentPuppet in this.puppets)) return {}
            return this.puppets[this.currentPuppet]
        },
        currentMutes () {
            let trustList = [this.currentPuppet]
            if (!this.currentPuppet) return []
            if (this.mostTrusted[this.currentPuppet]) {
                trustList = trustList.concat(this.mostTrusted[this.currentPuppet])
            }
            return this.mutes.filter((m) => trustList.includes(m.origin)).map((m) => m.target)
        },
        everyoneButMe () {
            let keys = Object.keys(this.puppets)
            keys.splice(keys.indexOf(this.currentPuppet), 1)
            return keys
        },
        trustedPuppets () {
            return this.trust[this.currentPuppet] || {}
        }
    },
    mounted() {
        var socket = new WebSocket(window.location.toString().replace(/https?:\/\//, "ws://"))
        socket.addEventListener("open", () => {
            console.log("server started")
            socket.send(JSON.stringify({ type: "register", role: "consumer" }))
        })

        // listen to all websocket events
        socket.addEventListener("message", (evt) => {
            this.log(evt.data)
            this.processMessage(evt.data)
            this.refreshGraphListeners()
        })
        scenarios["one"].bind(this)()
    },
    watch: {
        currentPuppet (origin) {
            let target = this.trustidSelect
            this.fixTrustSelect(origin, target)
        },
        trustidSelect (target) {
            let origin = this.currentPuppet
            this.fixTrustSelect(origin, target)
        }
    },
    methods: {
        refreshGraphListeners () {
            function removeListener ({ node, listener, type }) { 
                node.removeEventListener(type, listener) 
            }
            // add click events to all d3 puppet nodes
            document.querySelectorAll("g.node").forEach((node) => {
                const d3data = d3.select(node).datum().data
                const listener = (e) => {
                    if (d3data.peerid && d3data.peerid in this.puppets) this.currentPuppet = d3data.peerid
                }
                if (this.listeners[d3data.peerid]) {
                    removeListener(this.listeners[d3data.peerid])
                }
                node.addEventListener("click", listener)
                node.listener = listener
                this.listeners[d3data.peerid] = { node, listener, type: "click" }
            })
        },
        fixTrustSelect(origin, target) {
            if (origin in this.trust && target in this.trust[origin]) {
                let amt = this.trust[origin][target].amount
                this.trustSelect = this.trust[origin][target].amount
            } else {
                this.trustSelect = 0
            }
        },
        setTrust () {
            let origin = this.currentPuppet
            let target = this.trustidSelect
            let amount = this.trustSelect
            if (!(origin in this.trust)) this.trust[origin] = {}
            if (parseFloat(amount) === 0) {
                nodeGraph.removeEdge(this.puppetNick(origin), this.puppetNick(target))
            } else {
                nodeGraph.setEdge(this.puppetNick(origin), this.puppetNick(target))
            }
            this.trust[origin][target] = { origin, target, amount }
            this.POST({ url: `trust/${origin}/${target}/${amount}/`, cb: this.log})
            setTimeout(() => { this.refreshGraphListeners() }, 800)
        },
        idFromName (name) {
            for (let e of Object.entries(this.puppets)) {
                if (e[1].nick === name) return e[0]
            }
            return null
        },

        isMuted (puppetid) {
            return this.currentMutes.includes(puppetid)
        },
        toggleMute () {
            let isMuted = this.currentMutes.includes(this.muteSelect)
            let command 
            if (isMuted) {
                command = "unmute"
                let i = this.mutes.findIndex((m) => m.origin === this.currentPuppet && m.target === this.muteSelect)
                this.mutes.splice(i, 1)
            } else {
                command = "mute"
                this.mutes.push({ origin: this.currentPuppet, target: this.muteSelect })
            }
            this.POST({ url: `${command}/${this.currentPuppet ? this.currentPuppet : -1}/${this.muteSelect}/`, cb: this.log})
        },
        toggleConnect () {
            let puppet = this.puppets[this.currentPuppet]
            let command = puppet.connected ? "disconnect" : "connect"
            puppet.connected = !puppet.connected
            this.puppets[puppet.peerid] = puppet
            this.sendCommand(command)
        },
        togglePosting () {
            let puppet = this.puppets[this.currentPuppet]
            let command = puppet.posting ? "stop" : "start"
            puppet.posting = !puppet.posting
            this.puppets[puppet.peerid] = puppet
            this.sendCommand(command)
        },
        shutdown () {
            nodeGraph.removeNode({ nick: this.puppets[this.currentPuppet].nick })
            delete this.puppets[this.currentPuppet]
            this.currentPuppet = Object.keys(this.puppets)[0]  || ""
            this.sendCommand("shutdown")
        },
        puppetNick (puppet) {
            return puppet in this.puppets ? this.puppets[puppet].nick : ""
        },
        sendCommand (command) {
            this.POST({ url: `${command}/${this.currentPuppet ? this.currentPuppet : -1}`, cb: this.log})
        },
        scrollIntoView () {
            var hovering = document.querySelector('.active-scroller:hover')
            if (hovering) return
            var scroller = document.querySelector('.active-scroller')
            scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight
        },
        pad (i) {
            return parseInt(i) < 10 ? 0 + i : i
        },
        formatDate (d) {
            return new Date(d).toISOString().split("T")[1].split(".")[0]
        },
        log (msg) {
            if (typeof msg === 'object') { msg = msg.msg } // unpack
            var time = new Date().toISOString().split("T")[1].split(".")[0]
            this.rawlogs.push(`[${time}] ${msg}`)
        },
        initializeState(data) {
            // initialize the state for each puppet
            Object.keys(data).forEach((puppetid) => {
                let datum = data[puppetid]
                this.puppets[puppetid] = { nick: datum.nick, cabal: datum.cabal, peerid: puppetid, connected: datum.connected, posting: datum.posting }
                // add all the trust state 
                datum.trust.forEach((t) => {
                    if (!(t.origin in this.trust)) this.trust[t.origin] = {}
                    this.trust[t.origin][t.target] = t
                })
                // add all mutes to global state
                this.mutes = this.mutes.concat(datum.mutes.map((m) => { return { origin: puppetid, target: m } }))
                if (!(puppetid in this.chat)) this.chat[puppetid] = []
                // add all of the messages the current node has posted itself
                datum.posted.forEach((msg) => {
                    this.chat[puppetid].push({ message: msg.content, author: msg.author, timestamp: msg.time })
                })
                // add all of the messages the current node has received from authors
                datum.received.forEach((msg) => {
                    this.chat[puppetid].push({ message: msg.content, author: msg.author, timestamp: msg.time })
                })
                // update d3 node graph
                nodeGraph.addNode({ cabal: datum.cabal, peerid: puppetid, nick: datum.nick })
            this.chat[puppetid].sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp))
            })
        },
        processMessage (msg) {
            let data = JSON.parse(msg)
            if (data.type === "register") {
                this.puppets[data.peerid] = { nick: data.peerid, cabal: data.cabal, peerid: data.peerid, connected: true, posting: false }
            } else if (data.type === "nickChanged") {
                this.puppets[data.peerid].nick = data.data
                // node is counted as initialized when its nick has been set properly
                nodeGraph.addNode({ peerid: data.peerid, cabal: data.cabal, nick: data.data})
            } else if (data.type === "messagePosted") {
                if (!(data.peerid in this.chat)) this.chat[data.peerid] = []
                this.chat[data.peerid].push({ message: data.data, author: data.peerid, timestamp: +(new Date()) })
            } else if (data.type === "messageReceived") {
                let msg = data.data
                if (!(data.peerid in this.chat)) this.chat[data.peerid] = []
                this.chat[data.peerid].push({ message: msg.contents, author: msg.peerid, timestamp: +(new Date()) })
            } else if (data.type === "initialize") {
                this.initializeState(JSON.parse(data.data))
            } else if (data.type === "trustNet") {
                console.log(data.data)
                this.mostTrusted = data.data.mostTrusted
                this.rankings = data.data.rankings
                console.log(JSON.stringify(data.data.rankings))
                console.log("trust net is updated!!")
            }
            this.scrollIntoView()
        },
        POST (opts) {
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
                    this.log(`Error: ${opts.url} doesn't return json`)
                })
        }
    }
})

var app = new Vue({
    el: "#mount"
})
