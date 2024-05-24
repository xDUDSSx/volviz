
// ================ START SHADER CHUNK (raymarcher.chunk.frag) ================
precision highp float;
precision mediump sampler3D;

// Expects the following BEFORE including it
// in vec3 aPos;
// uniform vec2 u_resolution;

uniform sampler2D u_positionTexture;

uniform sampler3D u_volumeTexture;
uniform sampler2D u_gradientTexture;
uniform float u_volumeMin;
uniform float u_volumeMax;

uniform int u_volumeSamples;
uniform bool u_volumeInvertX;
uniform bool u_volumeInvertY;
uniform bool u_volumeInvertZ;
uniform bool u_volumeFlipYZ;
uniform float u_volumeNoise;

float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

vec3 map(vec3 value, vec3 min1, vec3 max1, vec3 min2, vec3 max2) {
    return vec3(map(value.x, min1.x, max1.x, min2.x, max2.x), map(value.y, min1.y, max1.y, min2.y, max2.y), map(value.z, min1.z, max1.z, min2.z, max2.z));
}

vec3 map(vec3 value, float min1, float max1, float min2, float max2) {
    return map(value, vec3(min1), vec3(max1), vec3(min2), vec3(max2));
}

float sampleVolume(vec3 pos) {
    vec3 adjPos = map(pos, -1., 1., 0., 1.);
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

void setupRaymarcher(vec2 coords, out vec3 rayDir, out vec3 frontPos, out float stepSize, out int stepCount, out float raySpanLen) {
    // World position of the cube back side. It's the current position of this fragment.
    vec3 backPos = aPos.xyz;

    // World position of the cube front side. It's fetched from a previously rendered texture.
    vec4 frontPosFetch = texelFetch(u_positionTexture, ivec2(gl_FragCoord.xy), 0);
    // Clear color of the front position texture has alpha of 0 so we can check for that.
    frontPos = frontPosFetch.a <= 0.0 ? backPos : frontPosFetch.xyz;

    vec3 raySpan = backPos - frontPos;
    raySpanLen = length(raySpan);
    rayDir = normalize(raySpan);

    stepCount = u_volumeSamples;
    float longestSpan = length(vec3(2., 2., 2.));
    stepSize = longestSpan / float(stepCount);

    // Randomly offset stepsize to "dither" aliasing
    // https://www.marcusbannerman.co.uk/articles/VolumeRendering.html
    float random = fract(sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453);
    stepSize += u_volumeNoise * stepSize * random;
}

vec4 getColorAt(float value) {
    vec2 texCoord = vec2(0.);
    texCoord.s = value;
    return texture(u_gradientTexture, texCoord);
}

// ================ END SHADER CHUNK (raymarcher.chunk.frag) ================
