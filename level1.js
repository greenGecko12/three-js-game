import * as THREE from "./node_modules/three/build/three.module.js";
import { PointerLockControls } from "./node_modules/three/examples/jsm/controls/PointerLockControls.js"; // might not need this in the end
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";

let camera, scene, renderer, controls;

// these two arrays holds the objects for collision detection
const zombies = [];
const zombieBoundingBoxes = [];

//bounding box for the bullet being checked for collision
let bulletBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
// const bulletBBS = [];

let blocker;
let instructions;
// let cameraLookatVector = new THREE.Vector3();

let lives = 3;
let zombiesKilled = 0;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const textureLoader = new THREE.TextureLoader();

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
const collisionThreshold = 2; // might change later as necessary

let zombiePosition;
let distance;

// creating the array that holds all the directions that the zombies will move in
let randomDirection;
const randomDirections = [];
for (let i = 0; i < numberOfZombies; i++) {
  randomDirection = new THREE.Vector3(Math.random() * dampingFactor, 0, Math.random() * dampingFactor);
  randomDirections.push(randomDirection);
}

init();
animate();

// this function changes the position and the velocity of the zombie
function respawnZombie(zombieIndex) {
  zombies[zombieIndex].position.set(
    getRandomInt(-floorSize / 2 + slack, floorSize / 2 - slack),
    9,
    getRandomInt(-floorSize / 2 + slack, floorSize / 2 - slack)
  );

  randomDirections[zombieIndex] = new THREE.Vector3(Math.random() * dampingFactor, 0, Math.random() * dampingFactor);
  zombieBoundingBoxes[zombieIndex].setFromObject(zombies[zombieIndex]);
}

// for zombie collision with the user (i.e. the camera's coordinates)
// if distance is less than a threshold then it counts as a "collision"
function calculateEuclideanDistance(zombieIndex) {
  zombiePosition = zombies[zombieIndex].position;

  const total =
    Math.pow(zombiePosition.x - camera.position.x, 2) +
    Math.pow(zombiePosition.y - camera.position.y, 2) +
    Math.pow(zombiePosition.z - camera.position.z, 2);
  // console.log(total);
  distance = Math.sqrt(total);

  // true means a collision has happend
  if (distance < collisionThreshold) {
    respawnZombie(zombieIndex);
    loseLife();
  }
}

// reduce number of lives the user has and ends the game basically
function loseLife() {
  lives -= 1;
  if (lives <= 0) {
    instructions.style.display = "none";
    blocker.style.display = "none";
    controls.unlock();
    document.getElementById("level-instructions").style.display = "none";
    document.getElementById("finish").style.display = "";
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
}

// not used because this function is bug-ridden
// its intention is to insert a crosshair right in the centre of screen to see where the bullets would go
function insertCrossHair() {
  const crosshairMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });

  verticalCrosshairLine = new THREE.BoxGeometry(1, 1, 0);
  horizontalCrosshairLine = new THREE.BoxGeometry(1, 1, 0);

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
  let zombieBoundingBox;

  loader.load(
    "models/Zombie.glb",
    function (gltf) {
      const zombieObject = gltf.scene.children[0];
      // the zombies are placed in a random location on the place
      zombieObject.position.set(
        getRandomInt(-floorSize / 2 + slack, floorSize / 2 - slack),
        9,
        getRandomInt(-floorSize / 2 + slack, floorSize / 2 - slack)
      );
      zombieObject.scale.set(2, 2, 2);
      zombieObject.rotateY(getRandomInt(-Math.PI, Math.PI));
      scene.add(zombieObject);
      zombies.push(zombieObject);

      // adding the bounding box for collision
      zombieBoundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
      zombieBoundingBox.setFromObject(zombieObject.children[0]);
      zombieBoundingBoxes.push(zombieBoundingBox);
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );
}

