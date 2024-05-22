in vec3 aPos;

uniform vec2 u_resolution;
uniform mat4 u_projectionViewInverse;

void main() {
  if (gl_FrontFacing) {
    gl_FragColor = vec4(aPos, 1.0);
  } else {
    vec2 coords = gl_FragCoord.xy / u_resolution.xy;
    vec4 nearPlaneNdcPos = vec4(coords.x * 2. - 1., coords.y * 2. - 1., -1, 1);
    vec4 nearPlaneWorldPos = u_projectionViewInverse * nearPlaneNdcPos;
    nearPlaneWorldPos /= nearPlaneWorldPos.w;
    gl_FragColor = vec4(nearPlaneWorldPos.xyz, 1.0);
  }
}