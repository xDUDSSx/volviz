
precision highp float;
precision mediump sampler3D;

varying vec3 aPos;

uniform vec2 u_resolution;
uniform sampler2D u_positionTexture;

uniform int u_mode;

uniform sampler3D u_volumeTexture;
uniform int u_volumeSamples;
uniform float u_volumeMin;
uniform float u_volumeMax;
uniform bool u_volumeInvertX;
uniform bool u_volumeInvertY;
uniform bool u_volumeInvertZ;
uniform bool u_volumeFlipYZ;
uniform float u_volumeNoise;

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

float sampleVolume(vec3 pos) {
  vec3 adjPos = map(pos, -1., 1., 0., 1.);
  // vec3 adjPos = pos;
  if (u_volumeInvertX)
    adjPos.x = 1.0 - adjPos.x;
  if (u_volumeInvertY)
    adjPos.y = 1.0 - adjPos.y;
  if (u_volumeInvertZ)
    adjPos.z = 1.0 - adjPos.z;
  if (u_volumeFlipYZ)
    adjPos = adjPos.xzy;
  
  float val = texture(u_volumeTexture, adjPos).r;
  float valNorm = map(val, u_volumeMin, u_volumeMax, 0., 1.);
  return valNorm;
}

vec4 raymarchAccumulate(vec3 rayDir, vec3 startPos, float stepSize, int stepCount, float stopDist) {
  vec4 stepColor = vec4(vec3(0), 0.16);
  vec4 accumColor = vec4(0);

  vec3 pos = startPos;
  float step = 0.;
  
  for (int i = 0; i < stepCount; i++) {
    float density = sampleVolume(pos);
    accumColor += stepColor * density;
    if (step > stopDist) {
      break;
    }
    if (accumColor.a >= 1.0) {
      break;
    }
    step += stepSize;
    pos += rayDir * stepSize ;
  }

  return accumColor;
}

vec4 raymarchAverage(vec3 rayDir, vec3 startPos, float stepSize, int stepCount, float stopDist) {
  vec4 accumColor = vec4(0);

  float densitySum = 0.;

  vec3 pos = startPos;
  float step = 0.;
  
  for (int i = 0; i < stepCount; i++) {
    float density = sampleVolume(pos);
    densitySum += density;
    if (step > stopDist) {
      break;
    }
    step += stepSize;
    pos += rayDir * stepSize ;
  }
  
  return vec4(vec3(densitySum / float(stepCount)), 1.0) * 2.0;
}

void main() {
  vec2 coords = gl_FragCoord.xy / u_resolution.xy;

  // World position of the cube back side. It's the current position of this fragment.
  vec3 backPos = aPos.xyz;

  // World position of the cube front side. It's fetched from a previously rendered texture.
  vec4 frontPosFetch = texelFetch(u_positionTexture, ivec2(gl_FragCoord.xy), 0);
  // Clear color of the front position texture has alpha of 0 so we can check for that.
  vec3 frontPos = frontPosFetch.a <= 0.0 ? backPos : frontPosFetch.xyz;

  vec3 raySpan = backPos - frontPos;
  float raySpanLen = length(raySpan);
  vec3 rayDir = normalize(raySpan);

  int stepCount = u_volumeSamples;
  float longestSpan = length(vec3(2., 2., 2.));
  float stepSize = longestSpan / float(stepCount);

  // Randomly offset raydir to "dither" aliasing
  // https://www.marcusbannerman.co.uk/articles/VolumeRendering.html
  float random = fract(sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453);
  stepSize += u_volumeNoise * stepSize * random;

  vec4 color;
  
  switch (u_mode) {
    case 0:
      color = raymarchAccumulate(rayDir, frontPos, stepSize, stepCount, raySpanLen);
      break;
    case 1:
      color = raymarchAverage(rayDir, frontPos, stepSize, stepCount, raySpanLen);
      break;
  }

  gl_FragColor = color; // Raymarched result

  // Debug rendering of front and back positions
  // gl_FragColor = vec4(map(pos, -1., 1., 0., 1.), 1.0);
  // gl_FragColor = vec4(map(backPos, -1., 1., 0., 1.), 1.0);
}
