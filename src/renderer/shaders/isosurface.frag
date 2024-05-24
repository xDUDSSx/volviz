precision highp float;
precision highp int;

layout (location = 0) out vec4 oPosition;
layout (location = 1) out vec4 oNormal;

in vec3 aPos;

uniform vec2 u_resolution;

uniform float u_isovalue;
uniform float u_normalSampleFactor;

#include <raymarcher.chunk.frag>

struct Gradient {
    vec3 normal;
    vec3 gradient;
    float magnitude;
};

Gradient approximateGradient(vec3 pos, float stepSize, vec3 viewRay) {
    Gradient g;
    float step = u_normalSampleFactor * stepSize;
    vec3 xStep = vec3(step, 0., 0.);
    vec3 yStep = vec3(0., step, 0.);
    vec3 zStep = vec3(0., 0., step);

    g.gradient.x = sampleVolume(pos - xStep) - sampleVolume(pos + xStep);
    g.gradient.y = sampleVolume(pos - yStep) - sampleVolume(pos + yStep);
    g.gradient.z = sampleVolume(pos - zStep) - sampleVolume(pos + zStep);

    g.magnitude = length(g.gradient) + 0.01;
    g.normal = g.gradient / g.magnitude;

    float Nselect = float(dot(g.normal, -viewRay) > 0.0);
    g.normal *= (2.0 * Nselect - 1.0);

    return g;
}

struct IsosurfacePoint {
    vec4 position;
    vec4 normal;
};

IsosurfacePoint raymarchIsosurface(vec3 rayDir, vec3 startPos, float stepSize, int stepCount, float stopDist, float isoThreshold) {
    vec4 stepColor = vec4(vec3(0), 0.16);
    vec4 accumColor = vec4(0);

    vec3 pos = startPos;
    float step = 0.;

    IsosurfacePoint point;

    for (int i = 0; i < stepCount; i++) {
        float density = sampleVolume(pos);

        if (density > isoThreshold) {
            Gradient g = approximateGradient(pos, stepSize, rayDir);
            point.position = vec4(pos, 1.0);
            point.normal = vec4(g.normal, 1.0);
            return point;
        }

        if (step > stopDist) {
            break;
        }
        step += stepSize;
        pos += rayDir * stepSize;
    }

    point.position = vec4(0.0);
    point.normal = vec4(0.0);
    return point;
}

void main() {
    vec2 coords = gl_FragCoord.xy / u_resolution.xy;

    vec3 rayDir;
    vec3 frontPos;
    float stepSize;
    int stepCount;
    float raySpanLen;

    setupRaymarcher(coords, rayDir, frontPos, stepSize, stepCount, raySpanLen);

    IsosurfacePoint point = raymarchIsosurface(rayDir, frontPos, stepSize, stepCount, raySpanLen, u_isovalue);
    oPosition = point.position;
    oNormal = point.normal;
}