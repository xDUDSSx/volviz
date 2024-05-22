precision highp float;

varying vec3 aPos;

uniform vec2 u_resolution;

uniform int u_mode;

#include <raymarcher.chunk.frag>

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
        pos += rayDir * stepSize;
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
