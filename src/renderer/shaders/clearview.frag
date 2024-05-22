precision highp float;

varying vec3 aPos;

uniform vec2 u_resolution;

uniform bool u_worldSpaceLight;

uniform sampler2D u_iso1PositionTexture;
uniform sampler2D u_iso1NormalTexture;

struct Light {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float shininess;
};

float easeOutPower(float x, float power) {
    return 1.0 - pow(1.0 - x, power);
}

vec3 calculateLighting(vec3 normal, vec3 lightDir, vec3 viewDir, Light light) {
    vec3 L = normalize(-lightDir);
    vec3 N = normalize(normal);
    vec3 V = normalize(-viewDir);

    vec3 H = normalize(L + V); // Halfway vector
    float specDot = max(dot(N, H), 0.0);
	// Assuming a closed object thus normal facing away from the light should NOT have any specular presents, helps with artifacts
    float facingAwayFactor = max(dot(N, L), 0.0);
    float facingAwayFactorAdj = easeOutPower(facingAwayFactor, 6.0);

    vec3 ambient = light.ambient;
    vec3 diffuse = light.diffuse * max(0.0, dot(N, L));
    vec3 specular = light.specular * pow(specDot, light.shininess) * facingAwayFactorAdj;

    return ambient + diffuse + specular;
}

void main() {
    Light light = Light(vec3(0.08), vec3(0.76), vec3(1.0), 100.0);

    vec2 coords = gl_FragCoord.xy / u_resolution.xy;

    vec4 iso1Position = texelFetch(u_iso1PositionTexture, ivec2(gl_FragCoord.xy), 0);
    if (iso1Position.a <= 0.0) {
        gl_FragColor = vec4(0.0);
        return;
    }
    vec4 iso1Normal = texelFetch(u_iso1NormalTexture, ivec2(gl_FragCoord.xy), 0);

    vec3 viewDir = iso1Position.xyz - cameraPosition;

    vec3 lightDir;
    if (u_worldSpaceLight) {
        lightDir = vec3(-1, -1, -1);
    } else {
        lightDir = viewDir;
    }

    vec3 color = calculateLighting(iso1Normal.xyz, lightDir, viewDir, light);

    gl_FragColor = vec4(color, 1.0);
}
