import * as THREE from "./node_modules/three/build/three.module.js";
import { PointerLockControls } from "./node_modules/three/examples/jsm/controls/PointerLockControls.js"; // might not need this in the end
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";

let camera, scene, renderer, controls;

// these two arrays holds the objects for collision detection
const zombies = [];
const walls = [];

let raycaster;
let lives = 3;
let zombiesKilled = 0;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();
const textureLoader = new THREE.TextureLoader();

// movement variables
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let gameOver = false;

const fov = 75;
const aspect = window.innerWidth / window.innerHeight;
const near = 1.0;
const far = 1000.0;

const floorSize = 200;
const slack = parseInt(floorSize / 10);
const wallHeight = 50;
const wallDepth = 5;
const heartSymbol = "&#10084; "; // html code for a heart
const numberOfZombies = 6; // each zombie has its own direction (same speed though)

const bullets = [];

//basically just two boxes positioned right in "front of the camera"
let verticalCrosshairLine;
let horizontalCrosshairLine;
let horizontalMesh;
let veticalMesh;
const dampingFactor = 0.4; // decreases the speed of the zombies

// used in zombie collision
const X_edge = floorSize / 2;
const Z_edge = X_edge; // same value because the floor is a square
const zombieCollisionSlack = 4;

let randomDirection;
const randomDirections = [];
for (let i = 0; i < numberOfZombies; i++) {
  randomDirection = new THREE.Vector3(Math.random() * dampingFactor, 0, Math.random() * dampingFactor);
  randomDirections.push(randomDirection);
}

init();
animate();

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

// this function also displays number of zombies killed
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

// I think zombies should keep moving in a straight line
// When they reach the wall they should just "reflect" off that wall

// for every zombie that is killed a new one is added back in the game
// random location (not the same location as the user) and random direction
function spawnZombies() {
  for (let i = 0; i < numberOfZombies; i++) {
    loadZombie();
  }
}

// this function inserts the 4 walls into the scene
function insertWalls() {
  //const cubeTextureLoader = new THREE.CubeTextureLoader();
  const wallMaterialL = textureLoader.load("./textures/brick_wall.jpg");
  wallMaterialL.wrapS = THREE.RepeatWrapping;
  wallMaterialL.wrapT = THREE.RepeatWrapping;
  wallMaterialL.repeat.set(10, 2);

  const wallMaterial = new THREE.MeshStandardMaterial({ map: wallMaterialL, side: THREE.FrontSide });
  //const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });

  const wallGeometry = new THREE.BoxGeometry(floorSize, wallHeight, wallDepth);

  wallGeometry.rotateZ(Math.PI);
  wallGeometry.rotateY(Math.PI / 2);

  const wallGeometry2 = new THREE.BoxGeometry(floorSize, wallHeight, wallDepth);

  wallGeometry2.rotateY(Math.PI);
  wallGeometry2.rotateX(Math.PI);

  const wall1 = new THREE.Mesh(wallGeometry, wallMaterial);
  const wall2 = new THREE.Mesh(wallGeometry, wallMaterial);
  const wall3 = new THREE.Mesh(wallGeometry2, wallMaterial);
  const wall4 = new THREE.Mesh(wallGeometry2, wallMaterial);

  // the positions of the walls shouldn't change during the game
  wall1.position.set(-floorSize / 2, wallHeight / 2, 0);
  wall2.position.set(floorSize / 2, wallHeight / 2, 0);
  wall3.position.set(0, wallHeight / 2, -floorSize / 2);
  wall4.position.set(0, wallHeight / 2, floorSize / 2);

  scene.add(wall1, wall2, wall3, wall4);
  walls.push(wall1, wall2, wall3, wall4); // for collisions
}

function insertCrossHair() {
  const crosshairMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });

  // verticalCrosshairLine = new THREE.BoxGeometry(0.05, 0.2, 0);
  // horizontalCrosshairLine = new THREE.BoxGeometry(0.2, 0.05, 0);

  verticalCrosshairLine = new THREE.BoxGeometry(1, 1, 0);
  horizontalCrosshairLine = new THREE.BoxGeometry(1, 1, 0);
  // horizontalCrosshairLine.rotateZ(-Math.PI);

  veticalMesh = new THREE.Mesh(verticalCrosshairLine, crosshairMaterial);
  horizontalMesh = new THREE.Mesh(horizontalCrosshairLine, crosshairMaterial);

  veticalMesh.position.set(camera.position.x, camera.position.y + 5, camera.position.z - 5);
  horizontalMesh.position.set(camera.position.x, camera.position.y + 1, camera.position.z - 5);

  scene.add(veticalMesh, horizontalMesh);
}

// need to experiment with Quaterions to make the crosshair work properly
function updateCrosshairPosition() {
  veticalMesh.position.set(camera.position.x, camera.position.y + 5, camera.position.z - 1);
  horizontalMesh.position.set(camera.position.x, camera.position.y + 5, camera.position.z - 1);
}

