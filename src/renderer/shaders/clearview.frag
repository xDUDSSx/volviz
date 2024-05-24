precision highp float;

varying vec3 aPos;

uniform vec2 u_resolution;

#include <raymarcher.chunk.frag>

uniform vec3 u_focusPoint;
uniform float u_focusArea;
uniform float u_focusAreaSharpness;
uniform int u_importanceMethod;
uniform float u_importanceStrength;
uniform bool u_worldSpaceLight;

uniform vec3 u_color1;
uniform vec3 u_color2;

uniform sampler2D u_iso1PosTex;
uniform sampler2D u_iso1NormalTex;

uniform sampler2D u_iso2PosTex;
uniform sampler2D u_iso2NormalTex;

uniform float u_isovalue2;

struct Material {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float shininess;
};

float easeOutPower(float x, float power) {
    return 1.0 - pow(1.0 - x, power);
}

vec3 calculateLighting(vec3 normal, vec3 lightDir, vec3 viewDir, Material material) {
    vec3 L = normalize(-lightDir);
    vec3 N = normalize(normal);
    vec3 V = normalize(-viewDir);

    vec3 H = normalize(L + V); // Halfway vector
    float specDot = max(dot(N, H), 0.0);
	// Assuming a closed object thus normal facing away from the light should NOT have any specular presents, helps with artifacts
    float facingAwayFactor = max(dot(N, L), 0.0);
    float facingAwayFactorAdj = easeOutPower(facingAwayFactor, 6.0);

    vec3 ambient = material.ambient;
    vec3 diffuse = material.diffuse * max(0.0, dot(N, L));
    vec3 specular = material.specular * pow(specDot, material.shininess) * facingAwayFactorAdj;

    return ambient + diffuse + specular * 0.5;
}

vec4 isosurface(vec4 position, vec4 normal, vec3 lightDir, Material material) {
    if (position.a <= 0.0) {
        return vec4(0.0);
    }

    vec3 viewDir = position.xyz - cameraPosition;

    vec3 lDir;
    if (u_worldSpaceLight) {
        lDir = lightDir;
    } else {
        lDir = viewDir;
    }

    vec3 color = calculateLighting(normal.xyz, lDir, viewDir, material);
    return vec4(color, 1.0);
}

float calculateCurvature(ivec2 fragCoord, vec4 fragNormal, in sampler2D normalSampler) {
    const ivec2 xStep = ivec2(1, 0);
    const ivec2 yStep = ivec2(0, 1);

    vec4 p = fragNormal;
    vec4 pt = texelFetch(normalSampler, ivec2(fragCoord + yStep), 0);
    vec4 pb = texelFetch(normalSampler, ivec2(fragCoord - yStep), 0);
    vec4 pl = texelFetch(normalSampler, ivec2(fragCoord - xStep), 0);
    vec4 pr = texelFetch(normalSampler, ivec2(fragCoord + xStep), 0);

    float curvature = length(p - pt) + length(p - pb) + length(p - pl) + length(p - pr);
    return curvature;
}

float calculateNormalDistance(vec3 startPos, vec3 normal, float isoThreshold, float stepSize, float stopDist) {
    // Raymarch from the position, along the inverse of the normal until you hit another isosurface
    vec3 rayDir = -normal;
    vec3 pos = startPos;

    float step = 0.;

    int stepCount = int(stopDist / stepSize);

    for (int i = 0; i < stepCount; i++) {
        float density = sampleVolume(pos);

        if (density > isoThreshold) {
            return step;
        }

        if (step > stopDist) {
            break;
        }
        step += stepSize;
        pos += rayDir * stepSize;
    }
    return 1.0 * 1.0 / u_importanceStrength; // Isosurface too far away
}

void main() {
    Material material1;
    material1.ambient = u_color1 * 0.08;
    material1.diffuse = u_color1 * 0.76;
    material1.specular = u_color1 * 0.76;
    material1.shininess = 40.0;

    Material material2;
    material2.ambient = u_color2 * 0.08;
    material2.diffuse = u_color2 * 0.76;
    material2.specular = u_color2 * 0.76;
    material2.shininess = 40.0;

    // Material material2 = Material(vec3(0.08), vec3(0.76), vec3(1.0), 100.0);

    vec2 coords = gl_FragCoord.xy / u_resolution.xy;

    vec3 lightDir = vec3(-1);

    vec4 iso1Position = texelFetch(u_iso1PosTex, ivec2(gl_FragCoord.xy), 0);
    vec4 iso1Normal = texelFetch(u_iso1NormalTex, ivec2(gl_FragCoord.xy), 0);

    vec4 iso2Position = texelFetch(u_iso2PosTex, ivec2(gl_FragCoord.xy), 0);
    vec4 iso2Normal = texelFetch(u_iso2NormalTex, ivec2(gl_FragCoord.xy), 0);

    vec4 iso1Color = isosurface(iso1Position, iso1Normal, lightDir, material1);
    vec4 iso2Color = isosurface(iso2Position, iso2Normal, lightDir, material2);

    vec3 contextPos = iso1Position.xyz;
    vec3 focusPos = iso2Position.xyz;

    float trans;

    float fade = length(u_focusPoint - contextPos) / u_focusArea;

    switch (u_importanceMethod) {
        // View distance based importance
        case 0: {
            float fadeHeuristic = length(contextPos - focusPos) * u_importanceStrength;
            trans = 1. - pow(clamp(max(fade, fadeHeuristic), 0., 1.), u_focusAreaSharpness);
            break;
        }
        // Normal distance based importance
        case 4: {
            float normalDistance = 0.0;
            if (fade <= 1.0) {
                float longestSpan = u_focusArea * 2.0;
                float stepSize = longestSpan / (float(u_volumeSamples) * 0.6); // TODO: Maybe create separate sample count slider in the UI for this
                normalDistance = calculateNormalDistance(iso1Position.xyz, iso1Normal.xyz, u_isovalue2, stepSize, longestSpan);
                normalDistance *= u_importanceStrength;
            }
            trans = 1. - pow(clamp(max(fade, normalDistance), 0., 1.), u_focusAreaSharpness);
            break;
        }
        // Distance based importance
        case 1: {
            trans = 1. - pow(clamp(fade, 0., 1.), u_focusAreaSharpness);
            break;
        }
        // Curvature based importance
        case 3: {
            float curvature = calculateCurvature(ivec2(gl_FragCoord.xy), iso1Normal, u_iso1NormalTex);
            curvature *= u_importanceStrength;
            trans = 1. - pow(clamp(max(fade, curvature), 0., 1.), u_focusAreaSharpness);
            break;
        }
    }
    gl_FragColor = iso1Color * (1. - trans) + iso2Color * trans;
}
