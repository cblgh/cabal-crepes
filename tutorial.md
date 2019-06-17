# Tutorial

* Get the code by running `git clone git@github.com:cblgh/cabal-crepes.git`
* Move into the folder and run `npm install`
* Start the server `node central.js`
  * If running locally you can now access the server at `http://localhost:8899`
* Create a cabal e.g. using the [cli](https://github.com/cabal-club/cabal) and save the cabal key
* Connect a puppet to the server and your created cabal with  
 `node minimal-puppet.js --addr http://localhost:8899 --cabal <your cabal key>`
  * if you're not runnning locally, switch out `--addr` for the address of the web socket server



## Puppet Commands
When you have a server running and puppets connected to it, 
you can issue the following commands to control the puppets

* Start sending messages at an interval  
`CURL -X POST http://localhost:8899/start/<puppetid>` 
* Stop sending messages  
`CURL -X POST http://localhost:8899/start/<puppetid>` 
* Disconnect the puppet from the Cabal posting  
`CURL -X POST http://localhost:8899/disconnect/<puppetid>` 
  * When disconnected and if the puppet is posting messages, it will continue posting messages locally
* Connect the puppet from the Cabal posting  
`CURL -X POST http://localhost:8899/disconnect/<puppetid>` 
* Change the name of the puppet in the cabal  
`CURL -X POST http://localhost:8899/name/<puppetid>/<new name of the puppet>` 
