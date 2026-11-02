// Jelly blob fragment shader: screen-space refraction of the headline with
// chromatic split, flavour tint, thin-film iridescent rim and a hard glint.
uniform sampler2D uBg;
uniform vec2 uRes;
uniform vec3 uTint;
uniform vec3 uLight;
uniform float uTime;
uniform float uRefract;
varying vec3 vN;
varying float vDisp;

void main(){
  vec3 N = normalize(vN);
  vec3 V = vec3(0.0, 0.0, 1.0);
  float ndv = max(dot(N, V), 0.0);
  float fres = pow(1.0 - ndv, 2.2);

  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 off = N.xy * uRefract * (0.7 + fres * 0.6);
  off.x *= uRes.y / uRes.x;
  vec3 refr;
  refr.r = texture2D(uBg, uv - off * 1.00).r;
  refr.g = texture2D(uBg, uv - off * 1.10).g;
  refr.b = texture2D(uBg, uv - off * 1.22).b;

  // jelly body: refracted scene multiplied by the flavour, a touch of glow
  // map what's behind into the flavour's own range: ink -> deep tint, paper -> bright tint
  vec3 deep = uTint * 0.28 + vec3(0.04, 0.0, 0.02);
  vec3 bright = min(uTint * 1.08 + 0.14, vec3(1.0));
  vec3 col = mix(deep, bright, refr);
  // subtle body gradient (lighter at top) reads as volume
  col *= 0.92 + 0.16 * (N.y * 0.5 + 0.5);

  // thin-film rim
  vec3 irid = 0.5 + 0.5 * cos(6.28318 * (fres * 1.1 + vDisp * 2.0 + vec3(0.0, 0.33, 0.67) + uTime * 0.04));
  col += (irid - 0.35) * fres * 0.32;

  // key glint + soft fill
  vec3 L = normalize(uLight);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 90.0);
  col += vec3(1.0) * spec * 1.3;
  float sheen = pow(max(dot(N, normalize(vec3(-0.5, -0.6, 0.9))), 0.0), 10.0);
  col += uTint * sheen * 0.25;

  // inner edge darkening reads as thickness
  col *= 1.0 - fres * 0.12;
  // soft silhouette = cheap anti-aliasing on tiers without MSAA
  float a = smoothstep(0.0, 0.16, ndv);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * a, a);
}
