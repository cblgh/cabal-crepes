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

Vue.component("base-title", {
    template: `<div @click=handleClick class="base-title"> {{ title }} </div>`,
    props: {
        title: String,
        handleClick: {
            type: Function,
            required: false
        }
    }
})

Vue.component("base-dropdown", {
    template: `
    <select>
        <option v-for="item in items">
    </select>
    `,
    props: ["items"]
})

Vue.component("scrollable-listing", {
    template: `
        <div class="scrollable-container">
            <div v-for="log in rawlogs">{{ log }}</div>
        </div>
    `,
    props: ["rawlogs"]
})

Vue.component("puppet-listing", {
    template: `
    <div class="puppet-listing-container">
        <div class="puppet-title"> {{ title }} </div>
        <template v-if="subheading">
            <div class="puppet-title-subheading">{{ subheading }}</div>
        </template>
        <div class="puppet-listing-items">
            <div v-for="item in items"> {{ item }} </div>
        </div>
    </div>
    `,
    props: {
        "title": String,
        "items": Array,
        "subheading": {
            required: false,
            type: String
        }
    }
})

Vue.component("base-button", {
    template: `
    <div>
        <button @click="handleClick">{{ text }}</button>
    </div>
    `,
    props: ["text", "handleClick"],
    methods: {
    },
    computed: {
    },
    data () {
        return {

        }
    }
})


Vue.component("base-view", {
    template: `
        <div class="container">
            <div class="panels">
                <div class="column">
                    <div id="canvas"></div>
                    <div class="controls">
                        <template v-if="currentPuppet.length > 0">
                            <select id="puppet" placeholder="currentPuppet" v-model="currentPuppet">
                                <option v-for="puppet in puppets" :value="puppet.peerid">{{ puppet.nick }}</option>
                            </select>
                            <button @click="toggleConnect()">{{ curr.connected ? "disconnect" : "connect" }}</button>
                            <button @click="togglePosting()">{{ curr.posting ? "stop posting" : "start posting" }}</button>
                            <button @click="shutdown()">shutdown</button>
                            <div class="spacer"></div>
                            <button> mute </button>
                            <select>
                                <option v-for="id in everyoneButMe" :value="id"> {{ puppets[id].nick }}</option>
                            </select>
                            <div class="quarter-spacer"></div>
                            <button> trust </button>
                            <select>
                                <option v-for="id in everyoneButMe" :value="id"> {{ puppets[id].nick }}</option>
                            </select>
                            <select>
                                <option v-for="val in [0.0, 0.25, 0.50, 0.80, 1.0]" :value="val"> {{ val }}</option>
                            </select>
                        </template>
                    </div>
                </div>
                <div class="log-panel">
                    <button @click="sendCommand('spawn')">new puppet</button>
                    <button @click="debug = !debug"> {{ debug ? "chat" : "debug" }}</button>
                    <div v-show="debug" class="debug" :class="{'active-scroller': debug}">
                        <pre v-for="log in rawlogs">{{ log }}</pre>
                    </div>
                    <div v-show="!debug" class="chat" :class="{'active-scroller': !debug}">
                        <h3 v-if="currentPuppet.length > 0">{{ puppetNick(currentPuppet) }}:{{ currentPuppet.slice(0, 3) }}</h3>
                        <div id="chat">
                            <div v-for="msg in chat[currentPuppet]">
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
            rawlogs: [],
            chat: {},
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
        everyoneButMe () {
            let keys = Object.keys(this.puppets)
            keys.splice(keys.indexOf(this.currentPuppet), 1)
            return keys
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

            // add click events to all d3 puppet nodes
            document.querySelectorAll("g.node").forEach((node) => {
                if (node.listener) return 
                let listener = (e) => {
                    let d3data = d3.select(node).datum().data
                    if (d3data.peerid && d3data.peerid in this.puppets) this.currentPuppet = d3data.peerid
                }
                node.addEventListener("click", listener)
                node.listener = listener
            })
        })
    },
    methods: {
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
            nodeGraph.removeNode({ peerid: this.currentPuppet })
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
                nodeGraph.addNode({ cabal: datum.cabal, peerid: puppetid })
            this.chat[puppetid].sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp))
            })
        },
        processMessage (msg) {
            let data = JSON.parse(msg)
            if (data.type === "register") {
                nodeGraph.addNode(data)
                this.puppets[data.peerid] = { nick: data.peerid, cabal: data.cabal, peerid: data.peerid, connected: true, posting: false }
            } else if (data.type === "nickChanged") {
                this.puppets[data.peerid].nick = data.data
            } else if (data.type === "messagePosted") {
                if (!(data.peerid in this.chat)) this.chat[data.peerid] = []
                this.chat[data.peerid].push({ message: data.data, author: data.peerid, timestamp: +(new Date()) })
            } else if (data.type === "messageReceived") {
                let msg = data.data
                if (!(data.peerid in this.chat)) this.chat[data.peerid] = []
                this.chat[data.peerid].push({ message: msg.contents, author: msg.peerid, timestamp: +(new Date()) })
            } else if (data.type === "initialize") {
                this.initializeState(JSON.parse(data.data))
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
