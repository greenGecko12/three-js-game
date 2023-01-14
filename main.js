import * as THREE from "./node_modules/three/build/three.module.js";
import { PointerLockControls } from "./node_modules/three/examples/jsm/controls/PointerLockControls.js"; // might not need this in the end
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import ThirdPersonCamera from "./camera.js";

let camera, scene, renderer, controls, thirdPersonCamera;

const tiles = []; // TODO: all the tile objects to this array later
const alienObjects = [];

// there are 2 scenes, scene 1 and scene
let mainScene;
const scenes = [];
const jump = 1; // TODO: this variable controls how far the character jumps (remove when 3rd person camera implemented)

let flag = true;
let personObject;
let raycaster;
let lives = 3;
let heartObjects = [];
let gameOver = false;

const diffTiles = 10;
let tileSize = 5;
const planeWidth = 50;
const planeLength = 250;
const startAreasize = 20;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let playerPosition = new THREE.Vector3();

const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 1.0;
const far = 1000.0;

init();
animate();

function loadModel(path) {
  const loader = new GLTFLoader();

  loader.load(
    path,
    function (gltf) {
      // gltf.scene.position.set( 0, 20, 10 );
      // console.log(gltf.scene)

      personObject = gltf.scene.children[0];
      personObject.position.set(0, 5, 115);
      personObject.rotateY(Math.PI);

      scene.add(personObject);
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );
}

function loadAlienModel(path) {
  const loader = new GLTFLoader();

  loader.load(
    path,
    function (gltf) {
      const alienObject = gltf.scene.children[0];
      let pos = getRandomPositionOnPlane();
      alienObject.position.set(pos[0], pos[1], pos[2]);

      // alienObject.scale.set([2,2,2]);

      scene.add(alienObject);
      alienObjects.push(alienObject);

      // return alientObject;
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );
}

// this function is not actually used
function loadTexture() {
  // instantiate a loader
  const loader = new THREE.TextureLoader();

  // load a resource
  loader.load(
    // resource URL
    "textures/galaxy_texture.jpg",

    // onLoad callback
    function (texture) {
      // in this example we create the material when the texture is loaded
      const material = new THREE.MeshBasicMaterial({
        map: texture,
      });

      scene.background = material;
    },

    // onProgress callback currently not supported
    undefined,

    // onError callback
    function (err) {
      console.error("An error happened.");
    }
  );
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min);
}

function generateTiles() {
  const minTileSize = planeWidth / 6;
  const maxTileSize = planeWidth / 10;

  const minNumberOfTiles = parseInt(planeLength / planeWidth);
  const maxNumberOfTiles = parseInt(planeLength / planeWidth) + diffTiles;

  const numberOfTiles = parseInt(getRandomInt(minNumberOfTiles, maxNumberOfTiles) * Math.random() * 2.5) + getRandomInt(-4, 5);

  // box material
  const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xd0312d });
  // box geometry
  let BoxGeometry;
  let box;

  // loop to create all the tiles and then add them to the scene
  for (let i = 0; i < numberOfTiles; i++) {
    BoxGeometry = new THREE.BoxGeometry(getRandomInt(minTileSize, maxTileSize), 0, getRandomInt(minTileSize, maxTileSize));
    box = new THREE.Mesh(BoxGeometry, boxMaterial);
    box.position.set(
      getRandomInt(-planeWidth / 2 + startAreasize, planeWidth / 2 - startAreasize),
      0.01,
      getRandomInt(-planeLength / 2 + startAreasize, planeLength / 2 - startAreasize)
    );
    scene.add(box);
  }
}

// creates 2 cubes that are positioned at the start and end of the track
function createStartAndEndSections() {
  // box material
  const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xca5cdd });

  // these start and end sections will stretch across the width of the plane but have a depth of 20
  const startBoxGeometry = new THREE.BoxGeometry(planeWidth, 0, startAreasize);
  const endBoxGeometry = new THREE.BoxGeometry(planeWidth, 0, startAreasize);

  const startBoxMesh = new THREE.Mesh(startBoxGeometry, boxMaterial);
  startBoxMesh.position.set(0, 0.001, -115);

  const endBoxMesh = new THREE.Mesh(endBoxGeometry, boxMaterial);
  endBoxMesh.position.set(0, 0.001, 115);

  scene.add(startBoxMesh);
  scene.add(endBoxMesh);
}

