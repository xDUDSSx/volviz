import * as THREE from "three";
// import Land from "./Land/Land.js";
// import Flower from "./Flower/Flower.js";
import BasicLights from "./Lights.js";

const positionVertexShader = 
`
varying vec3 aPos;

void main() {
  vec4 mPosition = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * mPosition;
  aPos = mPosition.xyz;
}
`;

const positionFragmentShader = 
`
varying vec3 aPos;

void main() {
  gl_FragColor = vec4(aPos, 1.0);
}
`;

const raymarchFragmentShader = 
`
varying vec3 aPos;

uniform vec2 u_resolution;
uniform sampler2D u_positionTexture;

float map(float value, float min1, float max1, float min2, float max2) {
	return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

vec3 map(vec3 value, vec3 min1, vec3 max1, vec3 min2, vec3 max2) {
  return vec3(map(value.x, min1.x, max1.x, min2.x, max2.x),
              map(value.y, min1.y, max1.y, min2.y, max2.y),
              map(value.z, min1.z, max1.z, min2.z, max2.z));
}

vec3 map(vec3 value, float min1, float max1, float min2, float max2) {
  return map(value, vec3(min1), vec3(max1), vec3(min2), vec3(max2));
}

void main() {
  vec2 coords = gl_FragCoord.xy / u_resolution.xy;

  // World position of the cube front side, is the current position of this fragment
  vec3 frontPos = aPos.xyz;

  // World position of the cube back side, is fetched from a previously rendered texture
  vec4 backPosFetch = texelFetch(u_positionTexture, ivec2(gl_FragCoord.xy), 0);
  // Clear color of the back position texture has alpha of 0 so we can check for that.
  vec3 backPos = backPosFetch.a <= 0.0 ? frontPos : backPosFetch.xyz;

  vec3 raySpan = backPos - frontPos;
  float raySpanLen = length(raySpan);
  vec3 rayDir = normalize(raySpan);

  int stepCount = 50;
  float longestSpan = length(vec3(2., 2., 2.));
  float stepSize = longestSpan / float(stepCount);

  vec4 stepColor = vec4(vec3(0), 1.0/float(stepCount));
  vec4 accumColor = vec4(0);

  vec3 pos = frontPos;
  float step = 0.;
  
  for (int i = 0; i < stepCount; i++) {
    accumColor += stepColor;
    if (step > raySpanLen) {
      break;
    }
    step += stepSize;
    pos += rayDir * stepSize;
  }

  if (coords.x < 0.5) {
    gl_FragColor = accumColor; // Raymarched result
  } else {
    gl_FragColor = vec4(vec3(0), raySpanLen / longestSpan); // Perfect analytical result
  }  

  // Debug rendering of front and back positions
  // gl_FragColor = vec4(map(frontPos, -1., 1., 0., 1.), 1.0);
  // gl_FragColor = vec4(map(backPos, -1., 1., 0., 1.), 1.0);
}
`;

export default class VolumeScene {
    /**
     * @param {THREE.WebGLRenderer} renderer
     */
    constructor(renderer) {
        this.scene = new THREE.Scene();
        this.cubeScene = new THREE.Scene();
        
        this.renderer = renderer;
        let rendererSize = new THREE.Vector2();
        this.renderer.getSize(rendererSize);

        // const land = new Land();
        // const flower = new Flower();

        const lights = new BasicLights();
        this.scene.add(lights);

        //const material = new THREE.MeshStandardMaterial({color: 0xcc00cc});

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
        // this.positionTexture = new THREE.WebGLRenderTarget(rendererSize.x, rendererSize.y);

        this.raymarchingMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_resolution: { value: new THREE.Vector2(1, 1) },
                u_positionTexture: { value: this.positionTexture.texture } 
            },
            vertexShader: positionVertexShader,
            fragmentShader: raymarchFragmentShader,
            transparent: true
        });
        
        const boxWidth = 2;
        const boxHeight = 2;
        const boxDepth = 2;
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
        
        // const cube = new THREE.Mesh(geometry, this.raymarchingMaterial);
        let backCube = new THREE.Mesh(geometry, this.positionShader);
        backCube.position.set(0, 0, 0);
        this.cubeScene.add(backCube);

        let cube = new THREE.Mesh(geometry, this.raymarchingMaterial);
        this.scene.add(cube);

        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);
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

    }

    resize(width, height, pixelRatio = window.devicePixelRatio) {
        // console.log("Resize event: ", width, height, " Pixel ratio: ", pixelRatio);
        let realWidth = width * pixelRatio, realHeight = height * pixelRatio;
        this.positionTexture.setSize(realWidth, realHeight);
        this.raymarchingMaterial.uniforms.u_resolution.value = new THREE.Vector2(realWidth, realHeight);
    }
}
