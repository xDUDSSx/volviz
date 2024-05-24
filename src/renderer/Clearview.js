import * as THREE from "three";

// import {resolveInclude} from "~/utils.js";

// import shader_chunk_raymarcher_frag from "./shaders/chunks/raymarcher.chunk.frag";
import shader_clearview_frag from "./shaders/clearview.frag";
import shader_basic_vert from "./shaders/basic.vert";
import "./Raymarcher.js";

export default class Clearview {
    raymarcher;
    cube;

    isovalue1;
    isovalue2;

    isosurface1Target;
    isosurface2Target;

    clearviewShader;

    /**
     * @param {Raymarcher} raymarcher 
     * @param {THREE.Vector2} resolution 
     * @param {THREE.BufferGeometry} cube
     */
    constructor(raymarcher, resolution, box, settings) {
        this.raymarcher = raymarcher;

        this.isosurface1Target = this.raymarcher.createIsosurfaceRenderTarget(resolution);
        this.isosurface2Target = this.raymarcher.createIsosurfaceRenderTarget(resolution);

        this.clearviewShader = new THREE.ShaderMaterial( {
            name: "Clearview Shader",
            vertexShader: shader_basic_vert,
            fragmentShader: shader_clearview_frag,
            uniforms: {
                u_resolution: { value: new THREE.Vector2(resolution.x, resolution.y) },
                u_focusPoint: { value: settings.controlPointLocation },
                u_focusArea: { value: settings.focusArea },
                u_focusAreaSharpness: { value: settings.focusAreaSharpness },
                u_importanceMethod: { value: settings.importanceMethod },
                u_importanceStrength: { value: 1.0 },
                u_worldSpaceLight: { value: false },
                u_color1: { value: settings.isoColor1 },
                u_color2: { value: settings.isoColor2 },
                u_iso1PosTex: { value: this.isosurface1Target.textures[0] },
                u_iso1NormalTex: { value: this.isosurface1Target.textures[1] },
                u_iso2PosTex: { value: this.isosurface2Target.textures[0] },
                u_iso2NormalTex: { value: this.isosurface2Target.textures[1] },
            },
            transparent: true,
            side: THREE.BackSide,
        } );
        // this.clearviewShader.onBeforeCompile = (shader) => {
        //     shader.fragmentShader = resolveInclude(shader.fragmentShader, "raymarcher.chunk.frag", shader_chunk_raymarcher_frag);
        // };
        // this.addRaymarcherUniforms(this.isosurfaceShader.uniforms, resolution);

        this.cube = new THREE.Mesh(box, this.clearviewShader);

        this.update(settings);
    }

    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.PerspectiveCamera} camera
     */
    render(renderer, camera) {
        this.raymarcher.renderIsosurface(renderer, camera, this.isosurface1Target, this.isovalue1);
        this.raymarcher.renderIsosurface(renderer, camera, this.isosurface2Target, this.isovalue2);

        renderer.setRenderTarget(null);
        renderer.render(this.cube, camera);
    }

    update(settings) {
        this.isovalue1 = settings.isovalue1;
        this.isovalue2 = settings.isovalue2;

        this.clearviewShader.uniforms.u_focusPoint.value = settings.controlPointLocation;
        this.clearviewShader.uniforms.u_focusArea.value = settings.focusArea;
        this.clearviewShader.uniforms.u_focusAreaSharpness.value = settings.focusAreaSharpness;
        this.clearviewShader.uniforms.u_importanceMethod.value = settings.importanceMethod;
        if (settings.importanceMethod == 0) {
            this.clearviewShader.uniforms.u_importanceStrength.value = settings.distanceMultiplier;
        } else if (settings.importanceMethod == 3) {
            this.clearviewShader.uniforms.u_importanceStrength.value = settings.curvatureMultiplier;
        }
        this.clearviewShader.uniforms.u_worldSpaceLight.value = settings.worldSpaceLighting;
        this.clearviewShader.uniforms.u_color1.value = settings.isoColor1;
        this.clearviewShader.uniforms.u_color2.value = settings.isoColor2;

        // this.updateRaymarcherUniforms(this.isosurfaceShader, settings);
    }

    resize(realWidth, realHeight) {
        this.isosurface1Target.setSize(realWidth, realHeight);
        this.isosurface2Target.setSize(realWidth, realHeight);

        this.clearviewShader.uniforms.u_resolution.value = new THREE.Vector2(realWidth, realHeight);
    }
}