Vue.component("base-view", {
    template: `
        <div class="container">
            <select id="puppet" placeholder="currentPuppet" v-model="currentPuppet">
                <option v-for="puppet in puppets" :value="puppet.peerid">{{ puppet.nick }}</option>
            </select>
            <button v-for="command in commands" @click="sendCommand(command)">{{ command }}</button>
            <div id="canvas"></div>
            <div class="panels">
                <div v-if="puppets !== {}" id="chat-view">
                    <h3>{{ currentPuppet }} view</h3>
                    <div v-for="msg in chat[currentPuppet]">
                        {{ formatDate(msg.timestamp) }} <{{puppets[msg.author].nick}}> {{msg.message}}
                    </div>
                </div>
                <div id="terminal">
                    <div v-for="log in logs">{{ log }}</div>
                </div>
            </div>
        </div>
    `,
    data () {
        return {
            commands: ["stat", "start", "stop", "connect", "disconnect", "spawn", "shutdown"],
            logs: [],
            chat: {},
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
            console.log(evt.data)
            this.log(evt.data)
            this.processMessage(evt.data)
        })
    },
    methods: {
        sendCommand (command) {
            console.log(this.idFromPeerid(this.currentPuppet))
            this.POST({ url: `${command}/${this.idFromPeerid(this.currentPuppet)}`, cb: this.log})
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
            console.log(this.puppets, peerid)
            if (!(peerid in this.puppets)) { return -1 }
            return this.puppets[peerid].id
        },
        processMessage (msg) {
            let data = JSON.parse(msg)
            if (data.type === "register") {
                nodeGraph.addNode(data)
                this.puppets[data.peerid] = { id: this.count, nick: data.peerid, cabal: data.cabal, peerid: data.peerid }
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
