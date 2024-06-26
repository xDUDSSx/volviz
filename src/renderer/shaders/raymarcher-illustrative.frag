precision highp float;
precision mediump sampler3D;

varying vec3 aPos;

uniform vec2 u_resolution;

uniform int u_mode;

#include <raymarcher.chunk.frag>

uniform float u_ks;
uniform float u_kt;
uniform float u_wGrad;
uniform float u_wSil;
uniform float u_wLight;

struct GradientApproximation {
  vec3 normal;
  vec3 gradient;
  float magnitude;
};

GradientApproximation approximateGradient(vec3 pos, float stepSize, vec3 viewRay) {
  GradientApproximation ga;
  vec3 xStep = vec3(stepSize * 0.5, 0., 0.);
  vec3 yStep = vec3(0., stepSize * 0.5, 0.);
  vec3 zStep = vec3(0., 0., stepSize * 0.5);

  ga.gradient.x = sampleVolume(pos - xStep) - sampleVolume(pos + xStep);
  ga.gradient.y = sampleVolume(pos - yStep) - sampleVolume(pos + yStep);
  ga.gradient.z = sampleVolume(pos - zStep) - sampleVolume(pos + zStep);

  ga.magnitude = length(ga.gradient) + 0.00001;
  ga.normal = ga.gradient / ga.magnitude;

  float Nselect = float(dot(ga.normal, viewRay) > 0.0);
  ga.normal *= (2.0 * Nselect - 1.0);

  return ga;
}

float shadingIntensity(vec3 normal, vec3 lightDir, vec3 viewDir, float diffuse, float specular, float shininess) {
  float diff = clamp(dot(normal, -lightDir), 0.0, 1.0) * diffuse;
  vec3 halfVector = normalize(-lightDir + viewDir);
  float spec = pow(max(dot(halfVector, normal), 0.0), shininess) * specular;

  return diff + spec;
}

float computeAlphaForContextPreserveStep(float magnitude, float shadingIntensity, float opacity, float accumulatedOpacity, float normalizedDistance) {
  float gradPower = pow(u_kt * shadingIntensity * (1. - normalizedDistance) * (1. - accumulatedOpacity), u_ks);
  return opacity * pow(magnitude, gradPower);
}

const vec3 gStart = vec3(0., 0.2, 0.5);
const vec3 gEnd = vec3(1., 0., 0.);

const float oStart = 0.2;
const float oEnd = 0.8;

vec4 raymarchContextPreserve(vec3 rayDir, vec3 startPos, float stepSize, int stepCount, float stopDist) {
  vec3 accumColor = vec3(0.0);
  float accumOpacity = 0.;

  vec3 pos = startPos;
  float step = 0.;

  vec3 viewRay = -rayDir;

  for(int i = 0; i < stepCount; ++i) {
    if(step > stopDist) {
      break;
    }

    GradientApproximation ga = approximateGradient(pos, stepSize, viewRay);
    float sampleValue = sampleVolume(pos);
    vec4 transfer = getColorAt(sampleValue);
    float opacity = transfer.a;
    vec3 color = transfer.rgb;

    float normalizedDistance = step / stopDist;

    float shadingIntensity = shadingIntensity(ga.normal, rayDir, viewRay, 0.8, 0.4, 25.);
    float alpha = computeAlphaForContextPreserveStep(ga.magnitude, shadingIntensity, opacity, accumOpacity, normalizedDistance);
    float accumulationAlphaValue = alpha * (1. - accumOpacity);
    accumColor += color * accumulationAlphaValue;

    accumOpacity += accumulationAlphaValue;

    if(accumOpacity >= 1.0) {
      break;
    }

    step += stepSize;
    pos += rayDir * stepSize;
  }

  return vec4(accumColor, accumOpacity);
}

float sillhouetteImportanceFunction(float magnitude, vec3 normal, vec3 viewRay) {
  const float p = 1.7;
  const float s1 = 0.4;
  const float s2 = 1.0;
  return u_wSil * pow(magnitude, p) * smoothstep(s1, s2, 1. - abs(dot(viewRay, normal)));
}

float lightingImportanceFunction(float magnitude, vec3 normal, vec3 viewDir, vec3 lightDir) {
  const float p1 = 50.;
  const float p2 = 5.;
  const float p3 = 30.;
  vec3 halfVector = normalize(viewDir - lightDir);
  float specular = pow(max(dot(normal, halfVector), 0.), p1);
  float diffuse = pow(max(dot(normal, -lightDir), 0.), p2);
  float gradient = pow(1. - magnitude, p3);

  return u_wLight * (3.0 - specular - diffuse - gradient);
}

float importanceFunction(float value) {
  return 0.8 * value;
}

