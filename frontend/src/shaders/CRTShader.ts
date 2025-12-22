import { Vector2 } from "three";

export const CRTShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "TextureSize": { value: new Vector2(800, 600) },
        "InputSize": { value: new Vector2(800, 600) },
        "OutputSize": { value: new Vector2(800, 600) },
        "RX": { value: 0.05 }, // Convergence Horiz
        "SIZE": { value: 1.0 }, // Mask Type
        "scanl": { value: 0.01 }, // Scanlines/Mask Low
        "scanh": { value: 0.01 }, // Scanlines/Mask High
        "slotm": { value: 3.0 }, // Slot Mask On/Off
        "slotw": { value: 6.0 }, // Slot Mask Width
        "sat": { value: 1.0 }, // Saturation
        "Trin": { value: 1.0 }, // CRT Colors
        "CURV": { value: 1.0 }, // Curvature On/Off
        "glow": { value: 0.12 }, // Glow strength
        "boostd": { value: 1.45 }, // Boost Dark Colors
    },

    vertexShader: `
        varying vec2 vUv;
        varying vec2 scale;
        varying vec2 warp;
        varying vec2 warpp;
        varying float fragpos;
        varying vec2 ps;
        varying float dx;

        uniform vec2 TextureSize;
        uniform vec2 InputSize;
        uniform vec2 OutputSize;
        uniform float SIZE;
        uniform float RX;

        void main() {
            vUv = uv;
            vec2 texCoord = uv;
            
            // Ported vertex logic
            scale = TextureSize.xy / InputSize.xy;
            fragpos = texCoord.x * OutputSize.x * scale.x * 2.0 / SIZE;
            warp = texCoord.xy * scale;
            warpp = warp - 0.5;
            ps = 1.0 / TextureSize.xy;
            dx = ps.x * RX;

            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,

    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 TextureSize;
        uniform vec2 InputSize;
        uniform vec2 OutputSize;

        uniform float scanl;
        uniform float scanh;
        uniform float sat;
        uniform float slotm;
        uniform float slotw;
        uniform float Trin;
        uniform float CURV;
        uniform float glow;
        uniform float boostd;

        varying vec2 vUv;
        varying vec2 scale;
        varying float fragpos;
        varying vec2 warp;
        varying vec2 warpp;
        varying vec2 ps;
        varying float dx;

        #define pi 3.14159265
        #define tau 6.2831852

        vec2 Warp(vec2 pos)
        {   
            pos *= 1.0 + dot(pos,pos)*0.15;
            return pos*0.97 + 0.5;
        }

        float slot(vec2 pos, float mask)
        {
            float odd = 1.0;
            if (fract(pos.x/slotw) < 0.5) odd = 0.0;

            return mask*sin((pos.y+odd)*pi)+1.0;
        }

        void main() {
            vec2 pos;
            vec2 corn;
            float d = 1.0;
            
            if (CURV == 1.0){
                pos = Warp(warpp);
                corn = min(pos, 1.0-pos);    
                corn = 0.02-min(corn,0.02);
                d = sqrt(dot(corn,corn));
                d = clamp( (0.02-d)*400.0, 0.0,1.0);
                pos /= scale;
            } else {
                pos = vUv;
            }

            // Hermite
            vec2 ogl2pos = pos*TextureSize.xy;
            vec2 p = ogl2pos+0.5;
            vec2 i = floor(p);
            vec2 f = p - i;        // -0.5 to 0.5
            f = f*f*f*(4.0-3.0*f);
            f.y *= f.y;
            p = (i + f-0.5)*ps;

            // Convergence
            // Using tDiffuse for PassPrev3Texture as we don't have a history buffer
            vec3 res    =  texture2D(tDiffuse, p).rgb;
            vec2 convrb =  texture2D(tDiffuse, p + vec2(dx,0.0)).xz;
            float convg =  texture2D(tDiffuse, p - vec2(dx,0.0)).y;

            // vignette  
            float x = warpp.x;  // range -0.5 to 0.5, 0.0 being center of screen
            x = x*x*0.5;      // curved response: higher values (more far from center) get higher results.
            
            res = res*0.5 + 0.5*vec3(convrb.x,convg,convrb.y);   

            float w = dot(vec3(0.25),res);
            float scan = mix(scanl,scanh,w)+x;
            float mask = scan*1.333;

            // apply vignette here
            float scn = scan*sin((ogl2pos.y+0.5)*tau)+1.0-scan;
            float msk = mask*sin(fragpos*pi)+1.0-mask;
                
            vec2 xy = vec2(0.0);
            if (slotm == 1.0){
                xy = warp*OutputSize.xy; 
                msk = msk*slot(xy, mask);
            }

            if(Trin == 1.0) { 
                res *= vec3(1.0,0.92,1.08); 
                res = clamp(res,0.0,1.0);
            }
            res *= mix(boostd, 1.0, w);
            
            // Glow - using tDiffuse (Source)
            vec3 Glow = texture2D(tDiffuse, pos).rgb;
            res = res + Glow*glow;  
            res *= scn*msk;

            res = sqrt(res);
            float gray = dot(vec3(0.3,0.6,0.1),res);
            res  = mix(vec3(gray),res,sat);
            
            if (CURV == 1.0 ) res *= d;

            gl_FragColor = vec4(res, 1.0);    
        }
    `
};
