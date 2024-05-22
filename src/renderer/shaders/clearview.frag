precision highp float;

varying vec3 aPos;

uniform vec2 u_resolution;

uniform sampler2D u_iso1PositionTexture;
uniform sampler2D u_iso1NormalTexture;

void main() {
    vec2 coords = gl_FragCoord.xy / u_resolution.xy;

    vec4 iso1Position = texelFetch(u_iso1PositionTexture, ivec2(gl_FragCoord.xy), 0);
    vec4 iso1Normal = texelFetch(u_iso1NormalTexture, ivec2(gl_FragCoord.xy), 0);

    gl_FragColor = iso1Normal;
}
