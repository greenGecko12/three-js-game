import * as THREE from "./node_modules/three/build/three.module.js";
import { PointerLockControls } from "./node_modules/three/examples/jsm/controls/PointerLockControls.js"; // might not need this in the end
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { KeyDisplay } from "./helpers/util.js";
import { CharacterControls } from "./characterControls.js";

//Have a variable which determine which level is currently being shown

// variables for one level
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let peekbackCamera; // this is the second camera view that allows you to peek "back"
let camera, scene, renderer, controls;
let mainCamera;
const cameras = [];

const tiles = []; // holds each tile on the plane
const tileSpeeds = []; // dictates what the behaviour of each tile will be
const alienObjects = [];
const hearts = [];

const heartSymbol = "&#10084; "; // html code for a heart
let personBoundingBox;

// there are 2 scenes, scene 1 and scene
let mainScene;
const scenes = [];
const jump = 1; // TODO: this variable controls how far the character jumps (remove when 3rd person camera implemented)

let flag = true;
let personObject;
let raycaster;
let lives = 3;
let heartObjects = [];

let time;
let gameOver = false;
let gameStart = false; // TODO: use this variable later on in the process.

const planeWidth = 50;
const planeLength = 250;
const startAreasize = 20;

// these are kind of arbitrary, may change later on
const tileSize = parseInt(planeWidth / 7);
const numberOfTiles = 20;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
let playerPosition = new THREE.Vector3();

const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 1.0;
const far = 1000.0;

let characterControls;
const clock = new THREE.Clock();
let orbitControls;
let keyDisplayQueue;
let keysPressed;

// These variable are temporary - remove them when collision fully working.
let cube2;
let cube2BB;
let soldierBB; // bounding box for the soldier
let model;

let leftWallBB;
let rightWallBB;

const dampingFactor = 0.2;

init();
animate();

function loadSoldier() {
  // MODEL WITH ANIMATIONS
  new GLTFLoader().load("models/Soldier.glb", function (gltf) {
    model = gltf.scene;
    model.traverse(function (object) {
      if (object.isMesh) object.castShadow = true;
    });
    model.scale.set(3.5, 3.5, 3.5);
    model.position.set(0, 0, 110);

    soldierBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    soldierBB.setFromObject(model.children[0]);
    scene.add(model);

    const gltfAnimations = gltf.animations;
    const mixer = new THREE.AnimationMixer(model);
    const animationsMap = new Map();
    gltfAnimations
      .filter((a) => a.name != "TPose")
      .forEach((a) => {
        animationsMap.set(a.name, mixer.clipAction(a));
      });

    characterControls = new CharacterControls(model, mixer, animationsMap, orbitControls, cameras, "Idle");
  });
}

function renderNumberOfHearts() {
  const livesLeft = document.getElementById("numberOfLives");
  let string = "Lives: ".concat(heartSymbol.repeat(lives));
  livesLeft.innerHTML = string;
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
  // box material
  const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xd0312d });
  // box geometry
  let BoxGeometry;
  let box;
  // loop to create all the tiles and then add them to the scene
  for (let i = 0; i < numberOfTiles; i++) {
    BoxGeometry = new THREE.BoxGeometry(tileSize, 0, tileSize);
    box = new THREE.Mesh(BoxGeometry, boxMaterial);
    box.position.set(
      getRandomInt(-planeWidth / 2 + startAreasize, planeWidth / 2 - startAreasize) + getRandomInt(-planeWidth / 3, planeWidth / 3),
      0.01,
      getRandomInt(-planeLength / 2 + startAreasize, planeLength / 2 - startAreasize)
    );
    scene.add(box);
    tiles.push(box);
    tileSpeeds.push(Math.random() * dampingFactor); // determining the behaviour of the tile
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
  startBoxMesh.position.set(0, 0.1, -115);

  const endBoxMesh = new THREE.Mesh(endBoxGeometry, boxMaterial);
  endBoxMesh.position.set(0, 0.1, 115);

  scene.add(startBoxMesh);
  scene.add(endBoxMesh);
}

