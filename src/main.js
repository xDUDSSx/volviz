import WebGL from "three/addons/capabilities/WebGL.js";
import { WebGLRenderer, PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "stats-js/src/Stats.js";
import UI from "~/ui/UI.js";
import {threeJsShaderDebugCallback} from "~/utils.js";

import VolumeWorld from "./renderer/VolumeWorld.js";

let volumeWorld;

// Main entry point
function createCanvas(settings) {
    // renderer
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x7ec0ee, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.debug.checkShaderErrors = true;
    renderer.debug.onShaderError = threeJsShaderDebugCallback;

    // stats
    var stats = new Stats();
    stats.showPanel(1);
    document.body.appendChild(stats.dom);

    // camera
    const camera = new PerspectiveCamera();
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.zoomSpeed = 1;
    camera.position.set(4, 2, 2);
    camera.lookAt(new Vector3(0, 0, 0));

    // scene
    volumeWorld = new VolumeWorld(renderer, settings);

    // render loop
    const onAnimationFrameHandler = (timeStamp) => {
        stats.begin();  
        
        controls.update();
        volumeWorld.update && volumeWorld.update(timeStamp);

        volumeWorld.render(renderer, camera);
        
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
        volumeWorld.resize(innerWidth, innerHeight, renderer.getPixelRatio());
    };
    windowResizeHanlder();
    window.addEventListener("resize", windowResizeHanlder);

    // dom
    document.body.style.margin = 0;
    document.body.appendChild(renderer.domElement);
}

class Settings {
    mode = 1;
    samples = 50;
    noise = 0.1;
}

// Run the app
if (WebGL.isWebGLAvailable()) {
    let settings = new Settings();
    createCanvas(settings);
    let ui = new UI(settings);
    volumeWorld.loadCTHead(ui);
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.body.appendChild(warning);
}
