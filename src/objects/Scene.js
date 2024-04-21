import { Group } from "three";
import * as THREE from "three";
// import Land from "./Land/Land.js";
// import Flower from "./Flower/Flower.js";
import BasicLights from "./Lights.js";

export default class SeedScene extends Group {
    constructor(renderer) {
        super();
        
        this.renderer = renderer;

        // const land = new Land();
        // const flower = new Flower();

        const lights = new BasicLights();
        this.add(lights);

        const boxWidth = 1;
        const boxHeight = 1;
        const boxDepth = 1;
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
        
        //const material = new THREE.MeshStandardMaterial({color: 0xcc00cc});

        this.raymarchingMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_resolution: new THREE.Vector2(1, 1)
            },
            vertexShader: `
              varying vec2 vUv;
              void main() {
        
                vec4 mvPosition = vec4( position, 1.0 );
                mvPosition = modelViewMatrix * mvPosition;
                gl_Position = projectionMatrix * mvPosition;
        
                vUv = uv;
              }
            `,
            fragmentShader: `
              varying vec2 vUv;

              uniform vec2 u_resolution;
        
              void main() {
                // get [-1, 1] normalized device coordinates
                // vec2 ndc = 2.0 * vUv - vec2( 1.0 );
                // gl_FragColor = vec4( ndc, 0.2, 1.0 );

                vec2 coords = gl_FragCoord.xy / u_resolution.xy;
                
                gl_FragColor = vec4( coords, 0.2, 1.0 );
              }
            `
        });

        const cube = new THREE.Mesh(geometry, this.raymarchingMaterial);
        this.add(cube);
    }

    update(timeStamp) {
        // this.rotation.y = timeStamp / 10000;    
    }

    resize(width, height) {
        this.raymarchingMaterial.uniforms.u_resolution.value = new THREE.Vector2(width, height);
    }
}