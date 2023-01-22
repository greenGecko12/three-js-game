import * as THREE from "./node_modules/three/build/three.module.js";
import { PointerLockControls } from "./node_modules/three/examples/jsm/controls/PointerLockControls.js"; // might not need this in the end
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { KeyDisplay } from "./helpers/util.js";
import { CharacterControls } from "./characterControls.js";

let peekbackCamera; // this is the second camera view that allows you to peek "back"
let camera, scene, renderer, controls;
let mainCamera;
const cameras = [];

const tiles = []; // holds each tile on the plane
const tileSpeeds = []; // dictates what the behaviour of each tile will be
const alienObjects = [];
const heartSymbol = "&#10084; "; // html code for a heart

let id;
let raycaster;
let lives = 3;
let heartObjects = [];

let instructions;
let blocker;

const planeWidth = 50;
const planeLength = 250;
const startAreasize = 20;

// these values have been decided after some trial and error
const tileSize = parseInt(planeWidth / 7); // 7 for now
const numberOfTiles = 20;

const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 1.0;
const far = 1000.0;

let characterControls;
const clock = new THREE.Clock();
let orbitControls;
let keyDisplayQueue;
let keysPressed;

let model;
let leftWallBB;
let rightWallBB;

const dampingFactor = 0.2;

init();
animate();

//Loads the soldier and enables the animation to make the movement look realistic
function loadSoldier() {
  // MODEL WITH ANIMATIONS
  new GLTFLoader().load("models/Soldier.glb", function (gltf) {
    model = gltf.scene;
    model.traverse(function (object) {
      if (object.isMesh) object.castShadow = true;
    });
    model.scale.set(3.5, 3.5, 3.5);
    model.position.set(0, 0, 110);
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

// show the number of hearts corresponding to the number of lives of the user
function renderNumberOfHearts() {
  const livesLeft = document.getElementById("numberOfLives");
  let string = "Lives: ".concat(heartSymbol.repeat(lives));
  livesLeft.innerHTML = string;
}

// this function is not actually used (because of a change of plans)
function loadAlienModel(path) {
  const loader = new GLTFLoader();

  loader.load(
    path,
    function (gltf) {
      const alienObject = gltf.scene.children[0];
      let pos = getRandomPositionOnPlane();
      alienObject.position.set(pos[0], pos[1], pos[2]);
      scene.add(alienObject);
      alienObjects.push(alienObject);
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min);
}

// creates all the tiles on the plane and adds to them the scene and the tiles array
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

// creates 2 (very flat) cubes that are positioned at the start and end of the track
// in fact the width of both these cube is zero (they are basically just geomatric planes)
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

// creates 3D hearts that are placed on the plane
function generateAllHearts() {
  for (let i = 0; i < lives; i++) {
    const heart = generateHeart();
    heart.position.set(0, 10, 0 + i * 10);
    heartObjects.push(heart);
    scene.add(heart);
  }
}

// returns the mesh for the heart
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

// decreases the number of lives and also checks if the game is over or not
function loseLife() {
  lives -= 1;
  console.log(lives);
  if (lives <= 0) {
    gameLost();
  }

  //Updates the number of hearts being displayed
  // can't go below zero or the game will crash
  if (lives > -1) {
    renderNumberOfHearts();
  }
}

//generates a random position on the plane (utility function basically)
function getRandomPositionOnPlane() {
  const x = Math.random() * planeWidth;
  const y = 5; // this is the height of the alien
  const z = Math.random() * planeLength;

  return [x, y, z];
}

// initialises the scene
function init() {
  renderNumberOfHearts();

  // RENDERER
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // creating the two cameras that are going to be used
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.y = 20;
  camera.position.z = -20;

  peekbackCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  peekbackCamera.position.y = 10;
  peekbackCamera.position.z = -20;

  mainCamera = camera;

  cameras.push(camera, peekbackCamera);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 0, 750);

  // CONTROLS
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.minDistance = 5;
  orbitControls.maxDistance = 15;
  orbitControls.enablePan = true;
  orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
  orbitControls.update();

  // adding in the relevant objects
  loadSoldier(); // this is an asychronous function
  createStartAndEndSections();
  generateTiles();

  // adding in all the lights
  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.5); // no shadows
  light.position.set(50, 10, 75);
  scene.add(light);

  const light2 = new THREE.AmbientLight(0x404040, 0.5); // no shadows
  scene.add(light2);

  const dirLight = new THREE.DirectionalLight(0xfffffff, 0.6, 50); // shadows
  dirLight.position.set(40, 90, 100);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const dirLight3 = new THREE.PointLight(0xfffffff, 1, 100); // shadows
  dirLight3.position.set(50, 50, 50);
  dirLight3.castShadow = true;
  scene.add(dirLight3);

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

  blocker = document.getElementById("blocker");
  instructions = document.getElementById("instructions");

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
  raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 2000);

  // floor - The first 2 arguments (width, height)
  // The last 2 arguments correspond to the number of width and height segments --> affect the design on the floor
  let floorGeometry = new THREE.PlaneGeometry(planeWidth, planeLength);

  // this next chunk of code creates the walls and adds to the right positions
  let leftWall = new THREE.BoxGeometry(5, planeLength, 5);
  let rightWall = new THREE.BoxGeometry(5, planeLength, 5);
  leftWall.rotateZ(Math.PI / 2);
  leftWall.rotateY(Math.PI / 2);

  rightWall.rotateZ(Math.PI / 2);
  rightWall.rotateY(-Math.PI / 2);

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
  floor.receiveShadow = true;
  scene.add(floor);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  mainCamera.aspect = window.innerWidth / window.innerHeight;
  mainCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  keyDisplayQueue.updatePosition();
}

// function to reduce the amount of repeated code between gameLost and checkIfGameWon
function ending() {
  instructions.style.display = "none";
  blocker.style.display = "none";
  controls.unlock();
  document.getElementById("level-instructions").style.display = "none";
}

// ending the game
function gameLost() {
  ending();
  document.getElementById("finish-lose").style.display = "";
  cancelAnimationFrame(id); // literally stops the animation
}

// player has won the game
function checkIfGameWon() {
  // checks if the player has reached the other end of the plane
  if (model !== undefined) {
    if (model.position.z <= -107) {
      ending();
      const DOMelement = document.getElementById("finish-win");
      DOMelement.style.display = "";
      DOMelement.innerText += parseInt(clock.getElapsedTime()) + " seconds";
      cancelAnimationFrame(id); // literally stops the animation
    }
  }
}

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
  }
}

