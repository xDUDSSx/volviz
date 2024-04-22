/**
 * entry.js
 * 
 * This is the first file loaded. It sets up the Renderer, 
 * Scene and Camera. It also starts the render loop and 
 * handles window resizes.
 * 
 */
import WebGL from "three/addons/capabilities/WebGL.js";
import { WebGLRenderer, PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "stats-js/src/Stats.js";

import VolumeScene from "./objects/Scene.js";

// Main entry point
function createCanvas() {
    // renderer
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x7ec0ee, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // stats
    var stats = new Stats();
    stats.showPanel(1);
    document.body.appendChild(stats.dom);

    // camera
    const camera = new PerspectiveCamera();
    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(4, 2, 2);
    camera.lookAt(new Vector3(0, 0, 0));

    // scene
    const volumeScene = new VolumeScene(renderer);

    // render loop
    const onAnimationFrameHandler = (timeStamp) => {
        stats.begin();  
        
        controls.update();
        volumeScene.update && volumeScene.update(timeStamp);

        volumeScene.render(renderer, camera);
        
        stats.end();
        
        window.requestAnimationFrame(onAnimationFrameHandler);
    };
    window.requestAnimationFrame(onAnimationFrameHandler);

    // resize
    const windowResizeHanlder = () => {
        const { innerHeight, innerWidth } = window;
        renderer.setSize(innerWidth, innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        volumeScene.resize(innerWidth, innerHeight, renderer.getPixelRatio());
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
