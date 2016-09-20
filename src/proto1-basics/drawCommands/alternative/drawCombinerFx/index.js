export default function drawCombinerFx (regl, params) {
  const {diffuseTex, glowTex} = params

  //blend functions taken from https://github.com/jamieowen/glsl-blend

  return regl({
    frag: `
    precision mediump float;
    float blendScreen(float base, float blend) {
    	return 1.0-((1.0-base)*(1.0-blend));
    }

    vec3 blendScreen(vec3 base, vec3 blend) {
    	return vec3(blendScreen(base.r,blend.r),blendScreen(base.g,blend.g),blendScreen(base.b,blend.b));
    }

    float blendReflect(float base, float blend) {
    	return (blend==1.0)?blend:min(base*base/(1.0-blend),1.0);
    }

    vec3 blendReflect(vec3 base, vec3 blend) {
    	return vec3(blendReflect(base.r,blend.r),blendReflect(base.g,blend.g),blendReflect(base.b,blend.b));
    }

    vec3 blendReflect(vec3 base, vec3 blend, float opacity) {
    	return (blendReflect(base, blend) * opacity + base * (1.0 - opacity));
    }

    vec3 blendGlow(vec3 base, vec3 blend) {
    	return blendReflect(blend,base);
    }

    vec3 blendGlow(vec3 base, vec3 blend, float opacity) {
    	return (blendGlow(base, blend) * opacity + base * (1.0 - opacity));
    }

    vec3 blendAdd(vec3 base, vec3 blend){
      return min(base+blend,vec3(1.0));
    }

    varying vec2 uv;

    uniform sampler2D diffuseTex;
    uniform sampler2D glowTex;

    void main() {
      //vec3 color = texture2D(glowTex, uv).rgb;
      //vec4 color = mix(texture2D(diffuseTex, uv), texture2D(glowTex, uv)*2., 0.5);

      vec4 bgColor = texture2D(diffuseTex, uv);
      vec4 fgColor = texture2D(glowTex, uv);
      vec3 color = blendScreen(bgColor.rgb, fgColor.rgb);

      gl_FragColor = vec4(color,1.);
    }`,

    vert: `
    precision mediump float;
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = position;
      gl_Position = vec4(2.0 * position - 1.0, 0, 1);
    }`,
    attributes: {
      position: [ -4, -4, 4, -4, 0, 4 ]
    },
    uniforms: {
      diffuseTex,
      glowTex
    },
    depth: { enable: false },
    count: 3
  })
}
