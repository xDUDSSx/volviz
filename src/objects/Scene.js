import * as THREE from "three";
// import Land from "./Land/Land.js";
// import Flower from "./Flower/Flower.js";
import BasicLights from "./Lights.js";
import Loader from "~/Loader.js";

const positionVertexShader = `
varying vec3 aPos;

void main() {
  vec4 mPosition = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * mPosition;
  aPos = mPosition.xyz;
}
`;

const positionFragmentShader = `
varying vec3 aPos;

void main() {
  gl_FragColor = vec4(aPos, 1.0);
}
`;

const raymarchFragmentShader = `
precision highp float;
precision mediump sampler3D;

varying vec3 aPos;

uniform vec2 u_resolution;
uniform sampler2D u_positionTexture;
uniform sampler3D u_volumeTexture;

//	Classic Perlin 3D Noise 
//	by Stefan Gustavson
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

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

  // Randomly offset raydir to "dither" aliasing
  // https://www.marcusbannerman.co.uk/articles/VolumeRendering.html
  float random = fract(sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453);
  stepSize += 0.1 * stepSize * random;

  vec4 stepColor = vec4(vec3(0), 1.0/float(stepCount));
  vec4 accumColor = vec4(0);

  vec3 pos = frontPos;
  float step = 0.;
  
  for (int i = 0; i < stepCount; i++) {
    float density = cnoise(pos);
    accumColor += vec4(vec3(0), density);
    if (step > raySpanLen) {
      break;
    }
    step += stepSize;
    pos += rayDir * stepSize ;
  }

  if (coords.x < 0.5) {
    gl_FragColor = accumColor; // Raymarched result
  } else {
    gl_FragColor = vec4(vec3(0), raySpanLen / longestSpan); // Perfect analytical result
  }

  // float density = texture(u_volumeTexture, pos).r * 600000.0;
  
  gl_FragColor = vec4(vec3(texture(u_volumeTexture, vec3(coords, 0.5)).r * 60000.0), 1.0);

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

        this.raymarchingMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_resolution: { value: new THREE.Vector2(1, 1) },
                u_positionTexture: { value: this.positionTexture.texture },
                u_volumeTexture: { value: undefined } // To be loaded later
            },
            vertexShader: positionVertexShader,
            fragmentShader: raymarchFragmentShader,
            transparent: true
        });

        // Load 3D data
        // let texture = Loader.loadStuff();
        Loader.loadCTHeadTexture().then((volumeTexture) => {
            const boxWidth = 2;
            const boxHeight = 2;
            const boxDepth = 2;
            const box = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

            let backCube = new THREE.Mesh(box, this.positionShader);
            backCube.position.set(0, 0, 0);
            this.cubeScene.add(backCube);

            // Assign the loaded volume texture
            this.raymarchingMaterial.uniforms.u_volumeTexture = volumeTexture;

            let cube = new THREE.Mesh(box, this.raymarchingMaterial);
            this.scene.add(cube);

            // let plane = new THREE.PlaneGeometry(1, 1);
            // let planeMesh = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({
            //     map: texture
            // }));
            // this.scene.add(planeMesh);
        });

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

    update() {}

    resize(width, height, pixelRatio = window.devicePixelRatio) {
        // console.log("Resize event: ", width, height, " Pixel ratio: ", pixelRatio);
        let realWidth = width * pixelRatio;
        let realHeight = height * pixelRatio;
        this.positionTexture.setSize(realWidth, realHeight);
        this.raymarchingMaterial.uniforms.u_resolution.value = new THREE.Vector2(realWidth, realHeight);
    }
}
