
precision highp float;
precision mediump sampler3D;

varying vec3 aPos;

uniform vec2 u_resolution;
uniform sampler2D u_positionTexture;

uniform int u_mode;

uniform float u_ks;
uniform float u_kt;
uniform float u_wGrad;
uniform float u_wSil;
uniform float u_wLight;

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
  value = clamp(value, min1, max1);
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

vec3 getColorAt(float value, vec3 color1, vec3 color2)
{
  return mix(color1, color2, value);
}

float getOpacityAt(float value, float opacity1, float opacity2)
{
  return mix(opacity1, opacity2, value);
}

struct GradientApproximation
{
  vec3 normal;
  vec3 gradient;
  float magnitude;
};

GradientApproximation approximateGradient(vec3 pos, float stepSize, vec3 viewRay)
{
  GradientApproximation ga;
  vec3 xStep = vec3(stepSize*0.5, 0., 0.);
  vec3 yStep = vec3(0., stepSize*0.5, 0.);
  vec3 zStep = vec3(0., 0., stepSize*0.5);
  
  ga.gradient.x = sampleVolume(pos + xStep) - sampleVolume(pos - xStep);
  ga.gradient.y = sampleVolume(pos + yStep) - sampleVolume(pos - yStep);
  ga.gradient.z = sampleVolume(pos + zStep) - sampleVolume(pos - zStep);
  
  ga.magnitude = length(ga.gradient) + 0.00001;
  ga.normal = ga.gradient / ga.magnitude;

  float Nselect = float(dot(ga.normal, viewRay) > 0.0);
  ga.normal *= (2.0 * Nselect - 1.0);

  return ga;
}

float shadingIntensity(vec3 normal, vec3 lightDir, vec3 viewDir, float diffuse, float specular, float shininess)
{
  float diff = clamp(dot(normal, lightDir), 0.0, 1.0);
  vec3 halfVector = normalize(normal + viewDir);
  float spec = pow(max(dot(halfVector, normal), 0.0), shininess);

  return diff + spec;
}

float computeAlphaForContextPreserveStep(float magnitude, float shadingIntensity, float opacity, float accumulatedOpacity, float normalizedDistance)
{
  float gradPower = pow(u_kt * shadingIntensity * (1. - normalizedDistance) * (1. - accumulatedOpacity), u_ks);
  return opacity * pow(magnitude, gradPower);
}

const vec3 gStart = vec3(0., 0.2, 0.5);
const vec3 gEnd = vec3(1., 0., 0.);

const float oStart = 0.2;
const float oEnd = 0.8;

vec4 raymarchContextPreserve(vec3 rayDir, vec3 lightDir, vec3 startPos, float stepSize, int stepCount, float stopDist) {
  vec3 accumColor = vec3(0.0);
  float accumOpacity = 0.;

  vec3 pos = startPos;
  float step = 0.;

  for (int i = 0; i < stepCount; ++i) {
    if (step > stopDist) {
      break;
    }

    GradientApproximation ga = approximateGradient(pos, stepSize, rayDir);
    float sampleValue = sampleVolume(pos);
    float opacity = getOpacityAt(sampleValue, oStart, oEnd);
    vec3 color = getColorAt(sampleValue, gStart, gEnd);
    
    float normalizedDistance = step / stopDist;

    float shadingIntensity = shadingIntensity(ga.normal, lightDir, rayDir, 0.8, 0.4, 25.);
    float alpha = computeAlphaForContextPreserveStep(ga.magnitude, shadingIntensity, opacity, accumOpacity, normalizedDistance);
    float accumulationAlphaValue = alpha * (1. - accumOpacity);
    accumColor += color * accumulationAlphaValue;
    
    accumOpacity += accumulationAlphaValue;

    if (accumOpacity >= 1.0) {
      break;
    }

    step += stepSize;
    pos += rayDir * stepSize;
  }

  return vec4(accumColor, accumOpacity);
}

float sillhouetteImportanceFunction(float magnitude, vec3 normal, vec3 viewRay)
{
  const float p = 1.7;
  const float s1 = 0.4;
  const float s2 = 1.0;
  return u_wSil * pow(magnitude, p) * smoothstep(s1, s2, 1. - abs(dot(viewRay, normal)));
}

float lightingImportanceFunction(float magnitude, vec3 normal, vec3 viewDir, vec3 lightDir)
{
  const float p1 = 50.;
  const float p2 = 5.;
  const float p3 = 30.;
  vec3 halfVector = normalize(normal + viewDir);
  float specular = pow(dot(normal, halfVector), p1);
  float diffuse = pow(dot(normal, lightDir), p2);
  float gradient = pow(1. - magnitude, p3);

  return u_wLight * (3.0 - specular - diffuse - gradient);
}