// this method is obsolete, get rid of it later on
function generateAllHearts() {
  for (let i = 0; i < lives; i++) {
    const heart = generateHeart();
    heart.position.set(0, 10, 0 + i * 10);
    heartObjects.push(heart);
    scene.add(heart);
  }
}

function createTestBox() {
  cube2 = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshPhongMaterial({ color: 0x0000ff }));

  cube2.position.set(-3, 3, 20);
  cube2.castShadow = true;
  cube2.receiveShadow = true;

  cube2BB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  cube2BB.setFromObject(cube2);

  scene.add(cube2);
}

// TODO: this method is obsolete, get rid of it later on
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
  console.log(lives);
  if (lives == 0) {
    gameOver = true;
  }

  //Updates the number of hearts being displayed
  if (lives > -1) {
    renderNumberOfHearts();
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
  renderNumberOfHearts();

  // RENDERER
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.y = 20;
  camera.position.z = -20;
  //camera.lookAt(-100, 100, -10);

  peekbackCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  peekbackCamera.position.y = 10;
  peekbackCamera.position.z = -20;

  mainCamera = camera;

  cameras.push(camera, peekbackCamera);

  scene = new THREE.Scene();
  //scene.background = new THREE.Color(0xde45e3);
  scene.fog = new THREE.Fog(0xffffff, 0, 750);

  // CONTROLS
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.minDistance = 5;
  orbitControls.maxDistance = 15;
  orbitControls.enablePan = true;
  orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
  orbitControls.update();

  // loadModel("./models/Person2.glb");

  loadSoldier();

  createStartAndEndSections();
  // console.log("+++++");
  // console.log(personObject);
  // console.log("+++++");

  generateTiles();
  // generateAllHearts();

  //createTestBox();

  //spawnAliens();

  // updateAlienPositions(personObject);

  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.5); // no shadows
  light.position.set(50, 10, 75);
  // light.castShadow = true;
  scene.add(light);

  const dirLight = new THREE.DirectionalLight(0xfffffff, 0.6, 50); // shadows
  dirLight.position.set(40, 90, 100);
  dirLight.castShadow = true;
  scene.add(dirLight);
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
  controls = new PointerLockControls(mainCamera, document.body);

  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  instructions.addEventListener("click", function () {
    controls.lock();
  });

  controls.addEventListener("lock", function () {
    instructions.style.display = "none";
    blocker.style.display = "none";
    clock.start();
  });

  controls.addEventListener("unlock", function () {
    blocker.style.display = "block";
    instructions.style.display = "";
  });

  scene.add(controls.getObject());

  // CONTROL KEYS
  keysPressed = {};
  keyDisplayQueue = new KeyDisplay();
  document.addEventListener(
    "keydown",
    (event) => {
      keyDisplayQueue.down(event.key);
      if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle();
      } else {
        keysPressed[event.key.toLowerCase()] = true;
      }

      // this indicates that the user wants to switch between the two camera views
      if (event.code === "KeyB") {
        characterControls.switchCamera();
        if (mainCamera === camera) {
          mainCamera = peekbackCamera;
        } else {
          mainCamera = camera;
        }
      }

      if (event.code === "KeyP") {
        console.log(model.position.x, model.position.y, model.position.z);
      }
    },
    false
  );
  document.addEventListener(
    "keyup",
    (event) => {
      keyDisplayQueue.up(event.key);
      keysPressed[event.key.toLowerCase()] = false;
    },
    false
  );

  // what is a THREE.Raycaster --> for checking collisions basically
  raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 45);

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
  wallMaterial.repeat.set(1, 40);

  const wallTextureMaterial = new THREE.MeshStandardMaterial({ map: wallMaterial, side: THREE.FrontSide });

  const leftWallMesh = new THREE.Mesh(leftWall, wallTextureMaterial);
  const rightWallMesh = new THREE.Mesh(rightWall, wallTextureMaterial);

  leftWallMesh.position.set(25, 2, 0);
  rightWallMesh.position.set(-25, 2, 0);

  leftWallBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  leftWallBB.setFromObject(leftWallMesh);

  rightWallBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  rightWallBB.setFromObject(rightWallMesh);

  scene.add(leftWallMesh);
  scene.add(rightWallMesh);

  // makes the plane a proper plane (otherwise it defaults to a vertical plane)
  floorGeometry.rotateX(-Math.PI / 2);
  const floorTexture = wallTextureLoader.load("./textures/rainbowroad.jpg");
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(1, 20);

  const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture, side: THREE.FrontSide });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  // floor.receiveShadow = true;
  // floor.castShadow = true;
  scene.add(floor);

  //////////////////////////////////////////////////////////////////////////////////////

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  mainCamera.aspect = window.innerWidth / window.innerHeight;
  mainCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  keyDisplayQueue.updatePosition();
}

