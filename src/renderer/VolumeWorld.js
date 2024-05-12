import * as THREE from "three";
import BasicLights from "./objects/Lights.js";
import Loader from "./Loader.js";

import raymarchFragmentShader from "./shaders/raymarcher.frag";

import positionVertexShader from "./shaders/position.vert";
import positionFragmentShader from "./shaders/position.frag";

export default class VolumeWorld {
    settings;

    scene;
    cubeScene;

    /**
     * @param {THREE.WebGLRenderer} renderer
     */
    constructor(renderer, settings) {
        this.settings = settings;

        this.scene = new THREE.Scene();
        this.cubeScene = new THREE.Scene();
      
        this.renderer = renderer;
        let rendererSize = new THREE.Vector2();
        this.renderer.getSize(rendererSize);

        const lights = new BasicLights();
        this.scene.add(lights);

        this.positionShader = new THREE.ShaderMaterial({
            vertexShader: positionVertexShader,
            fragmentShader: positionFragmentShader,
            side: THREE.BackSide
        });

        this.positionTexture = new THREE.WebGLRenderTarget(rendererSize.x, rendererSize.y, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            generateMipmaps: false,
        });

        this.raymarchingMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_mode: { value: 0 },

                u_volumeSamples: { value: 50 },
                u_volumeInvertX: { value: false },
                u_volumeInvertY: { value: true },
                u_volumeInvertZ: { value: true },
                u_volumeFlipYZ: { value: true },
                u_volumeNoise: { value: 0.1 },

                u_resolution: { value: new THREE.Vector2(1, 1) },
                u_positionTexture: { value: this.positionTexture.texture },
                u_volumeTexture: { value: undefined }, // To be loaded later
                u_volumeMin: { value: 0 }, // To be set later
                u_volumeMax: { value: 0 }, // To be set later
            },
            vertexShader: positionVertexShader,
            fragmentShader: raymarchFragmentShader,
            transparent: true
        });

        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);
    }

    loadCTHead(ui) {
        let loadingCallback = (val) => {
            ui.loadingButton.title = Math.round(val * 100) + " %";
        };
        Loader.loadCTHeadTexture(loadingCallback).then((textureData) => {
            ui.loadingPane.hidden = true;
            
            const boxWidth = 2;
            const boxHeight = 2;
            const boxDepth = 2;
            const box = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
            
            // Create the cube object for rendering the backfaces
            let backCube = new THREE.Mesh(box, this.positionShader);
            backCube.position.set(0, 0, 0);
            this.cubeScene.add(backCube);
            
            let {texture: volumeTexture, dataMin, dataMax} = textureData;
            
            // Assign the loaded volume texture to the shader
            this.raymarchingMaterial.uniforms.u_volumeTexture.value = volumeTexture;
            this.raymarchingMaterial.uniforms.u_volumeMin.value = dataMin;
            this.raymarchingMaterial.uniforms.u_volumeMax.value = dataMax;
            
            // Create the cube object for rendering front faces using the raymarcher
            let cube = new THREE.Mesh(box, this.raymarchingMaterial);
            this.scene.add(cube);
        });
    }

    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.PerspectiveCamera} camera
     */
    render(renderer, camera) {
        // First pass render positions of the back side of the volume cube
        renderer.setRenderTarget(this.positionTexture);
        renderer.setClearAlpha(0); // Set clear alpha to 0 to avoid artefacts in the raymarcher later
        renderer.render(this.cubeScene, camera);

        // Second pass render the front side of the volume cube with the raymarching shader.
        renderer.setRenderTarget(null);
        renderer.setClearAlpha(1);
        renderer.render(this.scene, camera);
    }

    update() {
        this.raymarchingMaterial.uniforms.u_mode.value = this.settings.mode;
        this.raymarchingMaterial.uniforms.u_volumeSamples.value = this.settings.samples;
        this.raymarchingMaterial.uniforms.u_volumeNoise.value = this.settings.noise;
    }

    resize(width, height, pixelRatio = window.devicePixelRatio) {
        // console.log("Resize event: ", width, height, " Pixel ratio: ", pixelRatio);
        let realWidth = width * pixelRatio;
        let realHeight = height * pixelRatio;
        this.positionTexture.setSize(realWidth, realHeight);
        this.raymarchingMaterial.uniforms.u_resolution.value = new THREE.Vector2(realWidth, realHeight);
    }
}