float importanceFunction(float value)
{
  return 0.8 * value;
}

float gradientImportanceFunction(float gradientMagnitude)
{
  return u_wGrad * gradientMagnitude;
}

float globalImportanceFunction(float weight, float magnitude, vec3 normal, vec3 viewDir, vec3 lightDir)
{
  if (weight < 0.00001) return 0.;
  
  float importance = 0.;
  importance += gradientImportanceFunction(magnitude);
  importance += sillhouetteImportanceFunction(magnitude, normal, viewDir);
  importance += lightingImportanceFunction(magnitude, normal, viewDir, lightDir);
  return importance * weight;
}

float visibilityFunction(float importance, float accumulatedImportance)
{
  return 1. - exp(accumulatedImportance - importance);
}

float modulationFactor(float importance, float accumulatedImportance, float opacity)
{
  if (importance <= accumulatedImportance) return 1.;
  float visibility = visibilityFunction(importance, accumulatedImportance);
  if (1. - opacity >= visibility) return 1.;

  return (1. - visibility) / opacity;
}

vec4 raymarchImportanceAware(vec3 rayDir, vec3 lightDir, vec3 startPos, float stepSize, int stepCount, float stopDist)
{
  vec3 accumColor = vec3(0.);
  float accumOpacity = 0.;
  float accumImportance = 0.;

  vec3 pos = startPos;
  float step = 0.;

  for (int i = 0; i < stepCount && step <= stopDist; ++i)
  {
    float sampleValue = sampleVolume(pos);
    float opacity = getOpacityAt(sampleValue, oStart, oEnd);
    vec3 color = getColorAt(sampleValue, gStart, gEnd);

    GradientApproximation ga = approximateGradient(pos, stepSize, rayDir);
    float importance = globalImportanceFunction(1., ga.magnitude, ga.normal, rayDir, lightDir);
    float modulation = modulationFactor(importance, accumImportance, accumOpacity);
    accumImportance = max(accumImportance, log(opacity + (1. - opacity) * exp(accumImportance - importance)) + importance);

    vec3 primeAccumColor = modulation * accumColor + (1. - modulation * accumOpacity) * color;
    float primeAccumOpacity = modulation * accumOpacity * (1. - opacity) + opacity;
    accumOpacity = accumOpacity * (1. - opacity) + opacity;

    accumColor = vec3(0.);
    if (primeAccumOpacity > 0.00001) accumColor = primeAccumColor * accumOpacity / primeAccumOpacity; 

    if (accumOpacity >= 1.0) break;

    step += stepSize;
    pos += rayDir * stepSize;
  }

  return vec4(accumColor, accumOpacity);
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

  // World position of the cube front side, is the current position of this fragment
  vec3 frontPos = aPos.xyz;

  // World position of the cube back side, is fetched from a previously rendered texture
  vec4 backPosFetch = texelFetch(u_positionTexture, ivec2(gl_FragCoord.xy), 0);
  // Clear color of the back position texture has alpha of 0 so we can check for that.
  vec3 backPos = backPosFetch.a <= 0.0 ? frontPos : backPosFetch.xyz;

  vec3 raySpan = backPos - frontPos;
  float raySpanLen = length(raySpan);
  vec3 rayDir = normalize(raySpan);
  vec3 lightDir = normalize(vec3(-1., -1., -1.) - (frontPos + vec3(2.f, 2.f, 2.f)));
  int stepCount = u_volumeSamples;
  float longestSpan = length(vec3(2., 2., 2.));
  float stepSize = longestSpan / float(stepCount);

  // Randomly offset raydir to "dither" aliasing
  // https://www.marcusbannerman.co.uk/articles/VolumeRendering.html
  float random = fract(sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453);
  stepSize += u_volumeNoise * stepSize * random;

  vec4 color;
  
  switch (u_mode)
  {
    case 0:
      color = raymarchAccumulate(rayDir, frontPos, stepSize, stepCount, raySpanLen);
      break;
    case 1:
      color = raymarchAverage(rayDir, frontPos, stepSize, stepCount, raySpanLen);
      break;
    case 2:
      color = raymarchImportanceAware(rayDir, lightDir, frontPos, stepSize, stepCount, raySpanLen);
      break;
    case 3:
      color = raymarchContextPreserve(rayDir, lightDir, frontPos, stepSize, stepCount, raySpanLen);
      break;
  }

  gl_FragColor = color; // Raymarched result

  // Debug rendering of front and back positions
  // gl_FragColor = vec4(map(pos, -1., 1., 0., 1.), 1.0);
  // gl_FragColor = vec4(map(backPos, -1., 1., 0., 1.), 1.0);
}
