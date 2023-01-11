import * as THREE from './node_modules/three/build/three.module.js';
import { PointerLockControls } from './node_modules/three/examples/jsm/controls/PointerLockControls.js'; // might not need this in the end
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';

let camera, scene, renderer, controls;

// const objects = [];
//
let raycaster;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
// const vertex = new THREE.Vector3();
// const color = new THREE.Color();

init();
animate(); 

function loadModel() {
    const loader = new GLTFLoader();

    loader.load( '../BlenderModels/Person.glb', function ( gltf ) {
    
        scene.add( gltf.scene );
    
    }, function ( error ) {
    
        console.error( error );
    
    } );
}


function init() {

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.y = 10;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    scene.fog = new THREE.Fog(0xffffff, 0, 750);

    //loadModel();

    const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
    light.position.set(0.5, 1, 0.75);
    scene.add(light);

    // locks in the mouse basically so you can't see
    controls = new PointerLockControls(camera, document.body);

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', function () {

        controls.lock();

    });

    controls.addEventListener('lock', function () {

        instructions.style.display = 'none';
        blocker.style.display = 'none';

    });

    controls.addEventListener('unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';

    });

    scene.add(controls.getObject());

    // moving the player around
    const onKeyDown = function (event) {

        switch (event.code) {

            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;

            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;

            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;

            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;

            case 'Space':
                if (canJump === true) velocity.y += 350;
                canJump = false;
                break;

        }

    };

    const onKeyUp = function (event) {

        switch (event.code) {

            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;

            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;

            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;

            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;

        }

    };

    // Adding in the event listeners to call the movement
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // what is a THREE.Raycaster --> lighting and shading basically
    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0), 0, 10);

    // floor - The first 2 arguments (width, height)
    // The last 2 arguments correspond to the number of width and height segments --> affect the design on the floor
    let floorGeometry = new THREE.PlaneGeometry(200, 200);
    
    // makes the plane a proper plane (otherwise it defaults to a vertical plane)
    floorGeometry.rotateX(- Math.PI / 2);

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


    window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

// animation function that gets called 60 times a second, I think
function animate() {

    requestAnimationFrame(animate);

    const time = performance.now();

    if (controls.isLocked === true) {

        raycaster.ray.origin.copy(controls.getObject().position);
        raycaster.ray.origin.y -= 10;

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

        //     velocity.y = Math.max(0, velocity.y);
        //     canJump = true;

        // }

        controls.moveRight(- velocity.x * delta);
        controls.moveForward(- velocity.z * delta);

        controls.getObject().position.y += (velocity.y * delta); // new behavior

        if (controls.getObject().position.y < 10) {

            velocity.y = 0;
            controls.getObject().position.y = 10;

            canJump = true;

        }

    }

    prevTime = time;

    renderer.render(scene, camera);

}
