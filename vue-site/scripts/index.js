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
            <div v-for="log in logs">{{ log }}</div>
        </div>
    `,
    props: ["logs"]
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
            <select id="puppet" placeholder="currentPuppet" v-model="currentPuppet">
                <option v-for="puppet in puppets" :value="puppet.peerid">{{ puppet.nick }}</option>
            </select>
            <button v-for="command in commands" @click="sendCommand(command)">{{ command }}</button>
            <div class="panels">
                <div id="canvas"></div>
                <div class="log-panel">
                    <button @click="debug = !debug"> {{ debug ? "chat" : "debug" }}</button>
                    <div v-show="debug" class="debug" :class="{'active-scroller': debug}">
                        <div v-for="log in logs">{{ log }}</div>
                    </div>
                    <div v-show="!debug" class="chat" :class="{'active-scroller': !debug}">
                        <h3>{{ puppetNick(currentPuppet) }}:{{ currentPuppet.slice(0, 3) }}</h3>
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
            commands: ["stat", "start", "stop", "connect", "disconnect", "spawn", "shutdown"],
            logs: [],
            chat: {},
            debug: false,
            puppets: {},
            count: 0,
            currentPuppet: ""
        }
    },
    mounted() {
        var socket = new WebSocket(window.location.toString().replace(/https?:\/\//, "ws://"))
        socket.addEventListener("open", () => {
            console.log("server started")
            socket.send(JSON.stringify({ type: "register", role: "consumer" }))
        })

        socket.addEventListener("message", (evt) => {
            this.log(evt.data)
            this.processMessage(evt.data)

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
        puppetNick (puppet) {
            return puppet in this.puppets ? this.puppets[puppet].nick : ""
        },
        sendCommand (command) {
            this.POST({ url: `${command}/${this.idFromPeerid(this.currentPuppet)}`, cb: this.log})
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
            this.logs.push(`[${time}] ${msg}`)
        },
        idFromPeerid (peerid) {
            if (!(peerid in this.puppets)) { return -1 }
            return this.puppets[peerid].id
        },
        processMessage (msg) {
            let data = JSON.parse(msg)
            if (data.type === "register") {
                nodeGraph.addNode(data)
                this.puppets[data.peerid] = { id: this.count, nick: data.peerid, cabal: data.cabal, peerid: data.peerid }
                this.count += 1
            } else if (data.type === "nickChanged") {
                this.puppets[data.peerid].nick = data.data
            } else if (data.type === "messagePosted") {
                if (!(data.peerid in this.chat)) this.chat[data.peerid] = []
                this.chat[data.peerid].push({ message: data.data, author: data.peerid, timestamp: +(new Date()) })
            } else if (data.type === "messageReceived") {
                let msg = data.data
                if (!(data.peerid in this.chat)) this.chat[data.peerid] = []
                this.chat[data.peerid].push({ message: msg.contents, author: msg.peerid, timestamp: +(new Date()) })
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
                    log(`Error: ${opts.url} doesn't return json`)
                })
        }
    }
})

var app = new Vue({
    el: "#mount"
})
