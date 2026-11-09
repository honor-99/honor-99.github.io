export const noise = /* glsl */ `
float hash(vec3 p) {
  p = fract(p * .3183099 + vec3(.1,.2,.3));
  p *= 17.;
  return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float noise3(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) {
  float v=0., a=.5;
  for(int i=0;i<5;i++){v+=a*noise3(p);p=p*2.03+vec3(17.1,9.2,11.7);a*=.5;}
  return v;
}
`;

export const skyVertex = /* glsl */ `
varying vec3 vWorld;
void main(){vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
export const skyFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uSecondary;
varying vec3 vWorld;
${noise}
void main(){
  vec3 p=normalize(vWorld);
  float cloud=fbm(p*5.3+vec3(0.,0.,uTime*.002));
  float fine=fbm(p*21.+cloud*2.);
  float band=exp(-pow((p.y+p.x*.36+.08)*3.8,2.));
  float dust=pow(max(cloud-.30,0.)*2.5,2.)*band;
  float rift=smoothstep(.35,.65,fine)*dust;
  vec3 col=vec3(.002,.003,.005)+uColor*dust*.055+uSecondary*rift*.025;
  col*=.5+.65*fine;
  gl_FragColor=vec4(col,1.);
}
`;

export const diskVertex = /* glsl */ `
varying vec3 vLocal;
void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
export const diskFragment = /* glsl */ `
varying vec3 vLocal;
uniform float uTime;
uniform float uPulse;
uniform vec3 uColor;
uniform vec3 uSecondary;
${noise}
void main(){
  float r=length(vLocal.xy);
  float a=atan(vLocal.y,vLocal.x);
  float flow=a+uTime*.13/pow(r*.28,.8);
  vec3 p=vec3(cos(flow)*r*.8,sin(flow)*r*.8,r*.7);
  float n=fbm(p+vec3(0.,0.,uTime*.04));
  float strands=sin(r*35.+n*13.-uTime*.4+sin(a*3.+uTime*.07)*1.4)*.5+.5;
  float fine=sin(r*99.+n*22.+a*2.)*.5+.5;
  float inner=smoothstep(2.27,2.61,r);
  float outer=1.-smoothstep(3.,8.,r);
  float filaments=pow(strands,5.)*.8+pow(fine,14.)*.32;
  float hot=exp(-(r-2.4)*.72);
  float doppler=.5+.5*pow(sin(a+.6)*.5+.5,2.);
  float intensity=(.16+filaments)*(n*.95+.2)*inner*outer;
  vec3 color=mix(uColor,uSecondary,hot*.65+n*.2);
  color=mix(color,vec3(1.,.9,.72),pow(hot,3.)*.55);
  color*=intensity*(1.65+hot*3.2)*doppler*(1.+uPulse*.8);
  gl_FragColor=vec4(color,clamp(intensity*1.7,0.,.98));
}
`;

export const haloVertex = /* glsl */ `
varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
export const haloFragment = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform float uPulse;
uniform vec3 uColor;
uniform vec3 uSecondary;
${noise}
void main(){
  vec2 p=(vUv-.5)*2.;
  float r=length(p);
  float a=atan(p.y,p.x);
  float n=fbm(vec3(cos(a)*5.,sin(a)*5.,uTime*.07));
  float photon=exp(-abs(r-.456)*220.);
  float edge=exp(-abs(r-.46)*65.);
  float veil=exp(-abs(r-.48)*19.);
  float tendril=pow(max(0.,sin(a*27.+n*20.+r*50.-uTime*.4)),9.)*.15;
  float outer=exp(-abs(r-.51)*10.)*(.1+tendril)*smoothstep(.45,.50,r);
  float arc=.55+.45*sin(a+.8);
  vec3 col=uColor*(edge*1.5+veil*.18+outer*.8)*arc;
  col+=mix(uSecondary,vec3(1.,.9,.7),.7)*photon*(2.2+n*2.);
  col*=smoothstep(.438,.453,r)*(1.+uPulse*.9);
  gl_FragColor=vec4(col,(photon+edge+veil*.4+outer)*smoothstep(.437,.454,r));
}
`;

export const starVertex = /* glsl */ `
attribute float aSize;
attribute float aPhase;
varying vec3 vColor;
varying float vAlpha;
uniform float uTime;
uniform float uPixelRatio;
void main(){
  vColor=color;
  vAlpha=.55+.45*sin(aPhase+uTime*.4);
  vec4 mv=modelViewMatrix*vec4(position,1.);
  gl_PointSize=clamp(aSize*uPixelRatio*(150./-mv.z),.65,6.);
  gl_Position=projectionMatrix*mv;
}
`;
export const starFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d=length(gl_PointCoord-.5)*2.;
  if(d>1.) discard;
  float core=exp(-d*d*10.);
  gl_FragColor=vec4(vColor*1.6,core*vAlpha);
}
`;

export const dustVertex = /* glsl */ `
attribute float aSize;
attribute float aPhase;
varying float vAlpha;
varying float vHeat;
uniform float uTime;
uniform float uPulse;
uniform float uPixelRatio;
void main(){
  float r=length(position.xz);
  float angle=uTime*.035/pow(r*.15,.65);
  float c=cos(angle),s=sin(angle);
  vec3 pos=position;
  pos.x=position.x*c-position.z*s;
  pos.z=position.x*s+position.z*c;
  pos.y+=sin(aPhase+uTime*.14)*.08;
  pos*=1.+uPulse*.16;
  vec4 mv=modelViewMatrix*vec4(pos,1.);
  gl_PointSize=clamp(aSize*uPixelRatio*35./-mv.z,1.,5.);
  gl_Position=projectionMatrix*mv;
  vAlpha=(.4+.6*sin(aPhase+uTime*.2)*sin(aPhase+uTime*.2))*.7;
  vHeat=1.-smoothstep(3.,16.,r);
}
`;
export const dustFragment = /* glsl */ `
varying float vAlpha;
varying float vHeat;
uniform vec3 uColor;
uniform vec3 uSecondary;
void main(){
  float d=length(gl_PointCoord-.5)*2.;
  if(d>1.) discard;
  gl_FragColor=vec4(mix(uColor,uSecondary,vHeat)*1.25,exp(-d*d*5.)*vAlpha*.75);
}
`;

export const coreVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.);
  vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);
  gl_Position=projectionMatrix*mv;
}
`;
export const coreFragment = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
uniform vec3 uColor;
uniform vec3 uSecondary;
uniform float uEpoch;
uniform float uTime;
${noise}
void main(){
  float rim=pow(1.-max(dot(normalize(vNormal),normalize(vView)),0.),7.);
  vec3 col=vec3(.0001,.0002,.0003)+uColor*rim*.24;
  float surface=fbm(vNormal*9.+vec3(0.,uTime*.09,0.));
  float sun=(1.-smoothstep(0.,.95,uEpoch));
  float dawn=smoothstep(1.05,2.,uEpoch);
  col+=mix(uColor,uSecondary,surface)*pow(surface,2.)*sun*1.7;
  col+=uSecondary*(surface*.2+rim*.4)*dawn;
  gl_FragColor=vec4(col,1.);
}
`;