function generateAllHearts() {
  for (let i = 0; i < lives; i++) {
    const heart = generateHeart();
    heart.position.set(0, 10, 0 + i * 10);
    heartObjects.push(heart);
    scene.add(heart);
  }
}

function generateHeart() {
  const heartShape = new THREE.Shape();

  heartShape.moveTo(25, 25);
  heartShape.bezierCurveTo(25, 25, 20, 0, 0, 0);
  heartShape.bezierCurveTo(-30, 0, -30, 35, -30, 35);
  heartShape.bezierCurveTo(-30, 55, -10, 77, 25, 95);
  heartShape.bezierCurveTo(60, 77, 80, 55, 80, 35);
  heartShape.bezierCurveTo(80, 35, 80, 0, 50, 0);
  heartShape.bezierCurveTo(35, 0, 25, 25, 25, 25);

  const extrudeSettings = { depth: 8, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 };
  const geometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
  const heart = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xe8bcf0 }));
  heart.rotateZ(Math.PI);
  heart.scale.set(0.1, 0.1, 0.1);
  return heart;
}

// just subtracts a life and TODO: also remove a heart from the screen
// THIS REMOVAL MIGHT TRIGGER A RE-RENDER OF THE HEARTS ON THE SCREEN
// Could maybe include some sort of sound effect to alert the user of this
function loseLife() {
  lives -= 1;
  if (lives == 0) {
    gameOver = true;
  }
}

//generates a random position on the plane for the aliens to spawn from which they chase you the player
function getRandomPositionOnPlane() {
  const x = Math.random() * planeWidth;
  const y = 5; // this is the height of the alien
  const z = Math.random() * planeLength;

  return [x, y, z];
}

// for now this function just creates a bunch of boxes that follow you
function spawnAliens() {
  let numberOfAliens = getRandomInt(3, 5);
  //const alienGeometry = new THREE.BoxGeometry(10,10,10);

  //const alientMaterial = new THREE.MeshLambertMaterial({color: 0x57fd10})

  // for (let i=0; i<numberOfAliens; i++){
  //     let alien = new THREE.Mesh(alienGeometry, alientMaterial);
  //     let pos = getRandomPositionOnPlane()
  //     alien.position.set(pos[0], pos[1], pos[2]);
  //     alienObjects.push(alien);
  //     scene.add(alien);
  // }

  for (let i = 0; i < numberOfAliens; i++) {
    loadAlienModel("./mike_wazowski.glb");
  }
}

// I think it would be good to have a fixed number of aliens that are always respawned and chase you all the time

// this function updates the positions of the aliens so that they keep chasing you.
function updateAlienPositions() {
  playerPosition = personObject.position; // this is of type Vector3
  let diffVec;

  // calculating the difference vectors between each of the aliens the player
  for (let alien of alienObjects) {
    //console.log(alien);

    diffVec = playerPosition.sub(alien.position).normalize(); // TODO: check what this function actually does

    alien.position.x += diffVec.getComponent(0) / 30;
    alien.position.y += diffVec.getComponent(1) / 30;
    alien.position.z += diffVec.getComponent(2) / 30;

    // console.log(diffVec);

    // adding this difference vector to the position vector of the aliens so that they will "chase" the player
    // alien.position.set(alien.position.add(diffVec));
  }

  // alienObjects.forEach((alien) => {
  //     console.log(alien)
  // })
}

