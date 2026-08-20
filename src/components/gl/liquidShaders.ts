/**
 * liquidShaders.ts — GLSL for the liquid field.
 *
 * Two programs, both WebGL1 / GLSL ES 1.00 so nothing here needs a fallback:
 *
 *  1. DYE  — advects a single-channel ink texture along the velocity field and
 *            injects a soft blob under the pointer. Ping-ponged between two
 *            framebuffers, which is why a push leaves a trail that spreads and
 *            fades instead of vanishing with the mouse.
 *  2. DISPLAY — draws the paper. It refracts the paper texture by the velocity
 *            field, so the surface behaves like liquid over an image rather
 *            than a glow pasted on top, then lays the dye over it as pigment.
 *
 * The velocity field is not simulated on the GPU. It is uploaded from
 * src/lib/liquid.ts, because the DOM has to read exactly the same field the
 * canvas draws — one simulation, two consumers.
 */

export const QUAD_VERT = /* glsl */ `
precision mediump float;

attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const DYE_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uDye;
uniform sampler2D uVel;
uniform float uDt;
uniform float uDissipation;
uniform vec2 uPointer;
uniform float uPointerForce;
uniform float uAspect;

void main() {
  vec2 vel = (texture2D(uVel, vUv).rg - 0.5) * 2.0;

  /* Look backwards along the flow: the ink that is here now came from there. */
  vec2 coord = vUv - vel * uDt * 0.35;
  float dye = texture2D(uDye, coord).r * uDissipation;

  /* Injection. The aspect correction keeps the blob round on a wide monitor. */
  vec2 d = (vUv - uPointer) * vec2(uAspect, 1.0);
  dye += exp(-dot(d, d) * 150.0) * uPointerForce;

  gl_FragColor = vec4(clamp(dye, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`;

export const DISPLAY_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uDye;
uniform sampler2D uVel;
uniform float uTime;
uniform float uAspect;
uniform float uIntro;
uniform float uRefraction;
uniform vec3 uPaper;
uniform vec3 uPaperDeep;
uniform vec3 uAccent;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float total = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    total += noise(p) * amp;
    p *= 2.02;
    amp *= 0.5;
  }
  return total;
}

void main() {
  vec2 vel = (texture2D(uVel, vUv).rg - 0.5) * 2.0;
  float dye = texture2D(uDye, vUv).r;
  float speed = length(vel);

  /* THE distortion. Sampling coordinates are bent by the flow, so the paper
     itself deforms; the ink adds a small extra sag under a heavy pour. */
  vec2 uv = vUv - vel * uRefraction - vec2(0.0, dye * 0.010);
  vec2 p = vec2(uv.x * uAspect, uv.y);

  /* Slow tide, so a still page is not a dead page. */
  float time = uTime * 0.02;
  float tide = fbm(p * 1.55 - time);

  /* Paper fibre. Very high frequency, very low amplitude. */
  float fibre = noise(p * 240.0) * 0.016;

  vec3 col = mix(uPaper, uPaperDeep, tide * 0.5 + 0.14);
  col += fibre - 0.008;

  /* Meniscus: the bright lip where liquid piles up against itself. */
  col += vec3(1.0) * smoothstep(0.25, 0.95, speed) * 0.055;

  /* Pigment. The accent is the only saturated colour on the page, and it is
     earned by movement rather than sprayed everywhere. */
  float pigment = clamp(dye * 0.14 + speed * 0.09, 0.0, 0.20);
  col = mix(col, uAccent, pigment);

  /* Held flat while the preloader is up, then poured in. */
  col = mix(uPaper, col, uIntro);

  gl_FragColor = vec4(col, 1.0);
}
`;
