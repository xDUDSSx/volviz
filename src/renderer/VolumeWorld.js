import * as THREE from "three";
// import BasicLights from "./objects/Lights.js";
import Loader from "./Loader.js";
import Raymarcher from "./Raymarcher.js";
import Clearview from "./Clearview.js";
import IllustrativeRaymarcher from "./IllustrativeRaymarcher.js";

export default class VolumeWorld {
    settings;
    scene;
    raymarcher;

    clearview;
    illustrativeRaymarcher;

    /**
     * @param {THREE.WebGLRenderer} renderer
     */
    constructor(renderer, camera, settings) {
        this.settings = settings;

        this.scene = new THREE.Scene();
      
        this.renderer = renderer;
        let rendererSize = new THREE.Vector2();
        this.renderer.getSize(rendererSize);

        this.raymarcher = new Raymarcher(rendererSize);
        this.raymarcher.setGradientCanvas(settings.gradientCanvas);
        // const lights = new BasicLights();
        // this.scene.add(lights);

        const size = 2;
        const divisions = 10;

        this.gridHelper = new THREE.GridHelper( size, divisions );
        this.gridHelper.position.set(0, -0.001, 0);
        this.gridHelper.visible = settings.axesVisible;
        this.scene.add(this.gridHelper);

        this.axesHelper = new THREE.AxesHelper(2);
        this.axesHelper.visible = settings.axesVisible;
        this.scene.add(this.axesHelper);
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
            
            // let cube = new THREE.Mesh(volumeBox, this.raymarcher.raymarcherShader);
            // this.scene.add(cube);

            let rendererSize = new THREE.Vector2();
            this.renderer.getSize(rendererSize);
            rendererSize = rendererSize.multiplyScalar(this.renderer.getPixelRatio());

            this.clearview = new Clearview(this.raymarcher, rendererSize, volumeBox, this.settings);
            
            this.illustrativeRaymarcher = new IllustrativeRaymarcher(this.raymarcher, rendererSize, volumeBox);            
        });
    }

    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.PerspectiveCamera} camera
     */
    render(renderer, camera) {
        renderer.setRenderTarget(null);
        renderer.setClearAlpha(1);
        renderer.clear();

        // First pass: render positions of the front side of the volume cube
        this.raymarcher.renderRaymarcherPositionCube(renderer, camera);

        // Second pass: render the back sides of the volume cube with the appropriate shader.
        switch (this.settings.method)
        {
        case 0:
            if (this.clearview) this.clearview.render(renderer, camera);
            break;
        case 1:
        case 2:
        case 3:
            if (this.illustrativeRaymarcher) this.illustrativeRaymarcher.render(renderer, camera);
            break;
        }

        // Third pass: render anything else in the scene (grid/axes helper)
        renderer.render(this.scene, camera);
    }

    update() {
        this.raymarcher.update(this.settings);
        if (this.clearview) this.clearview.update(this.settings);
        if (this.illustrativeRaymarcher) this.illustrativeRaymarcher.update(this.settings);

        this.gridHelper.visible = this.settings.axesVisible;
        this.axesHelper.visible = this.settings.axesVisible;
    }

    resize(width, height, pixelRatio = window.devicePixelRatio) {
        // console.log("Resize event: ", width, height, " Pixel ratio: ", pixelRatio);
        let realWidth = width * pixelRatio;
        let realHeight = height * pixelRatio;
        
        this.raymarcher.resize(realWidth, realHeight);
        if (this.clearview) this.clearview.resize(realWidth, realHeight);
        if (this.illustrativeRaymarcher) this.illustrativeRaymarcher.resize(realWidth, realHeight);
    }
}
