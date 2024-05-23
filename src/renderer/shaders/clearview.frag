precision highp float;

varying vec3 aPos;

uniform vec2 u_resolution;

uniform vec3 u_focusPoint;
uniform bool u_worldSpaceLight;

uniform sampler2D u_iso1PosTex;
uniform sampler2D u_iso1NormalTex;

uniform sampler2D u_iso2PosTex;
uniform sampler2D u_iso2NormalTex;

struct Material {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float shininess;
};

float easeOutPower(float x, float power) {
    return 1.0 - pow(1.0 - x, power);
}

float easeInPower(float x, float power) {
    return 1.0 - pow(1.0 - x, power);
}

// float easeInPower(float x, float power) {
//     return 1.0 - pow(1.0 - x, power);
// }

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

void main() {
    vec3 color1 = vec3(0.56, 0.72, 0.91);
    vec3 color2 = vec3(0.9, 0.87, 0.87);

    Material material1;
    material1.ambient = color1 * 0.08;
    material1.diffuse = color1 * 0.76;
    material1.specular = color1 * 0.76;
    material1.shininess = 40.0;

    Material material2;
    material2.ambient = color2 * 0.08;
    material2.diffuse = color2 * 0.76;
    material2.specular = color2 * 0.76;
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

    // View distance based importance

    float focusArea = 0.5;

    vec3 contextPos = iso1Position.xyz;
    vec3 focusPos = iso2Position.xyz;

    // float fadeHeuristic = length(contextPos - focusPos);
    float fadeHeuristic = 0.;
    float fade = length(u_focusPoint - contextPos) / focusArea;

    float trans = 1. - pow(clamp(max(fade, fadeHeuristic), 0., 1.), 5.);

    gl_FragColor = iso1Color * (1. - trans) + iso2Color * trans;

    // gl_FragColor = vec4(vec3(trans), 1.0);
    // if (coords.x > 0.5) {
    //     gl_FragColor = iso1Color;
    // } else {
    //     gl_FragColor = iso2Color;
    // }
}
