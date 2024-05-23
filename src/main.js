import WebGL from "three/addons/capabilities/WebGL.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import Stats from "stats-js/src/Stats.js";
import UI from "~/ui/UI.js";
import {threeJsShaderDebugCallback} from "~/utils.js";

import VolumeWorld from "./renderer/VolumeWorld.js";

let volumeWorld;

// Main entry point
function createCanvas(settings) {
    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x7ec0ee, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    renderer.debug.checkShaderErrors = true;
    renderer.debug.onShaderError = threeJsShaderDebugCallback;

    // stats
    var stats = new Stats();
    stats.showPanel(1);
    document.body.appendChild(stats.dom);

    // camera
    const camera = new THREE.PerspectiveCamera();
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.zoomSpeed = 1;
    
    camera.position.set(-2, 0.75, 2.8);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // scene
    volumeWorld = new VolumeWorld(renderer, camera, settings);

    const pointMesh = new THREE.Mesh(undefined, undefined);
    volumeWorld.scene.add(pointMesh);
    pointMesh.position.copy(settings.controlPointLocation);
    pointMesh.visible = false;

    // clearview point control
    const pointControl = new TransformControls(camera, renderer.domElement);
    pointControl.addEventListener("dragging-changed", function (event) {
        orbitControls.enabled = !event.value;
    });
    pointControl.addEventListener("change", function () {
        // console.log(pointMesh.position);
        settings.controlPointLocation.copy(pointMesh.position);
    });
    pointControl.visible = settings.controlPointVisible;
    volumeWorld.scene.add(pointControl);
    pointControl.attach(pointMesh);

    // render loop
    const onAnimationFrameHandler = (timeStamp) => {
        stats.begin();  
        
        orbitControls.update();

        pointControl.visible = settings.controlPointVisible;
        pointControl.enabled = settings.controlPointVisible;

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
    method = 0;
    mode = 1;
    samples = 256;
    noise = 0.1;

    axesVisible = false;

    // Clearview
    controlPointVisible = false;
    controlPointLocation = new THREE.Vector3(-0.144, -0.278, 0.482);
    worldSpaceLighting = false;
    
    isovalue1 = 0.22;
    isovalue2 = 0.51;

    normalSampleFactor = 1.0;

    volumeMin = 0;
    volumeMax = 0;
    
    gradient = "";
    wgrad = 0.2;
    wsil = 0.5;
    wlight = 0.3;
    ks = 0.4;
    kt = 4.0;
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