// if the x coordinate of the player is too large or too smaller, the player
function checkCheating() {
  if (Math.abs(model.position.x) > planeWidth / 2) {
    ending();
    document.getElementById("finish-cheating").style.display = "";
    cancelAnimationFrame(id); // literally stops the animation
  }
}

// to inform the user how long they've spent on the level so far
function updateTimer() {
  const domElement = document.getElementById("timer");
  domElement.innerText = parseInt(clock.getElapsedTime());
}

// animation function that gets called 60 times a second
function animate() {
  id = requestAnimationFrame(animate);

  // checking if the user has stepped on a tile and if so removing it from the scene
  if (controls.isLocked === true) {
    // constantly have to check if the player has reached the "finishing line"
    if (model !== undefined) {
      checkIfGameWon();
      checkCheating();
    }

    let mixerUpdateDelta = clock.getDelta();
    if (characterControls) {
      characterControls.update(mixerUpdateDelta, keysPressed);
    }
    orbitControls.update();

    // updating time status and moving the tiles across the bridge
    updateTimer();
    moveTiles();

    raycaster.ray.origin.copy(model.position);
    raycaster.ray.origin.y += 2;

    const intersections = raycaster.intersectObjects(tiles, true);
    const onObject = intersections.length > 0;

    if (onObject === true) {
      for (let tileObject of intersections) {
        scene.remove(tileObject.object);
        tiles.splice(tiles.indexOf(tileObject.object), 1);
      }
      loseLife();
    }
  }
  renderer.render(scene, mainCamera);
}
