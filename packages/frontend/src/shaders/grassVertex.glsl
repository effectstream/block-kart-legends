uniform float uTime;
uniform vec3 uPlayerPosition;
uniform float uPatchSize;
uniform vec3 uBoundingBoxMin;
uniform vec3 uBoundingBoxMax;
uniform sampler2D uHeightMap;
uniform sampler2D uTrackMask;
uniform sampler2D uNoiseTexture;
uniform float uHeightNoiseFrequency;
uniform float uHeightNoiseAmplitude;
uniform float uMaxBladeHeight;
uniform float uRandomHeightAmount;
uniform float uBaldPatchModifier;
uniform float uFalloffSharpness;
uniform float uBladeWidth;
uniform float uWindDirection;
uniform float uWindSpeed;
uniform float uWindNoiseScale;
uniform float uMaxBendAngle;
uniform sampler2D uDiffuseMap;

attribute vec3 aBladeOrigin;
attribute vec3 aYaw;

varying vec3 vColor;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

mat3 rotate3d(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat3(
        oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
        oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
        oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
    );
}

void main() {
    vec3 transformed = position;
    vec3 origin = aBladeOrigin;

    float halfPatchSize = uPatchSize * 0.5;
    origin.x = mod(origin.x - uPlayerPosition.x + halfPatchSize, uPatchSize) - halfPatchSize;
    origin.z = mod(origin.z - uPlayerPosition.z + halfPatchSize, uPatchSize) - halfPatchSize;

    vec3 worldPos = uPlayerPosition + origin;

    transformed.x = origin.x;
    transformed.z = origin.z;

    vec2 uv = vec2(
        map(uPlayerPosition.x + origin.x, uBoundingBoxMin.x, uBoundingBoxMax.x, 0.0, 1.0),
        map(uPlayerPosition.z + origin.z, uBoundingBoxMin.z, uBoundingBoxMax.z, 0.0, 1.0)
    );

    vec4 heightMapSample = texture2D(uHeightMap, uv);
    float terrainHeight = heightMapSample.r;
    float displacement = map(terrainHeight, 0.0, 1.0, uBoundingBoxMin.y, uBoundingBoxMax.y);
    transformed.y += displacement - uPlayerPosition.y;

    float maskValue = texture2D(uTrackMask, uv).r;

    vec3 heightNoise = texture2D(uNoiseTexture, uv.yx * vec2(uHeightNoiseFrequency)).rgb;
    float heightModifier = ((heightNoise.r + heightNoise.g + heightNoise.b) * uMaxBladeHeight) * uHeightNoiseAmplitude;
    // Removed unstable random(uv)
    
    float edgeDistanceX = abs(origin.x) / halfPatchSize;
    float edgeDistanceZ = abs(origin.z) / halfPatchSize;
    float edgeFactor = 1.0 - max(edgeDistanceX, edgeDistanceZ);
    edgeFactor = pow(edgeFactor, uFalloffSharpness);

    float baldPatchOffset = heightNoise.r * (uBaldPatchModifier * (1.0 - edgeFactor));
    heightModifier -= baldPatchOffset;

    float edgeFade = 
        smoothstep(uBoundingBoxMin.x, uBoundingBoxMin.x + 2.0, worldPos.x) *
        smoothstep(uBoundingBoxMax.x, uBoundingBoxMax.x - 2.0, worldPos.x) *
        smoothstep(uBoundingBoxMin.z, uBoundingBoxMin.z + 2.0, worldPos.z) *
        smoothstep(uBoundingBoxMax.z, uBoundingBoxMax.z - 2.0, worldPos.z);

    heightModifier *= edgeFade;
    heightModifier *= maskValue;

    float factor = (color.r == 0.1) ? 1.0 : (color.b == 0.1) ? -1.0 : 0.0;
    float width = smoothstep(0.5, 1.0, heightModifier * 2.0) * uBladeWidth;
    transformed += aYaw * (width / 2.0) * factor;

    vColor = texture2D(uDiffuseMap, uv * 10.0).rgb * color;
    vec3 colorNoise = texture2D(uNoiseTexture, uv.yx * vec2(uHeightNoiseFrequency) + (uTime * 0.1)).rgb;
    vColor *= colorNoise;

    float distanceFromCenter = length(origin.xz) / halfPatchSize;
    float innerCircleFactor = clamp(smoothstep(0.0, 0.5, distanceFromCenter), 0.0, 1.0);
    heightModifier *= mix(0.25, 1.0, innerCircleFactor);

    float noiseScale = uWindNoiseScale * 0.1;
    vec2 noiseUV = vec2(origin.x * noiseScale, origin.z * noiseScale);

    mat2 rotation = mat2(
        cos(uWindDirection), -sin(uWindDirection),
        sin(uWindDirection), cos(uWindDirection)
    );
    vec2 rotatedNoiseUV = rotation * noiseUV + uTime * vec2(uWindSpeed);

    vec3 windNoise = texture2D(uNoiseTexture, rotatedNoiseUV).rgb;

    vec3 axis = vec3(windNoise.g, 0.0, windNoise.b);
    float angle = radians(map(windNoise.g + windNoise.b, 0.0, 2.0, -uMaxBendAngle, uMaxBendAngle)) * color.g;
    mat3 rotationMatrix = rotate3d(axis, angle);

    vec3 basePosition = vec3(transformed.x, transformed.y - heightModifier, transformed.z);
    vec3 relativePosition = transformed - basePosition;
    relativePosition = rotationMatrix * relativePosition;
    transformed = basePosition + relativePosition;

    transformed.y += heightModifier * color.g;

    vec4 modelPosition = modelMatrix * vec4(transformed, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
}

