const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const WORLD_SIZE = 48;
const HALF = WORLD_SIZE / 2;
const MAX_HEIGHT = 20;
const players = {};
const world = new Map();

function k(x, y, z) {
  return `${x},${y},${z}`;
}

function getBlock(x, y, z) {
  return world.get(k(x, y, z)) || 0;
}

function setBlock(x, y, z, t) {
  if (t === 0) world.delete(k(x, y, z));
  else world.set(k(x, y, z), t);
}

function noise2(x, z) {
  return Math.sin(x * 0.17) * 0.8 + Math.cos(z * 0.16) * 0.8 + Math.sin((x + z) * 0.08) * 1.6;
}

function generateWorld() {
  for (let x = -HALF; x < HALF; x++) {
    for (let z = -HALF; z < HALF; z++) {
      const h = Math.max(4, Math.min(MAX_HEIGHT, Math.floor(10 + noise2(x, z) * 2.5 + Math.sin(x * 0.03) * 1.5)));
      for (let y = 0; y <= h; y++) {
        let type = 2; // dirt
        if (y === 0) type = 3; // stone
        else if (y === h) type = 1; // grass
        else if (y < h - 3) type = 3; // stone deeper
        setBlock(x, y, z, type);
      }

      const treeChance = Math.abs(Math.sin(x * 12.9898 + z * 78.233)) % 1;
      if (treeChance > 0.93 && x > -HALF + 3 && x < HALF - 3 && z > -HALF + 3 && z < HALF - 3) {
        const trunkBase = h + 1;
        const trunkH = 3 + (Math.abs(Math.floor((x * z) % 2)));
        for (let y = trunkBase; y < trunkBase + trunkH; y++) setBlock(x, y, z, 4);
        const leafTop = trunkBase + trunkH;
        for (let lx = -2; lx <= 2; lx++) {
          for (let ly = -1; ly <= 1; ly++) {
            for (let lz = -2; lz <= 2; lz++) {
              const dist = Math.abs(lx) + Math.abs(ly) + Math.abs(lz);
              if (dist <= 3) setBlock(x + lx, leafTop + ly, z + lz, 5);
            }
          }
        }
        setBlock(x, leafTop + 1, z, 5);
      }
    }
  }
}

generateWorld();

function serializeWorld() {
  const out = [];
  for (const [key, type] of world.entries()) {
    const [x, y, z] = key.split(',').map(Number);
    out.push([x, y, z, type]);
  }
  return out;
}

io.on('connection', (socket) => {
  players[socket.id] = {
    x: 0,
    y: 18,
    z: 0,
    yaw: 0,
    name: `Player${String(Math.floor(Math.random() * 900 + 100))}`
  };

  socket.emit('init', {
    id: socket.id,
    world: serializeWorld(),
    players
  });

  socket.broadcast.emit('playerJoined', { id: socket.id, player: players[socket.id] });

  socket.on('move', (data) => {
    const p = players[socket.id];
    if (!p) return;
    p.x = data.x;
    p.y = data.y;
    p.z = data.z;
    p.yaw = data.yaw || 0;
    socket.broadcast.emit('playerMoved', { id: socket.id, ...p });
  });

  socket.on('setName', (name) => {
    if (!players[socket.id]) return;
    const safe = String(name || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 16);
    if (!safe) return;
    players[socket.id].name = safe;
    io.emit('playerRenamed', { id: socket.id, name: safe });
  });

  socket.on('blockUpdate', (data) => {
    const x = Math.round(data.x);
    const y = Math.round(data.y);
    const z = Math.round(data.z);
    const type = Math.max(0, Math.min(5, Number(data.type) || 0));

    if (x <= -HALF || x >= HALF || z <= -HALF || z >= HALF || y < 0 || y > 64) return;
    if (type === 0) setBlock(x, y, z, 0);
    else setBlock(x, y, z, type);

    io.emit('blockUpdate', { x, y, z, type });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
