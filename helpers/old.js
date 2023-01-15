// objects///////////////////////////////////////////////////////////////////////////////////////////
const boxGeometry = new THREE.BoxGeometry(20, 20, 20).toNonIndexed();

position = boxGeometry.attributes.position;
const colorsBox = [];

for (let i = 0, l = position.count; i < l; i++) {
  color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
  colorsBox.push(color.r, color.g, color.b);
}

boxGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colorsBox, 3));

for (let i = 0; i < 50; i++) {
  const boxMaterial = new THREE.MeshPhongMaterial({ specular: 0xffffff, flatShading: true, vertexColors: true });
  boxMaterial.color.setHSL(Math.random() * 0.2 + 0.5, 0.75, Math.random() * 0.25 + 0.75);

  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.x = Math.floor(Math.random() * 20 - 10) * 20;
  box.position.y = Math.floor(Math.random() * 20) * 20 + 10;
  box.position.z = Math.floor(Math.random() * 20 - 10) * 20;

  scene.add(box);
  objects.push(box);
}
////////////////////////////////////////////////////////////////////////////////////////

// vertex displacement
// let position = floorGeometry.attributes.position;
// console.log(position);
// console.log(typeof(position))

// this next chunk "designs" the floor I think
/////////////////////////////////////////////////////////////////////////////////////
// for (let i = 0, l = position.count; i < l; i++) {w

//     vertex.fromBufferAttribute(position, i);

//     vertex.x += Math.random() * 20 - 10;
//     vertex.y += Math.random() * 2;
//     vertex.z += Math.random() * 20 - 10;

//     position.setXYZ(i, vertex.x, vertex.y, vertex.z);

// }

// floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices

// position = floorGeometry.attributes.position;
// const colorsFloor = [];

// for (let i = 0, l = position.count; i < l; i++) {

//     color.setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
//     colorsFloor.push(color.r, color.g, color.b);

// }

// floorGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsFloor, 3));

// moving the player around
// const onKeyDown = function (event) {
//   keyDisplayQueue.down(event.key);
//   switch (event.code) {
//     case "ArrowUp":
//     case "KeyW":
//       moveForward = true;
//       break;

//     case "ArrowLeft":
//     case "KeyA":
//       moveLeft = true;
//       break;

//     case "ArrowDown":
//     case "KeyS":
//       moveBackward = true;
//       break;

//     case "ArrowRight":
//     case "KeyD":
//       moveRight = true;
//       break;

//     case "Space":
//       if (canJump === true) velocity.y += 200;
//       canJump = false;
//       break;

//     // the code below is temporary until the 3rd person camera is fully implementec
//     case "KeyT":
//       personObject.position.z -= jump;
//       loseLife();
//       break;

//     case "KeyF":
//       personObject.position.x -= jump;
//       break;

//     case "KeyG":
//       personObject.position.z += jump;
//       break;

//     case "KeyH":
//       personObject.position.x += jump;
//       break;
//   }
// };

// const onKeyUp = function (event) {
//   keyDisplayQueue.up(event.key);
//   switch (event.code) {
//     case "ArrowUp":
//     case "KeyW":
//       moveForward = false;
//       break;

//     case "ArrowLeft":
//     case "KeyA":
//       moveLeft = false;
//       break;

//     case "ArrowDown":
//     case "KeyS":
//       moveBackward = false;
//       break;

//     case "ArrowRight":
//     case "KeyD":
//       moveRight = false;
//       break;
//   }
// };

// Adding in the event listeners to call the movement
// document.addEventListener("keydown", onKeyDown);
// document.addEventListener("keyup", onKeyUp);
