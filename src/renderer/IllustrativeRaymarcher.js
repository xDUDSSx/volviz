import * as THREE from "three";

import "./Raymarcher.js";
import {resolveInclude} from "~/utils.js";

import shader_chunk_raymarcher_frag from "./shaders/chunks/raymarcher.chunk.frag";
import basicVertexShader from "./shaders/basic.vert";
import illustrativeRaymarchShader from "./shaders/raymarcher-illustrative.frag";

export default class IllustrativeRaymarcher {
    raymarcher;
    cube;

    illustrativeMaterial;

    /**
     * @param {Raymarcher} raymarcher 
     * @param {THREE.Vector2} resolution 
     * @param {THREE.BufferGeometry} cube
     */
    constructor(raymarcher, resolution, box) {
        this.raymarcher = raymarcher;

        this.illustrativeMaterial = new THREE.ShaderMaterial({
            name: "Illustrative Shader",
            uniforms: {
                u_mode: { value: 0 },
                u_ks: {value: 0.},
                u_kt: {value: 0.},
                u_wGrad: {value: 0.},
                u_wSil: {value: 0.},
                u_wLight: {value: 0.}
            },
            side: THREE.BackSide,
            vertexShader: basicVertexShader,
            fragmentShader: illustrativeRaymarchShader,
            transparent: true
        });

        this.illustrativeMaterial.onBeforeCompile = (shader) => {
            shader.fragmentShader = resolveInclude(shader.fragmentShader, "raymarcher.chunk.frag", shader_chunk_raymarcher_frag);
        };
        this.raymarcher.addRaymarcherUniforms(this.illustrativeMaterial.uniforms, resolution);

        this.cube = new THREE.Mesh(box, this.illustrativeMaterial);
    }

    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.PerspectiveCamera} camera
     */
    render(renderer, camera) {
        renderer.setRenderTarget(null);
        renderer.render(this.cube, camera);
    }

    update(settings) {
        this.raymarcher.updateRaymarcherUniforms(this.illustrativeMaterial, settings);
        this.illustrativeMaterial.uniforms.u_mode.value = settings.mode;
        this.illustrativeMaterial.uniforms.u_ks.value = settings.ks;
        this.illustrativeMaterial.uniforms.u_kt.value = settings.kt;
        this.illustrativeMaterial.uniforms.u_wGrad.value = settings.wgrad;
        this.illustrativeMaterial.uniforms.u_wSil.value = settings.wsil;
        this.illustrativeMaterial.uniforms.u_wLight.value = settings.wlight;
    }

    resize(realWidth, realHeight) {
        this.illustrativeMaterial.uniforms.u_resolution.value = new THREE.Vector2(realWidth, realHeight);

    }
}