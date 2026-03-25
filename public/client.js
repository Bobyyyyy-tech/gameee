import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/PointerLockControls.js";

const socket = io();

// scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

// lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 10);
scene.add(sun);

// controls
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());
controls.getObject().position.set(0, 10, 10);

// auto start
setTimeout(() => controls.lock(), 100);
document.addEventListener("click", () => {
    if (!controls.isLocked) controls.lock();
});

// movement
let keys = {};
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// world
const blocks = {};
function k(x,y,z){ return `${x},${y},${z}`; }

const materials = {
    1: new THREE.MeshLambertMaterial({ color: 0x55aa33 }),
    2: new THREE.MeshLambertMaterial({ color: 0x8B4513 })
};

function createBlock(x,y,z,type){
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        materials[type]
    );
    mesh.position.set(x,y,z);
    scene.add(mesh);
    blocks[k(x,y,z)] = mesh;
}

function removeBlock(x,y,z){
    const key = k(x,y,z);
    if(blocks[key]){
        scene.remove(blocks[key]);
        delete blocks[key];
    }
}

// players
let players = {};
let myId = null;

function createPlayer(){
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1,2,1),
        new THREE.MeshLambertMaterial({ color: 0x00ffff })
    );
    scene.add(mesh);
    return mesh;
}

// networking
socket.on("init", data => {
    myId = data.id;

    for(let w in data.world){
        const [x,y,z] = w.split(",").map(Number);
        createBlock(x,y,z,data.world[w]);
    }

    for(let id in data.players){
        players[id] = createPlayer();
    }
});

socket.on("playerMoved", data => {
    if(players[data.id]){
        players[data.id].position.set(data.x,data.y,data.z);
    }
});

socket.on("playerJoined", data => {
    players[data.id] = createPlayer();
});

socket.on("playerLeft", id => {
    if(players[id]){
        scene.remove(players[id]);
        delete players[id];
    }
});

socket.on("blockUpdate", data => {
    if(data.type === 0){
        removeBlock(data.x,data.y,data.z);
    } else {
        createBlock(data.x,data.y,data.z,data.type);
    }
});

// breaking
const raycaster = new THREE.Raycaster();

window.addEventListener("mousedown", () => {
    raycaster.setFromCamera({x:0,y:0}, camera);
    const hits = raycaster.intersectObjects(Object.values(blocks));

    if(hits.length > 0){
        const p = hits[0].object.position;
        socket.emit("blockUpdate", { x:p.x, y:p.y, z:p.z, type:0 });
    }
});

// placing
window.addEventListener("contextmenu", e => {
    e.preventDefault();

    raycaster.setFromCamera({x:0,y:0}, camera);
    const hits = raycaster.intersectObjects(Object.values(blocks));

    if(hits.length > 0){
        const hit = hits[0];
        const p = hit.object.position;
        const n = hit.face.normal;

        socket.emit("blockUpdate", {
            x: p.x + n.x,
            y: p.y + n.y,
            z: p.z + n.z,
            type: 1
        });
    }
});

// update
function update(){
    const speed = 0.15;

    if(keys["w"]) controls.moveForward(speed);
    if(keys["s"]) controls.moveForward(-speed);
    if(keys["a"]) controls.moveRight(-speed);
    if(keys["d"]) controls.moveRight(speed);

    const pos = controls.getObject().position;

    if(myId){
        socket.emit("move", {
            x: pos.x,
            y: pos.y,
            z: pos.z
        });
    }
}

// loop
function animate(){
    requestAnimationFrame(animate);
    update();
    renderer.render(scene,camera);
}

animate();
