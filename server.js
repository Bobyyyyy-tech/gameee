const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("."))

let players = {}

io.on("connection", socket => {

    players[socket.id] = { x:0, y:10, z:0 }

    socket.emit("init", { id: socket.id, players })

    socket.broadcast.emit("join", {
        id: socket.id,
        player: players[socket.id]
    })

    socket.on("move", pos => {
        players[socket.id] = pos

        socket.broadcast.emit("move", {
            id: socket.id,
            ...pos
        })
    })

    socket.on("disconnect", () => {
        delete players[socket.id]
        io.emit("leave", socket.id)
    })
})

server.listen(process.env.PORT || 3000)
