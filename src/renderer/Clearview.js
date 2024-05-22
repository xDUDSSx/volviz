import * as THREE from "three";

// import {resolveInclude} from "~/utils.js";

// import shader_chunk_raymarcher_frag from "./shaders/chunks/raymarcher.chunk.frag";
import shader_clearview_frag from "./shaders/clearview.frag";
import shader_basic_vert from "./shaders/basic.vert";
import "./Raymarcher.js";

export default class Clearview {
    raymarcher;
    cube;

    isosurface1Target1;
    isosurface1Target2;

    clearviewShader;

    /**
     * @param {Raymarcher} raymarcher 
     * @param {THREE.Vector2} resolution 
     * @param {THREE.BufferGeometry} cube
     */
    constructor(raymarcher, resolution, box) {
        this.raymarcher = raymarcher;

        this.isosurface1Target1 = this.raymarcher.createIsosurfaceRenderTarget(resolution);
        this.isosurface1Target2 = this.raymarcher.createIsosurfaceRenderTarget(resolution);

        this.clearviewShader = new THREE.ShaderMaterial( {
            name: "Clearview Shader",
            vertexShader: shader_basic_vert,
            fragmentShader: shader_clearview_frag,
            uniforms: {
                u_resolution: { value: new THREE.Vector2(resolution.x, resolution.y) },
                u_worldSpaceLight: { value: false },
                u_iso1PositionTexture: { value: this.isosurface1Target1.textures[0] },
                u_iso1NormalTexture: { value: this.isosurface1Target1.textures[1] },
                // u_isovalue: { value: 0.5 },
                // u_normalSampleFactor: { value: 1.0 },
            },
            transparent: true,
            side: THREE.BackSide,
        } );
        // this.clearviewShader.onBeforeCompile = (shader) => {
        //     shader.fragmentShader = resolveInclude(shader.fragmentShader, "raymarcher.chunk.frag", shader_chunk_raymarcher_frag);
        // };
        // this.addRaymarcherUniforms(this.isosurfaceShader.uniforms, resolution);

        this.cube = new THREE.Mesh(box, this.clearviewShader);
    }

    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.PerspectiveCamera} camera
     */
    render(renderer, camera) {
        this.raymarcher.renderIsosurface(renderer, camera, this.isosurface1Target1);
        // this.raymarcher.renderIsosurface(renderer, camera, this.isosurface1Target2);

        renderer.setRenderTarget(null);
        renderer.setClearAlpha(1);
        renderer.render(this.cube, camera);
    }

    update(settings) {
        this.clearviewShader.uniforms.u_worldSpaceLight.value = settings.worldSpaceLighting;
        // this.updateRaymarcherUniforms(this.raymarcherShader, settings);
        // this.updateRaymarcherUniforms(this.isosurfaceShader, settings);
    }

    resize(realWidth, realHeight) {
        this.isosurface1Target1.setSize(realWidth, realHeight);
        this.isosurface1Target2.setSize(realWidth, realHeight);

        this.clearviewShader.uniforms.u_resolution.value = new THREE.Vector2(realWidth, realHeight);
    }
}