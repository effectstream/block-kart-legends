
export const commonShaderPart = `
// Simple hash function for randomness
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// Value Noise (bilinear interpolation of hash)
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Voronoi noise
vec3 voronoi(in vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    vec2 mg, mr;
    float md = 8.0;
    for(int j=-1; j<=1; j++)
    for(int i=-1; i<=1; i++) {
        vec2 g = vec2(float(i),float(j));
        vec2 o = vec2(hash(n + g), hash(n + g + vec2(13.5))); // Random offset
        // Animate? o = 0.5 + 0.5*sin( uTime + 6.2831*o );
        vec2 r = g + o - f;
        float d = dot(r,r);
        if(d<md) {
            md = d;
            mr = r;
            mg = g;
        }
    }
    return vec3(md, mr);
}

// FBM
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 5; ++i) {
        v += a * noise(p);
        p = rot * p * 2.0 + vec2(100.0);
        a *= 0.5;
    }
    return v;
}
`;

export const carVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const carFragmentShader = `
uniform vec3 uBaseColor;
uniform vec3 uHighlightColor;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

${commonShaderPart}

void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0)); // Fixed directional light

    // 1. Metallic Car Paint
    
    // Fresnel effect
    float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 3.0);
    
    // Base Color mix
    vec3 color = mix(uBaseColor, uHighlightColor, fresnel);

    // Metallic Flakes (Voronoi)
    // Map UVs to world space or object space to avoid texture stretching if possible, 
    // but object UVs are fine for now. Scaling high for tiny flakes.
    vec3 vNoise = voronoi(vUv * 100.0);
    float flakes = pow(vNoise.x, 16.0); // Sharp, tiny dots
    
    // Sparkle intensity based on light angle
    float sparkleIntensity = max(0.0, dot(reflect(-lightDir, normal), viewDir));
    sparkleIntensity = pow(sparkleIntensity, 8.0);
    
    color += vec3(flakes) * sparkleIntensity * 2.0;

    // Specular (Clear Coat)
    float spec = pow(max(0.0, dot(reflect(-lightDir, normal), viewDir)), 32.0);
    color += vec3(spec) * 0.8;

    gl_FragColor = vec4(color, 1.0);
}
`;

export const trackVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const trackFragmentShader = `
uniform int uTrackType; // 0: Asphalt, 1: Dirt, 2: Ice/Snow
uniform vec3 uColor;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

${commonShaderPart}

void main() {
    vec3 color = uColor;
    vec2 uv = vWorldPosition.xz * 0.5; // World space mapping for continuity
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));

    if (uTrackType == 0) {
        // Asphalt
        // Pebbles: Voronoi "distance-to-edge" or just cell value
        vec3 v = voronoi(uv * 20.0);
        float stones = smoothstep(0.0, 0.1, v.x); 
        
        // Grittiness: High freq noise
        float grain = noise(uv * 500.0) * 0.1;
        
        // Asphalt color base
        vec3 asphaltBase = vec3(0.15); 
        color = asphaltBase + (stones * 0.05) + grain;
        
    } else if (uTrackType == 1) {
        // Dirt
        float clumps = fbm(uv * 5.0); // Layered noise
        
        // Cracks: Voronoi edge distance (using Manhattan distance approx in voronoi or similar)
        // Standard voronoi returns center point in yz (if we modified it) or just dist in x.
        // Let's reuse voronoi x for cracks.
        vec3 v = voronoi(uv * 3.0);
        float cracks = 1.0 - smoothstep(0.0, 0.05, v.x);
        
        vec3 dirtColor1 = vec3(0.3, 0.2, 0.1);
        vec3 dirtColor2 = vec3(0.2, 0.1, 0.05);
        color = mix(dirtColor1, dirtColor2, clumps);
        color -= cracks * 0.3; 

    } else if (uTrackType == 2) {
        // Snow
        float drifts = noise(uv * 0.5); // Low frequency
        
        // Sparkles
        // High freq noise + high threshold
        float nSparkle = noise(uv * 50.0 + vec2(uTime * 0.1)); // slight animation?
        float sparkles = pow(nSparkle, 20.0) * dot(normal, lightDir);
        
        vec3 snowColor1 = vec3(0.9, 0.95, 1.0);
        vec3 snowColor2 = vec3(1.0, 1.0, 1.0);
        color = mix(snowColor1, snowColor2, drifts);
        color += sparkles * 1.5;
    }

    // Simple lighting
    float diffuse = max(0.0, dot(normal, lightDir));
    float ambient = 0.3;
    color *= (diffuse + ambient);

    gl_FragColor = vec4(color, 1.0);
}
`;