// this function is called in the animate function
// moves the zombies and also "reflects" them off the walls if they reach the edge of the plane
function animateZombies() {
  for (let zombie in zombies) {
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
    zombies[zombie].rotateY((-Math.PI / 100) * Math.random());

    // we need to update the bounding boxes of the zombies
    zombieBoundingBoxes[zombie].setFromObject(zombies[zombie]);

    calculateEuclideanDistance(zombie);

    // checking if any of the bullets touch any of the zombies
    for (let bullet of bullets) {
      if (bullet.alive === true) {
        bulletBB.setFromObject(bullet);
        if (bulletBB.intersectsBox(zombieBoundingBoxes[zombie])) {
          // if the bullet collides with zombie then we have to respawn the zombie
          // scene.remove(bullet);
          // bullets.splice(bullets.indexOf(bullet), 1);
          // bulletBBS.splice(bullets.indexOf(bullet), 1);
          // scene.remove(bullet);
          respawnZombie(zombie);
          increaseZombieCount();
        }
      }
    }
  }
}

// create a new bullet and fires it
function fireBullet() {
  // creates a bullet as a Mesh object
  let bullet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xaf9b60 }));

  let lookDir = new THREE.Vector3();
  camera.getWorldDirection(lookDir);
  bullet.position.copy(controls.getObject().position).addScaledVector(lookDir, 3);
  // console.log(bullet.position);

  // position the bullet to come from the camera
  // bullet.position.set(camera.position.x, camera.position.y, camera.position.z);

  // set the velocity of the bullet
  // bullet.velocity = new THREE.Vector3(-Math.sin(camera.rotation.y), 0, Math.cos(camera.rotation.y));

  // console.log(bullet.velocity);

  // bullet.velocity = new THREE.Vector3(lookDir).multiplyScalar(3);
  // console.log(lookDir);
  bullet.velocity = lookDir;

  // console.log("=============================================");
  // console.log(bullet.velocity);
  // camera.getWorldDirection(cameraLookatVector);

  // console.log(cameraLookatVector);
  // console.log("=============================================");
  // bullet.velocity = new THREE.Vector3(cameraLookatVector);

  // after 1000ms, set alive to false and remove from scene
  // setting alive to false flags our update code to remove
  // the bullet from the bullets array
  bullet.alive = true;
  setTimeout(function () {
    bullet.alive = false;
    scene.remove(bullet);
    bullets.splice(bullets.indexOf(bullet), 1);
  }, 1000);

  // add to scene, array
  bullets.push(bullet);
  // bulletBBS.push(bulletBB.setFromObject(bullet));
  scene.add(bullet);

  // console.log(bullets);
}

// The maximum is exclusive and the minimum is inclusive
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function init() {
  // movement controls --> same as the pointerlock example
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

  // movement controls
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

  // this next chunk of code sets up the scene, camera, lighting etc.
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0xffffff, 0, 750);

  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.y = 5;
  scene.add(camera);

  // adding the light for the first level
  const light = new THREE.AmbientLight(0x404040, 0.5); // no shadows
  scene.add(light);

  const dirLight = new THREE.DirectionalLight(0xfffffff, 0.6, 50); // shadows
  dirLight.position.set(70, 50, -10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const dirLight2 = new THREE.DirectionalLight(0xfffffff, 0.6, 50); // shadows
  dirLight2.position.set(-70, 50, 100);
  dirLight2.castShadow = true;
  scene.add(dirLight2);

  const dirLight3 = new THREE.PointLight(0xfffffff, 1, 100); // shadows
  dirLight3.position.set(50, 50, 50);
  dirLight3.castShadow = true;
  scene.add(dirLight3);

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousedown", fireBullet);

  // adding the walls and the zombies into the game
  insertWalls();
  spawnZombies();

  controls = new PointerLockControls(camera, document.body);

  blocker = document.getElementById("blocker");
  instructions = document.getElementById("instructions");

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

  // repeating the texture both in the x and y directions so that it looks near (and not pixelated)
  const material = textureLoader.load("./textures/tiling.jpg");
  material.wrapS = THREE.RepeatWrapping;
  material.wrapT = THREE.RepeatWrapping;
  material.repeat.set(20, 20);

  const floorMaterial = new THREE.MeshStandardMaterial({ map: material, side: THREE.FrontSide });

  // adding the floor to the scene
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
    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= 6.7 * 100.0 * delta; // 100.0 = mass

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    // we also need to check whether the camera is moving out of bounds (i.e. it can't move outside the wall)
    if (moveForward || moveBackward) {
      velocity.z -= direction.z * 400.0 * delta;
    }
    if (moveLeft || moveRight) {
      velocity.x -= direction.x * 400.0 * delta;
    }

    // checking for camera collisions with walls here
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
