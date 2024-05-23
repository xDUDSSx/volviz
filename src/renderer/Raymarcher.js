import * as THREE from "three";

import {resolveInclude} from "~/utils.js";

import shader_chunk_raymarcher_frag from "./shaders/chunks/raymarcher.chunk.frag";
import shader_isosurface_vert from "./shaders/isosurface.vert";
import shader_isosurface_frag from "./shaders/isosurface.frag";

import shader_basic_vert from "./shaders/basic.vert";

import shader_raymarcher_position_frag from "./shaders/raymarcher-position.frag";
import shader_raymarcher_basic__frag from "./shaders/raymarcher-basic.frag";

export default class Raymarcher {
    volumeTexture;
    gradientTexture;

    positionTexture;
    positionMaterial;

    isosurfaceShader;

    raymarcherShader;

    volumeCube;
    isosurfaceCube;

    /**
     * @param {THREE.Vector2} resolution 
     */
    constructor(resolution) {
        this.#createRaymarcherShader(resolution);
        this.#createIsosurfaceShader(resolution);
    }

    #createRaymarcherShader(resolution) {
        this.positionMaterial = new THREE.ShaderMaterial({
            vertexShader: shader_basic_vert,
            fragmentShader: shader_raymarcher_position_frag,
            uniforms: {
                u_resolution: { value: new THREE.Vector2(resolution.x, resolution.y) },
                u_projectionViewInverse: { value: new THREE.Matrix4() },
            },
            side: THREE.DoubleSide
        });

        this.positionTexture = new THREE.WebGLRenderTarget(resolution.x, resolution.y, {
            name: "Raymarcher Position Shader",
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            generateMipmaps: false,
        });

        this.raymarcherShader = new THREE.ShaderMaterial({
            name: "Raymarcher Basic Shader",
            vertexShader: shader_basic_vert,
            fragmentShader: shader_raymarcher_basic__frag,
            uniforms: {
                u_mode: { value: 0 },
            },
            transparent: true,
            side: THREE.BackSide
        });
        this.raymarcherShader.onBeforeCompile = (shader) => {
            shader.fragmentShader = resolveInclude(shader.fragmentShader, "raymarcher.chunk.frag", shader_chunk_raymarcher_frag);
        };

