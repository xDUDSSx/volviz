import * as THREE from "three";
import BasicLights from "./objects/Lights.js";
import Loader from "./Loader.js";
import Raymarcher from "./Raymarcher.js";
import Clearview from "./Clearview.js";

export default class VolumeWorld {
    settings;
    scene;
    raymarcher;

    clearview;

    /**
     * @param {THREE.WebGLRenderer} renderer
     */
    constructor(renderer, settings) {
        this.settings = settings;

        this.scene = new THREE.Scene();
      
        this.renderer = renderer;
        let rendererSize = new THREE.Vector2();
        this.renderer.getSize(rendererSize);

        this.raymarcher = new Raymarcher(rendererSize);

        const lights = new BasicLights();
        this.scene.add(lights);

        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);
    }

    loadCTHead(ui) {
        let loadingCallback = (val) => {
            ui.loadingButton.title = Math.round(val * 100) + " %";
        };
        Loader.loadCTHeadTexture(loadingCallback).then((textureData) => {
            ui.loadingPane.hidden = true;
            
            // Assign the loaded volume texture to the shader
            let {texture: volumeTexture, dataMin, dataMax} = textureData;
            
            this.settings.volumeMin = dataMin;
            this.settings.volumeMax = dataMax;

            let volumeBox = this.raymarcher.setVolume(volumeTexture, this.settings);
            
            // Create the cube object for rendering back faces using the raymarcher
            let cube = new THREE.Mesh(volumeBox, this.raymarcher.raymarcherShader);
            this.scene.add(cube);

            let rendererSize = new THREE.Vector2();
            this.renderer.getSize(rendererSize);
            this.clearview = new Clearview(this.raymarcher, rendererSize, volumeBox);
        });
    }

    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.PerspectiveCamera} camera
     */
    render(renderer, camera) {
        // First pass: render positions of the front side of the volume cube
        this.raymarcher.renderRaymarcherPositionCube(renderer, camera);
        
        if (this.clearview) this.clearview.render(renderer, camera);

        // this.raymarcher.renderIsosurface(renderer, camera);

        // Second pass: render the back sides of the volume cube with the raymarching shader.
        // renderer.setRenderTarget(null);
        // renderer.setClearAlpha(1);
        // renderer.render(this.scene, camera);
    }

    update() {
        this.raymarcher.update(this.settings);
        if (this.clearview) this.clearview.update(this.settings);
    }

    resize(width, height, pixelRatio = window.devicePixelRatio) {
        // console.log("Resize event: ", width, height, " Pixel ratio: ", pixelRatio);
        let realWidth = width * pixelRatio;
        let realHeight = height * pixelRatio;
        
        this.raymarcher.resize(realWidth, realHeight);
        if (this.clearview) this.clearview.resize(realWidth, realHeight);
    }
}
