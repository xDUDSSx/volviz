out vec3 aPos;

void main() {
  vec4 mPosition = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * mPosition;
  aPos = mPosition.xyz;
}
