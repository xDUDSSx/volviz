in vec3 position;
in vec3 normal;
in vec2 uv;

out vec3 aPos;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

void main() {
    vec4 mPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * mPosition;
    aPos = mPosition.xyz;
}