float gradientImportanceFunction(float gradientMagnitude) {
  return u_wGrad * gradientMagnitude;
}

float globalImportanceFunction(float weight, float magnitude, vec3 normal, vec3 viewDir, vec3 lightDir) {
  if(weight < 0.00001)
    return 0.;

  float importance = 0.;
  importance += gradientImportanceFunction(magnitude);
  importance += sillhouetteImportanceFunction(magnitude, normal, viewDir);
  importance += lightingImportanceFunction(magnitude, normal, viewDir, lightDir);
  return importance * weight;
}

float visibilityFunction(float importance, float accumulatedImportance) {
  return 1. - exp(accumulatedImportance - importance);
}

float modulationFactor(float importance, float accumulatedImportance, float opacity) {
  if(importance <= accumulatedImportance)
    return 1.;
  float visibility = visibilityFunction(importance, accumulatedImportance);
  if(1. - opacity > visibility)
    return 1.;
  opacity = max(opacity, 0.00001);
  return clamp((1. - visibility) / opacity, 0., 1.);
}

vec4 raymarchImportanceAware(vec3 rayDir, vec3 startPos, float stepSize, int stepCount, float stopDist) {
  vec3 accumColor = vec3(0.);
  float accumOpacity = 0.;
  float accumImportance = 0.;

  vec3 viewRay = -rayDir;
  vec3 pos = startPos;
  float step = 0.;

  for(int i = 0; i < stepCount && step <= stopDist; ++i) {
    float sampleValue = sampleVolume(pos);
    vec4 transfer = getColorAt(sampleValue);
    float opacity = transfer.a;
    vec3 color = transfer.rgb;

    GradientApproximation ga = approximateGradient(pos, stepSize, viewRay);
    float importance = globalImportanceFunction(1., ga.magnitude, ga.normal, viewRay, rayDir);
    float modulation = modulationFactor(importance, accumImportance, accumOpacity);
    accumImportance = max(accumImportance, log(opacity + (1. - opacity) * exp(accumImportance - importance)) + importance);

    vec3 primeAccumColor = modulation * accumColor + (1. - modulation * accumOpacity) * color;
    float primeAccumOpacity = modulation * accumOpacity * (1. - opacity) + opacity;
    accumOpacity = accumOpacity * (1. - opacity) + opacity;

    accumColor = vec3(0.);
    if(primeAccumOpacity > 0.00001)
      accumColor = primeAccumColor * accumOpacity / primeAccumOpacity;

    //if(accumOpacity >= 1.0)
    //  break;

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

  for(int i = 0; i < stepCount; i++) {
    float density = sampleVolume(pos);
    accumColor += stepColor * density;
    if(step > stopDist) {
      break;
    }
    if(accumColor.a >= 1.0) {
      break;
    }
    step += stepSize;
    pos += rayDir * stepSize;
  }

  return accumColor;
}

vec4 raymarchAverage(vec3 rayDir, vec3 startPos, float stepSize, int stepCount, float stopDist) {
  vec4 accumColor = vec4(0);

  float densitySum = 0.;

  vec3 pos = startPos;
  float step = 0.;

  for(int i = 0; i < stepCount; i++) {
    float density = sampleVolume(pos);
    densitySum += density;
    if(step > stopDist) {
      break;
    }
    step += stepSize;
    pos += rayDir * stepSize;
  }

  return vec4(vec3(densitySum / float(stepCount)), 1.0) * 2.0;
}

void main() {
  vec2 coords = gl_FragCoord.xy / u_resolution.xy;

  vec3 rayDir;
  vec3 frontPos;
  float stepSize;
  int stepCount;
  float raySpanLen;

  setupRaymarcher(coords, rayDir, frontPos, stepSize, stepCount, raySpanLen);

  //vec3 lightDir = normalize(vec3(-1., -1., -1.) - (frontPos + vec3(2., 2., 2.)));
  vec4 color;

  switch(u_mode) {
    case 0:
      color = raymarchAccumulate(rayDir, frontPos, stepSize, stepCount, raySpanLen);
      break;
    case 1:
      color = raymarchAverage(rayDir, frontPos, stepSize, stepCount, raySpanLen);
      break;
    case 2:
      color = raymarchImportanceAware(rayDir, frontPos, stepSize, stepCount, raySpanLen);
      break;
    case 3:
      color = raymarchContextPreserve(rayDir, frontPos, stepSize, stepCount, raySpanLen);
      break;
  }

  gl_FragColor = color; // Raymarched result

  // Debug rendering of front and back positions
  // gl_FragColor = vec4(map(pos, -1., 1., 0., 1.), 1.0);
  // gl_FragColor = vec4(map(backPos, -1., 1., 0., 1.), 1.0);
}