// load the actual zombie models inside this function using GlTF loader
function loadZombie() {
  const loader = new GLTFLoader();

  loader.load(
    "models/Zombie.glb",
    function (gltf) {
      const zombieObject = gltf.scene.children[0];
      zombieObject.position.set(
        getRandomInt(-floorSize / 2 + slack, floorSize / 2 - slack),
        9,
        getRandomInt(-floorSize / 2 + slack, floorSize / 2 - slack)
      );
      zombieObject.scale.set(2, 2, 2);
      zombieObject.rotateY(getRandomInt(-Math.PI, Math.PI));
      // zombieObject.direction = new THREE.Vector3(1, 1, 1);
      scene.add(zombieObject);
      zombies.push(zombieObject);
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );
}

/*
TODO Next: 

Bullet collision with Zombies and then respawning them
In Level 2: camera fix, win detection, (maybe bouncing off walls)

*/

function animateZombies() {
  for (let zombie in zombies) {
    // zombies[zombie].lookAt(zombies[zombie].position + randomDirections[zombie]);

    // check for collisions with walls here
    if (
      Math.abs(zombies[zombie].position.x) >= X_edge - zombieCollisionSlack ||
      Math.abs(zombies[zombie].position.z) >= Z_edge - zombieCollisionSlack
    ) {
      if (Math.abs(zombies[zombie].position.x) >= X_edge - zombieCollisionSlack) {
        randomDirections[zombie].x *= -1;
      }
      if (Math.abs(zombies[zombie].position.z) >= Z_edge - zombieCollisionSlack) {
        randomDirections[zombie].z *= -1;
      }
    }
    zombies[zombie].position.add(randomDirections[zombie]);
  }

  // console.log("Collision");
}

// create a new bullet and fires it
function fireBullet() {
  // creates a bullet as a Mesh object
  let bullet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));

  // position the bullet to come from the player's weapon
  // right now, it's just coming from the camera -- change later
  bullet.position.set(camera.position.x, camera.position.y, camera.position.z);

  // set the velocity of the bullet
  bullet.velocity = new THREE.Vector3(-Math.sin(camera.rotation.y), 0, Math.cos(camera.rotation.y)); // Look into

  // after 1000ms, set alive to false and remove from scene
  // setting alive to false flags our update code to remove
  // the bullet from the bullets array
  bullet.alive = true;
  setTimeout(function () {
    bullet.alive = false;
    scene.remove(bullet);
  }, 1000);

  // add to scene, array, and set the delay to 10 frames
  bullets.push(bullet);
  scene.add(bullet);
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min) + min);
}

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
  scene.background = new THREE.Color(0x87ceeb);
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

  const dirLight2 = new THREE.DirectionalLight(0xfffffff, 0.6, 50); // shadows
  dirLight2.position.set(-70, 50, 100);
  dirLight2.castShadow = true;
  scene.add(dirLight2);

  const dirLight3 = new THREE.DirectionalLight(0xfffffff, 0.6, 50); // shadows
  dirLight3.position.set(-70, 50, -100);
  dirLight3.castShadow = true;
  scene.add(dirLight3);

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousedown", fireBullet);

  insertWalls(); // thought it would be neater to put this code in its own function
  // insertCrossHair();
  spawnZombies();

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

  const material = textureLoader.load("./textures/tiling.jpg");
  material.wrapS = THREE.RepeatWrapping;
  material.wrapT = THREE.RepeatWrapping;
  material.repeat.set(20, 20);

  const floorMaterial = new THREE.MeshStandardMaterial({ map: material, side: THREE.FrontSide });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.receiveShadow = true;
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
    velocity.y -= 6.7 * 100.0 * delta; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    // we also need to check whether the camera is moving out of bounds (i.e. it can't move outside the wall)
    if (moveForward || moveBackward) {
      // if (!(Math.abs(camera.position.z) < Z_edge - 10)) {
      //   velocity.z = 0;
      // } else {
      velocity.z -= direction.z * 400.0 * delta;
      // }
    }
    if (moveLeft || moveRight) {
      // if (!(Math.abs(camera.position.x) < X_edge - 10)) {
      //   velocity.x = 0;
      // } else {
      velocity.x -= direction.x * 400.0 * delta;
      // }
    }

    // if (onObject === true) {
    //   velocity.y = Math.max(0, velocity.y);
    //   canJump = true;
    // }

    // check for camera collisions with walls here

    // if (
    //    >= X_edge - zombieCollisionSlack ||
    //   Math.abs(zombies[zombie].position.z) >= Z_edge - zombieCollisionSlack
    // ) {
    //   if (Math.abs(zombies[zombie].position.x) >= X_edge - zombieCollisionSlack) {
    //     randomDirections[zombie].x *= -1;
    //   }
    //   if (Math.abs(zombies[zombie].position.z) >= Z_edge - zombieCollisionSlack) {
    //     randomDirections[zombie].z *= -1;
    //   }
    // }

    if (Math.abs(camera.position.x) < X_edge - 10) {
      controls.moveRight(-velocity.x * delta);
    }

    if (Math.abs(camera.position.z) < Z_edge - 10) {
      controls.moveForward(-velocity.z * delta);
    }

    controls.getObject().position.y += velocity.y * delta; // new behavior

    // top prevent the person from falling thorugh the floor basically
    if (controls.getObject().position.y < 10) {
      velocity.y = 0;
      controls.getObject().position.y = 10;

      canJump = true;
    }

    // updateCrosshairPosition();

    // creating a loop to animate all the bullets
    // and remove the bullets when necessary
    for (let index = 0; index < bullets.length; index += 1) {
      if (bullets[index] === undefined) continue;
      if (bullets[index].alive == false) {
        bullets.splice(index, 1);
        continue;
      }

      bullets[index].position.add(bullets[index].velocity);
    }

    animateZombies();
  }

  prevTime = time;

  renderer.render(scene, camera);
}