// function checkCollisions() {
//   if (soldierBB.intersectsBox(leftWallBB) || soldierBB.intersectsBox(rightWallBB)) {
//     console.log("collision");
//     characterControls.moveAwayFromWalls();
//   }
// }

//

// this function "randomly" changes the positions of all the tiles
// some tiles move fast and some move slow
function moveTiles() {
  let tileObject;
  for (let tile in tiles) {
    // we don't change the y coordinate of the tile, just the x and z coordinates
    tileObject = tiles[tile];
    if (tileObject.position.x < -(planeWidth / 2 - tileSize / 2) || tileObject.position.x > planeWidth / 2 - tileSize / 2) {
      tileSpeeds[tile] *= -1;
    }
    tileObject.position.x += tileSpeeds[tile];
    // } else {
    //   // fast tile
    //   if (tileObject.position.x < -(planeWidth / 2 - tileSize / 2)) {
    //     tileObject.position.x += fastTileSpeed;
    //   } else if (tileObject.position.x > planeWidth / 2 - tileSize / 2) {
    //     tileObject.position.x -= fastTileSpeed;
    //   } else {
    //     tileObject.position.x += fastTileSpeed;
    //   }
    // }
  }
}

function updateTimer() {
  const domElement = document.getElementById("timer");
  domElement.innerText = parseInt(clock.getElapsedTime());
}

// animation function that gets called 60 times a second,
function animate() {
  requestAnimationFrame(animate);

  if (model !== undefined) {
    soldierBB.setFromObject(model.children[0]);
    // soldierBB.copy(model.children[0]).applyMatrix4(model.matrixWorld);
    // checkCollisions();
  }

  let mixerUpdateDelta = clock.getDelta();
  if (characterControls) {
    characterControls.update(mixerUpdateDelta, keysPressed);
  }
  orbitControls.update();
  renderer.render(scene, mainCamera); // all you have to do is change is this line --> just render mainScene which can change between 2 things

  updateTimer();

  moveTiles();

  // if (personObject != undefined){
  //     if (flag){
  //         updateAlienPositions();
  //         flag = false;
  //     }
  // }

  //   if (personObject != undefined) {
  //     updateAlienPositions();
  //   }

  //personObject != undefined &&

  //updating the person's bounding box
  // if (personBoundingBox !== undefined) {
  //   personBoundingBox.copy(personObject.geometry.boundingBox).applyMatrix4(personObject.matrixWorld);
  // }

  // raycaster.intersect();

  const time = performance.now();

  if (controls.isLocked === true) {
    raycaster.ray.origin.copy(model.children[0].position);
    raycaster.ray.origin.y -= 10;

    const intersections = raycaster.intersectObjects(tiles, false);

    const onObject = intersections.length > 0;

    const delta = (time - prevTime) / 1000;

    // velocity.x -= velocity.x * 10.0 * delta;
    // velocity.z -= velocity.z * 10.0 * delta;

    // velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    // direction.z = Number(moveForward) - Number(moveBackward);
    // direction.x = Number(moveRight) - Number(moveLeft);
    // direction.normalize(); // this ensures consistent movements in all directions

    // if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    // if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    if (onObject === true) {
      // velocity.y = Math.max(0, velocity.y);
      // canJump = true;

      console.log("tiles");
    }

    // controls.moveRight(-velocity.x * delta);
    // controls.moveForward(-velocity.z * delta);

    // controls.getObject().position.y += velocity.y * delta; // new behavior

    // if (controls.getObject().position.y < 10) {
    //   velocity.y = 0;
    //   controls.getObject().position.y = 10;

    //   canJump = true;
    // }
  }

  // prevTime = time;
}
