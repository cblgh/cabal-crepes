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

// spawn 6 puppets
scenarios["one"] = function () {
    this.sendCommand('spawn') // 0
    this.sendCommand('spawn') // 1
    this.sendCommand('spawn') // 2
    this.sendCommand('spawn') // 3
    this.sendCommand('spawn') // 4
    this.sendCommand('spawn') // 5
}

Vue.component("base-view", {
    template: `
    <div class="container">
        <div class="panels">
            <div class="column">
                <div id="canvas"></div>
                <div class="tab-row">
                    <div @click="currentPuppetId = puppet.peerid" class="tab" v-for="puppet in puppets" :class="{ 'active-tab': puppet.peerid === currentPuppetId}" :value="puppet.peerid">{{ puppet.nick }}</div>
                </div>
                <div class="controls">
                    <h3 v-if="currentPuppetId.length > 0">{{ puppetNick(currentPuppetId) }}:{{ currentPuppetId.slice(0, 3) }}</h3>
                    <template v-if="currentPuppetId.length > 0">
                        <div class="panels">
                            <div class="action-container">
                                <button @click="toggleConnect()">{{ curr.connected ? "disconnect" : "connect" }}</button>
                                <button @click="togglePosting()">{{ curr.posting ? "stop posting" : "start posting" }}</button>
                                <button @click="shutdown()">shutdown</button>
                                <div class="spacer"></div>
                                <div class="puppet-container">
                                    <div class="puppet-row">
                                        <div class="moderation-label">Moderation similarity</div>
                                    </div>
                                    <div class="puppet-row" v-for="puppet in puppets" :key="puppet.peerid" v-if="puppet.peerid !== currentPuppetId">
                                        <span> {{ puppet.nick }} </span>
                                        <div class="radio-container">
                                            <input @change="toggleDistrust" :disabled="isDisabled" :checked="!isDisabled && !isDistrusted(puppet.peerid)" :id="'yes-' + puppet.peerid" :data-puppetid="puppet.peerid" type='radio' value="trust" :name="'trust- '+ puppet.peerid"/>
                                            <label :for="'yes-' + puppet.peerid">trust</label>
                                            <input @change="toggleDistrust" :disabled="isDisabled" :checked="!isDisabled && isDistrusted(puppet.peerid)" :id="'no-' + puppet.peerid" :data-puppetid="puppet.peerid" type='radio' value="distrust" :name="'trust- '+ puppet.peerid"/>
                                            <label :for="'no-' + puppet.peerid">distrust</label>
                                        </div>
                                        <select @change="updateTrust" :disabled="isDistrusted(puppet.peerid)" :data-puppetid="puppet.peerid">
                                            <option v-for="label in moderationLabels" :selected="determineTrustValue(puppet.peerid, moderationValues[label])" :value="moderationValues[label]"> {{ label }}</option>
                                        </select>
                                        <button @click="toggleMute(puppet)"> {{ isMuted(puppet.peerid) ? "unmute" : "mute" }} </button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div class="panels panels-16">
                                    <div class="mute-container">
                                        <div>
                                            <h4> Mutes </h4>
                                            <div v-if="currentMutes.length === 0"><i> none </i></div> 
                                            <ul v-else>
                                                <li v-for="mute in currentMutes"> {{ puppetNick(mute.target) }} via {{ mute.origin === currentPuppetId ? 'self' : puppetNick(mute.origin) }} </li>
                                            </ul>
                                        </div>
                                        <div v-if="puppetNick(currentPuppetId) === 'you'">
                                            <h4> Rankings </h4>
                                            <div v-if="rankings.length === 0"><i> none </i></div> 
                                            <ul v-else>
                                                <li v-for="item in rankings" class="col-2">
                                                    <span>{{ puppetNick(item[0]) }}</span>
                                                    <span>{{ roundRank(item[1]) }}</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div class="trust-container">
                                        <div>
                                            <h4> Trust assignments</h4>
                                            <div v-if="!(currentPuppetId in trust) || Object.keys(trust[currentPuppetId]).length === 0"><i> none </i></div> 
                                            <ul v-else>
                                                <li v-for="assignment in trust[currentPuppetId]"> {{ puppetNick(assignment.target) }} = {{ assignment.amount }} </li>
                                            </ul>
                                        </div>
                                        <div v-if="puppetNick(currentPuppetId) === 'you'">
                                            <h4> Most trusted </h4>
                                            <div v-if="!(currentPuppetId in mostTrusted) || mostTrusted[currentPuppetId].length === 0"><i> none </i></div> 
                                            <ul v-else>
                                                <li v-for="puppet in mostTrusted[currentPuppetId]"> {{ puppetNick(puppet) }} </li>
                                            </ul>
                                        </div>
                                    </div>
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
                        <div v-for="msg in chat[currentPuppetId]" :class="{muted: isMuted(msg.author)}">
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
            moderationValues: { "None": 0, "Some overlap": 0.25, "Similar": 0.80, "Identical": 1 },
            moderationLabels: ["None", "Some overlap", "Similar", "Identical"],
            listeners: {},
            rawlogs: [],
            distrust: [],
            mutes: [], // list of { origin: <puppetid>, target: <puppetid> }
            trust: {}, // trust[origin][target] = amount
            chat: {},
            mostTrusted: {},
            rankings: [], // [[nodeId, nodeRank], ...] for the inspecting node (i.e. zilch/you)
            debug: false,
            puppets: {},
            currentPuppetId: ""
        }
    },
    computed: {
        isDisabled () {
            return !['zilch', 'you'].includes(this.puppetNick(this.currentPuppetId))
        },
        curr () {
            if (!(this.currentPuppetId in this.puppets)) return {}
            return this.puppets[this.currentPuppetId]
        },
        currentMutes () {
            let trustList = [this.currentPuppetId]
            if (!this.currentPuppetId) return []
            if (this.mostTrusted[this.currentPuppetId]) {
                trustList = trustList.concat(this.mostTrusted[this.currentPuppetId])
            }
            return this.mutes.filter((m) => trustList.includes(m.origin)).map((m) => { 
                return { origin: m.origin, target:  m.target } 
            })
        },
        everyoneButMe () {
            let keys = Object.keys(this.puppets)
            keys.splice(keys.indexOf(this.currentPuppetId), 1)
            return keys
        },
        trustedPuppets () {
            return this.trust[this.currentPuppetId] || {}
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
    methods: {
        roundRank (r) {
            var multiplier = Math.pow(10, 2);
            return Math.round(r * multiplier) / multiplier;
        },
        toggleDistrust (e) {
            if (this.isDisabled) return
            const pid = e.target.dataset.puppetid
            const index = this.distrust.indexOf(pid)
            const command = e.target.value
            if (command === "distrust" && index < 0) {
                this.distrust.push(pid)
                this.setTrust(pid, 0)
            } else {
                this.distrust.splice(index, 1)
            }
            const origin = this.currentPuppetId
            const bool = command === "distrust"
            this.POST({ url: `distrust/${origin}/${pid}/${bool}/`, cb: this.log})
            nodeGraph.updateNode({ peerid: pid, nick: this.puppetNick(pid), distrusted: command === "distrust", muted: this.isMuted(pid) })
        },
        determineTrustValue(puppetid, value) {
            if (!this.trust[this.currentPuppetId]) return false
            const trustObj = this.trust[this.currentPuppetId][puppetid]
            if (typeof trustObj === "undefined") return false
            return parseFloat(trustObj.amount) === parseFloat(value)
        },
        updateTrust (e) {
            const target = e.target.dataset.puppetid
            const amount = e.target.value
            this.setTrust(target, amount)
        },
        refreshGraphListeners () {
            function removeListener ({ node, listener, type }) { 
                node.removeEventListener(type, listener) 
            }
            // add click events to all d3 puppet nodes
            document.querySelectorAll("g.node").forEach((node) => {
                const d3data = d3.select(node).datum().data
                const listener = (e) => {
                    if (d3data.peerid && d3data.peerid in this.puppets) this.currentPuppetId = d3data.peerid
                }
                if (this.listeners[d3data.peerid]) {
                    removeListener(this.listeners[d3data.peerid])
                }
                node.addEventListener("click", listener)
                node.listener = listener
                this.listeners[d3data.peerid] = { node, listener, type: "click" }
            })
        },
        setTrust (target, amount) {
            let origin = this.currentPuppetId
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
            return this.currentMutes.map((m) => m.target).includes(puppetid)
        },
        isDistrusted (puppetid) {
            return this.distrust.includes(puppetid)
        },
        toggleMute (puppet) {
            const pid = puppet.peerid
            let isMuted = this.isMuted(pid)
            let command 
            if (isMuted) {
                command = "unmute"
                let i = this.mutes.findIndex((m) => m.origin === this.currentPuppetId && m.target === pid)
                this.mutes.splice(i, 1)
            } else {
                command = "mute"
                this.mutes.push({ origin: this.currentPuppetId, target: pid })
            }

            const trustedByYou = this.mostTrusted[this.idFromName("you")].includes(this.currentPuppetId)
            if (!this.isDisabled || trustedByYou) {
                // we invoke isMuted(pid) again to make sure we don't have any additional mutes in effect
                nodeGraph.updateNode({ peerid: pid, nick: this.puppetNick(pid), muted: this.isMuted(pid), distrusted: this.isDistrusted(pid) })
            }
            this.POST({ url: `${command}/${this.currentPuppetId ? this.currentPuppetId : -1}/${pid}/`, cb: this.log})
        },
        toggleConnect () {
            let puppet = this.puppets[this.currentPuppetId]
            let command = puppet.connected ? "disconnect" : "connect"
            puppet.connected = !puppet.connected
            this.puppets[puppet.peerid] = puppet
            this.sendCommand(command)
        },
        togglePosting () {
            let puppet = this.puppets[this.currentPuppetId]
            let command = puppet.posting ? "stop" : "start"
            puppet.posting = !puppet.posting
            this.puppets[puppet.peerid] = puppet
            this.sendCommand(command)
        },
        shutdown () {
            nodeGraph.removeNode({ nick: this.puppets[this.currentPuppetId].nick })
            delete this.puppets[this.currentPuppetId]
            this.currentPuppetId = Object.keys(this.puppets)[0]  || ""
            this.sendCommand("shutdown")
        },
        puppetNick (puppet) {
            return puppet in this.puppets ? this.puppets[puppet].nick : ""
        },
        sendCommand (command) {
            this.POST({ url: `${command}/${this.currentPuppetId ? this.currentPuppetId : -1}`, cb: this.log})
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
                this.puppets[puppetid] = { nick: datum.nick, peerid: puppetid, connected: datum.connected, posting: datum.posting }
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
                nodeGraph.addNode({ peerid: puppetid, nick: datum.nick })
            this.chat[puppetid].sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp))
            })
        },
        processMessage (msg) {
            let data = JSON.parse(msg)
            if (data.type === "register") {
                this.puppets[data.peerid] = { nick: data.peerid, peerid: data.peerid, connected: true, posting: false }
            } else if (data.type === "nickChanged") {
                this.puppets[data.peerid].nick = data.data
                // node is counted as initialized when its nick has been set properly
                nodeGraph.addNode({ peerid: data.peerid, nick: data.data})
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
                this.mostTrusted = data.data.mostTrusted
                // TODO: remove dependence on zilch/you
                this.rankings = Object.entries(data.data.rankings[Object.keys(data.data.rankings)[0]]).sort((a, b) => {
                    return b[1] - a[1]
                })
                console.log(data.data)
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
