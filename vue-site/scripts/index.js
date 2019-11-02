Vue.component("base-view", {
    template: `
        <div class="container">
            <div>
                <input id="puppet" placeholder="puppetid" v-model="puppetid">
            </div>
            <button v-for="command in commands" @click="sendCommand(command)">{{ command }}</button>
            <div id="canvas"></div>
            <div id="terminal">
                <div v-for="log in logs">{{ log }}</div>
            </div>
        </div>
    `,
    data () {
        return {
            commands: ["stat", "start", "stop", "connect", "disconnect", "spawn", "shutdown"],
            logs: [],
            puppetid: 0
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
            this.POST({ url: `${command}/${this.puppetid}`, cb: this.log})
        },
        log (msg) {
            if (typeof msg === 'object') { msg = msg.msg } // unpack
            var time = new Date().toISOString().split("T")[1].split(".")[0]
            this.logs.push(`[${time}] ${msg}`)
        },
        processMessage (msg) {
            let data = JSON.parse(msg)
            console.log(data)
            if (data.type === "register") {
                nodeGraph.addNode(data)
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
    },
    computed: {
    }
})

var app = new Vue({
    el: "#mount"
})