function init() {
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.y = 10;
  camera.position.z = 130;

  // thirdPersonCamera = new ThirdPersonCamera({
  //   camera: camera,
  // });

  scene = new THREE.Scene();
  //scene.background = new THREE.Color(0xde45e3);
  scene.fog = new THREE.Fog(0xffffff, 0, 750);

  loadModel("./Person2.glb");
  createStartAndEndSections();
  // console.log("+++++");
  // console.log(personObject);
  // console.log("+++++");

  generateTiles();
  generateAllHearts();

  //spawnAliens();

  // updateAlienPositions(personObject);

  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
  light.position.set(0.5, 1, 0.75);
  scene.add(light);

  //loadTexture()

  const loader = new THREE.CubeTextureLoader();
  const texture = loader.load([
    "./textures/galaxy.jpg",
    "./textures/galaxy.jpg",
    "./textures/galaxy.jpg",
    "./textures/galaxy.jpg",
    "./textures/galaxy.jpg",
    "./textures/galaxy.jpg",
  ]);
  scene.background = texture;

  // locks in the mouse basically so you can't see
  controls = new PointerLockControls(camera, document.body);

  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  instructions.addEventListener("click", function () {
    controls.lock();
  });

  controls.addEventListener("lock", function () {
    instructions.style.display = "none";
    blocker.style.display = "none";
  });

  controls.addEventListener("unlock", function () {
    blocker.style.display = "block";
    instructions.style.display = "";
  });

  scene.add(controls.getObject());

  // moving the player around
  const onKeyDown = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "Space":
        if (canJump === true) velocity.y += 200;
        canJump = false;
        break;

      // the code below is temporary until the 3rd person camera is fully implementec
      case "KeyT":
        personObject.position.z -= jump;
        break;

      case "KeyF":
        personObject.position.x -= jump;
        break;

      case "KeyG":
        personObject.position.z += jump;
        break;

      case "KeyH":
        personObject.position.x += jump;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;
    }
  };

  // Adding in the event listeners to call the movement
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // what is a THREE.Raycaster --> lighting and shading basically
  raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);

  // floor - The first 2 arguments (width, height)
  // The last 2 arguments correspond to the number of width and height segments --> affect the design on the floor
  let floorGeometry = new THREE.PlaneGeometry(planeWidth, planeLength);

  let leftWall = new THREE.BoxGeometry(5, planeLength, 5);
  let rightWall = new THREE.BoxGeometry(5, planeLength, 5);
  leftWall.rotateZ(Math.PI / 2);
  leftWall.rotateY(Math.PI / 2);

  rightWall.rotateZ(Math.PI / 2);
  rightWall.rotateY(-Math.PI / 2);
  // leftWall.rotateX(Math.PI / 2);

  const wallTextureLoader = new THREE.TextureLoader();
  const wallMaterial = wallTextureLoader.load("./textures/fence_texture.jpg");
  wallMaterial.wrapS = THREE.RepeatWrapping;
  wallMaterial.wrapT = THREE.RepeatWrapping;
  wallMaterial.repeat.set(1, 5); // TODO: Fix the texture of the walls

  const wallTextureMaterial = new THREE.MeshLambertMaterial({ map: wallMaterial, side: THREE.FrontSide });

  const leftWallMesh = new THREE.Mesh(leftWall, wallTextureMaterial);
  const rightWallMesh = new THREE.Mesh(rightWall, wallTextureMaterial);

  leftWallMesh.position.set(25, 2, 0);
  rightWallMesh.position.set(-25, 2, 0);

  scene.add(leftWallMesh);
  scene.add(rightWallMesh);

  // makes the plane a proper plane (otherwise it defaults to a vertical plane)
  floorGeometry.rotateX(-Math.PI / 2);

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

  const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x23da23 });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  scene.add(floor);

  //////////////////////////////////////////////////////////////////////////////////////

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

// this renders the second scene
// right now the idea is just to make a jumping game?
function init2() {}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

// animation function that gets called 60 times a second, I think
function animate() {
  requestAnimationFrame(animate);

  // if (personObject != undefined){
  //     if (flag){
  //         updateAlienPositions();
  //         flag = false;
  //     }
  // }

  //   if (personObject != undefined) {
  //     updateAlienPositions();
  //   }

  const time = performance.now();

  if (controls.isLocked === true) {
    raycaster.ray.origin.copy(controls.getObject().position);
    raycaster.ray.origin.y -= 10;

    // const intersections = raycaster.intersectObjects(objects, false);

    // const onObject = intersections.length > 0;

    const delta = (time - prevTime) / 1000;

    // thirdPersonCamera.Update(delta);

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    // if (onObject === true) {

    //     velocity.y = Math.max(0, velocity.y);
    //     canJump = true;

    // }

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.getObject().position.y += velocity.y * delta; // new behavior

    if (controls.getObject().position.y < 10) {
      velocity.y = 0;
      controls.getObject().position.y = 10;

      canJump = true;
    }
  }

  prevTime = time;

  renderer.render(scene, camera);
}
