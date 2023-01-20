import * as THREE from "./node_modules/three/build/three.module.js";
import { PointerLockControls } from "./node_modules/three/examples/jsm/controls/PointerLockControls.js"; // might not need this in the end
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { KeyDisplay } from "./helpers/util.js";
import { CharacterControls } from "./characterControls.js";

let camera, scene, renderer, controls;

const objects = [];

let raycaster;
let lives = 3;
let zombiesKilled = 0;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();

// movement variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 1.0;
const far = 1000.0;

const floorSize = 200;
const heartSymbol = "&#10084; "; // html code for a heart

init();
animate();

function renderNumberOfHearts() {
  const livesLeft = document.getElementById("numberOfLives");
  let string = "Lives: ".concat(heartSymbol.repeat(lives));
  livesLeft.innerHTML = string;
}

function increaseZombieCount() {
  zombiesKilled += 1;
  const domElement = document.getElementById("zombies");
  domElement.innerText = zombiesKilled;
}

// this function inserts the
function insertWalls() {
  const wall1 = 1;
  const wall2 = 2;
  const wall3 = 3;
  const wall4 = 4;
}

function detectCollisionWithWalls() {}

function detectCollisionWithZombies() {}

function init() {
  // movement controls --> used in 2nd level
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
    }
  };

  // movement controls --> used in 2nd level
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
  renderNumberOfHearts();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.Fog(0xffffff, 0, 750);

  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.y = 5;
  scene.add(camera);

  // adding the light for the second level
  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.5); // no shadows
  light.position.set(100, 100, 50);
  scene.add(light);

  const dirLight = new THREE.DirectionalLight(0xfffffff, 0.6, 50); // shadows
  dirLight.position.set(70, 50, -10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);

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

  // adding the floor here
  let floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
  floorGeometry.rotateX(-Math.PI / 2);

  const floorTextureLoader = new THREE.TextureLoader();
  const material = floorTextureLoader.load("./textures/tiling.jpg");
  material.wrapS = THREE.RepeatWrapping;
  material.wrapT = THREE.RepeatWrapping;
  material.repeat.set(20, 20);

  const floorMaterial = new THREE.MeshStandardMaterial({ map: material, side: THREE.FrontSide });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  scene.add(floor);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();

  if (controls.isLocked === true) {
    // raycaster.ray.origin.copy(controls.getObject().position);
    // raycaster.ray.origin.y -= 10;

    // const intersections = raycaster.intersectObjects(objects, false);

    // const onObject = intersections.length > 0;

    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    // if (onObject === true) {
    //   velocity.y = Math.max(0, velocity.y);
    //   canJump = true;
    // }

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.getObject().position.y += velocity.y * delta; // new behavior

    // top prevent the person from falling thorugh the floor basically
    if (controls.getObject().position.y < 10) {
      velocity.y = 0;
      controls.getObject().position.y = 10;

      canJump = true;
    }
  }

  prevTime = time;

  renderer.render(scene, camera);
}