        this.addRaymarcherUniforms(this.raymarcherShader.uniforms, resolution);
    }

    setGradientCanvas(canvas)
    {
        this.gradientTexture = new THREE.CanvasTexture(canvas, THREE.UVMapping, THREE.MirroredRepeatWrapping, THREE.MirroredRepeatWrapping, THREE.LinearFilter, THREE.LinearMipmapLinearFilter, THREE.RGBAFormat);
    }

    setVolume(volumeTexture, settings) {
        // Create the cube objects for rendering the back faces
        if (this.volumeCube == undefined) {
            const boxWidth = 2;
            const boxHeight = 2;
            const boxDepth = 2;
            const box = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

            this.volumeCube = new THREE.Mesh(box, this.positionMaterial);
            this.volumeCube.position.set(0, 0, 0);

            this.isosurfaceCube = new THREE.Mesh(box, this.isosurfaceShader);
            this.isosurfaceCube.position.set(0, 0, 0);
        }
        
        this.volumeTexture = volumeTexture;

        this.updateRaymarcherUniforms(this.raymarcherShader, settings);
        this.updateRaymarcherUniforms(this.isosurfaceShader, settings);

        return this.volumeCube.geometry;
    }

    addRaymarcherUniforms(uniforms, resolution) {
        let raymarcherUniforms = {
            u_resolution: { value: new THREE.Vector2(resolution.x, resolution.y) },
            u_positionTexture: { value: this.positionTexture.texture },

            u_volumeTexture: { value: undefined }, // To be set later
            u_gradientTexture: { value: undefined },
            u_volumeMin: { value: 0 }, // To be set later
            u_volumeMax: { value: 0 }, // To be set later

            u_volumeSamples: { value: 50 },
            u_volumeInvertX: { value: false },
            u_volumeInvertY: { value: true },
            u_volumeInvertZ: { value: true },
            u_volumeFlipYZ: { value: true },
            u_volumeNoise: { value: 0.1 },
        };
        Object.assign(uniforms, raymarcherUniforms);
    }

    updateRaymarcherUniforms(shader, settings) {
        shader.uniforms.u_volumeSamples.value = settings.samples;
        shader.uniforms.u_volumeNoise.value = settings.noise;

        shader.uniforms.u_volumeTexture.value = this.volumeTexture;
        shader.uniforms.u_gradientTexture.value = this.gradientTexture;
        shader.uniforms.u_volumeMin.value = settings.volumeMin;
        shader.uniforms.u_volumeMax.value = settings.volumeMax;
    }

    createIsosurfaceRenderTarget(resolution) {
        let renderTarget = new THREE.WebGLRenderTarget(resolution.x, resolution.y, {
            count: 2,

            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            generateMipmaps: false,
        });

        renderTarget.textures[0].name = "position";
        renderTarget.textures[1].name = "normal";

        return renderTarget;
    }

    #createIsosurfaceShader(resolution) {
        this.isosurfaceShader = new THREE.RawShaderMaterial( {
            name: "Isosurface Shader",
            vertexShader: shader_isosurface_vert,
            fragmentShader: shader_isosurface_frag,
            uniforms: {
                u_isovalue: { value: 0.5 },
                u_normalSampleFactor: { value: 1.0 },
            },
            transparent: true,
            side: THREE.BackSide,
            glslVersion: THREE.GLSL3
        } );
        this.isosurfaceShader.onBeforeCompile = (shader) => {
            shader.fragmentShader = resolveInclude(shader.fragmentShader, "raymarcher.chunk.frag", shader_chunk_raymarcher_frag);
        };
        this.addRaymarcherUniforms(this.isosurfaceShader.uniforms, resolution);
    }

    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.PerspectiveCamera} camera
     */
    renderRaymarcherPositionCube(renderer, camera) {
        if (this.volumeCube == undefined)
            return;

        // Render positions of the front side of the volume cube
        
        // Pixels of the front faces of the cube are set to their world position.
        // When the cameras near plane intersects the cube,
        // the clipped region is filled by calculated near plane world positions when rendering backfaces of the cube. 

        let viewMatrixInverse = new THREE.Matrix4().copy(camera.matrixWorld);
        let projectionMatrixInverse = new THREE.Matrix4().copy(camera.projectionMatrixInverse);
        let clipToWorldMatrix = viewMatrixInverse.multiply(projectionMatrixInverse);
        this.positionMaterial.uniforms.u_projectionViewInverse.value = clipToWorldMatrix;
        
        // this.volumeCube.material = this.positionMaterial;

        renderer.setRenderTarget(this.positionTexture);
        renderer.setClearAlpha(0); // Set clear alpha to 0 to avoid artefacts in the raymarcher later
        renderer.clear();
        renderer.render(this.volumeCube, camera);
    }

    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.PerspectiveCamera} camera
     * @param {THREE.WebGLRenderTarget} target
     */
    renderIsosurface(renderer, camera, target, isovalue) {
        if (this.isosurfaceCube == undefined)
            return;

        this.isosurfaceShader.uniforms.u_isovalue.value = isovalue;
        this.isosurfaceShader.uniformsNeedUpdate = true;

        renderer.setRenderTarget(target);
        renderer.setClearAlpha(0);
        renderer.clear();
        renderer.render(this.isosurfaceCube, camera);
    }

    update(settings) {
        this.raymarcherShader.uniforms.u_mode.value = settings.mode;
        
        this.updateRaymarcherUniforms(this.raymarcherShader, settings);
        this.updateRaymarcherUniforms(this.isosurfaceShader, settings);

        this.isosurfaceShader.uniforms.u_normalSampleFactor.value = settings.normalSampleFactor;
    }

    resize(realWidth, realHeight) {
        this.positionTexture.setSize(realWidth, realHeight);
        
        this.raymarcherShader.uniforms.u_resolution.value = new THREE.Vector2(realWidth, realHeight);
        this.positionMaterial.uniforms.u_resolution.value = new THREE.Vector2(realWidth, realHeight);
        this.isosurfaceShader.uniforms.u_resolution.value = new THREE.Vector2(realWidth, realHeight);
    }
}