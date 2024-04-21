/**
 * entry.js
 * 
 * This is the first file loaded. It sets up the Renderer, 
 * Scene and Camera. It also starts the render loop and 
 * handles window resizes.
 * 
 */
import WebGL from "three/addons/capabilities/WebGL.js";
import { WebGLRenderer, PerspectiveCamera, Scene, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "stats-js/src/Stats.js";

import SeedScene from "./objects/Scene.js";

// Main entry point
function createCanvas() {
    // renderer
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x7ec0ee, 1);

    // stats
    var stats = new Stats();
    stats.showPanel(1);
    document.body.appendChild(stats.dom);

    // scene
    const scene = new Scene();
    const seedScene = new SeedScene(renderer); // TODO: Rename SeedScene
    scene.add(seedScene);

    // camera
    const camera = new PerspectiveCamera();
    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(2, 1, -2);
    camera.lookAt(new Vector3(0, 0, 0));

    // render loop
    const onAnimationFrameHandler = (timeStamp) => {
        stats.begin();  
        
        controls.update();
        renderer.render(scene, camera);
        seedScene.update && seedScene.update(timeStamp);
        
        stats.end();  
        
        window.requestAnimationFrame(onAnimationFrameHandler);
    };
    window.requestAnimationFrame(onAnimationFrameHandler);

    // resize
    const windowResizeHanlder = () => {
        const { innerHeight, innerWidth } = window;
        renderer.setSize(innerWidth, innerHeight);
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        seedScene.resize(innerWidth, innerHeight);
    };
    windowResizeHanlder();
    window.addEventListener("resize", windowResizeHanlder);

    // dom
    document.body.style.margin = 0;
    document.body.appendChild(renderer.domElement);
}

// Run the app
if (WebGL.isWebGLAvailable()) {
    createCanvas();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.body.appendChild(warning);
}
