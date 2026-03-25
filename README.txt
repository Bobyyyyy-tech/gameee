SETUP

1. Extract this folder.
2. Open a terminal inside the folder.
3. Run:
   npm install
   npm start
4. Open http://localhost:3000

TO HOST ONLINE

Upload these files to a GitHub repo, then deploy on Render as a Node web service.
Build command:
  npm install
Start command:
  npm start

FILES YOU NEED

server.js
package.json
public/index.html

CONTROLS

WASD = move
Space = jump
Mouse = look
Left click = break block
Right click = place block
1-5 = select block type

NOTES

- This already has hidden face culling because only visible cube faces are added into the mesh.
- It uses simple colored materials instead of PNG textures so it works immediately after extract.
- It is multiplayer and syncs players and block edits.
