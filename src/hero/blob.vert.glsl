// Jelly blob vertex shader: noise wobble + pointer dent + tap ripple.
// Normals are rebuilt from the displaced surface (two neighbour samples).
uniform float uTime;
uniform vec3 uPoke;
uniform float uPokeAmp;
uniform float uWobble;
uniform vec3 uRipple;
uniform float uRippleT;
uniform float uRippleAmp;
varying vec3 vN;
varying float vDisp;

// Simplex 3D noise (Ashima Arts / Stefan Gustavson, MIT)
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

float disp(vec3 p){
  float t = uTime;
  float amp = 0.065 + uWobble * 0.16;
  float n = snoise(p * 0.95 + vec3(0.0, t * 0.22, t * 0.15)) * amp;
  n += snoise(p * 2.2 - vec3(t * 0.3)) * (0.016 + uWobble * 0.05);
  // dent where the pointer presses
  float d = distance(p, uPoke);
  n -= uPokeAmp * exp(-d * d * 5.5);
  // ring ripple travelling out from the tap point
  float dr = distance(p, uRipple);
  float front = uRippleT * 1.6;
  n += uRippleAmp * sin((dr - front) * 14.0) * exp(-uRippleT * 1.8) * exp(-pow(dr - front, 2.0) * 10.0);
  return n;
}

void main(){
  vec3 p = normalize(position);
  float d0 = disp(p);
  vec3 up = abs(p.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t = normalize(cross(up, p));
  vec3 b = cross(p, t);
  float e = 0.012;
  vec3 p1 = normalize(p + t * e);
  vec3 p2 = normalize(p + b * e);
  vec3 P0 = p * (1.0 + d0);
  vec3 P1 = p1 * (1.0 + disp(p1));
  vec3 P2 = p2 * (1.0 + disp(p2));
  vec3 n = normalize(cross(P1 - P0, P2 - P0));
  n *= sign(dot(n, p));
  vN = normalize(normalMatrix * n);
  vDisp = d0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(P0, 1.0);
}
