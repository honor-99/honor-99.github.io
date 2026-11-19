import{W as Ue}from"./three-renderer-CGivONiX.js";import{O as $e,E as Ne,R as Ke,U as Xe,S as Ye,a as Je}from"./three-effects-BTQv0QmA.js";import{bV as Qe,S as Ze,cg as et,P as tt,V as B,g as Me,C as L,an as b,ch as Pe,ci as V,av as ot,cj as Se,ck as at,cl as Te,cm as nt,cn as it,bK as se,co as Ae,bC as rt,cp as st,cq as ct,cr as lt,bs as W,D as Ce,ak as ut,B as dt,al as Le,am as S,cs as ze,ct as pt,cu as mt,cc as J}from"./three-core-BZ6UpgKw.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const c of a.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&n(c)}).observe(document,{childList:!0,subtree:!0});function o(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(s){if(s.ep)return;s.ep=!0;const a=o(s);fetch(s.href,a)}})();const O=`
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
`,ft=`
varying vec3 vWorld;
void main(){vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`,ht=`
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uSecondary;
varying vec3 vWorld;
${O}
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
`,vt=`
varying vec3 vLocal;
void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`,gt=`
varying vec3 vLocal;
uniform float uTime;
uniform float uPulse;
uniform vec3 uColor;
uniform vec3 uSecondary;
${O}
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
`,Ee=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`,yt=`
varying vec2 vUv;
uniform float uTime;
uniform float uPulse;
uniform vec3 uColor;
uniform vec3 uSecondary;
${O}
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
`,wt=`
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
`,bt=`
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d=length(gl_PointCoord-.5)*2.;
  if(d>1.) discard;
  float core=exp(-d*d*10.);
  gl_FragColor=vec4(vColor*1.6,core*vAlpha);
}
`,xt=`
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
`,Mt=`
varying float vAlpha;
varying float vHeat;
uniform vec3 uColor;
uniform vec3 uSecondary;
void main(){
  float d=length(gl_PointCoord-.5)*2.;
  if(d>1.) discard;
  gl_FragColor=vec4(mix(uColor,uSecondary,vHeat)*1.25,exp(-d*d*5.)*vAlpha*.75);
}
`,Pt=`
varying vec3 vNormal;
varying vec3 vView;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.);
  vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);
  gl_Position=projectionMatrix*mv;
}
`,St=`
varying vec3 vNormal;
varying vec3 vView;
uniform vec3 uColor;
uniform vec3 uSecondary;
uniform float uEpoch;
uniform float uTime;
${O}
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
`;class Tt{constructor(){this.context=null,this.master=null,this.voices=[],this.enabled=!1,this.epoch=1,this.rate=1}init(){const t=window.AudioContext||window.webkitAudioContext;if(!t)throw new Error("浏览器不支持 Web Audio");this.context=new t;const o=this.context;this.master=o.createGain(),this.master.gain.value=0;const n=o.createDynamicsCompressor();n.threshold.value=-20,n.ratio.value=6,this.master.connect(n).connect(o.destination);const s=[36.71,55,73.42,110,146.83];for(let f=0;f<s.length;f++){const A=o.createOscillator();A.type="sine",A.frequency.value=s[f],A.detune.value=f%2===0?-3:3;const X=o.createGain();X.gain.value=.045/(1+f*.5);const he=o.createStereoPanner();he.pan.value=(f-2)*.3,A.connect(X).connect(he).connect(this.master),A.start();const Y=o.createOscillator();Y.frequency.value=.037+f*.019;const ve=o.createGain();ve.gain.value=.009,Y.connect(ve).connect(X.gain),Y.start(),this.voices.push({oscillator:A,base:s[f]})}const a=o.createBuffer(1,o.sampleRate*5,o.sampleRate),c=a.getChannelData(0);let l=0;for(let f=0;f<c.length;f++)l=(l+(Math.random()*2-1)*.025)/1.025,c[f]=l*3;const h=o.createBufferSource();h.buffer=a,h.loop=!0;const P=o.createBiquadFilter();P.type="lowpass",P.frequency.value=550;const j=o.createGain();j.gain.value=.055,h.connect(P).connect(j).connect(this.master),h.start(),this.setEpoch(this.epoch)}async toggle(){return this.context||this.init(),this.enabled=!this.enabled,this.context.state==="suspended"&&await this.context.resume(),this.master.gain.setTargetAtTime(this.enabled?.65:0,this.context.currentTime,.4),this.enabled}setEpoch(t){if(this.epoch=t,!this.context)return;const o=[1.12,1,1.5][t];for(const n of this.voices)n.oscillator.frequency.setTargetAtTime(n.base*o,this.context.currentTime,1.5)}setRate(t){if(this.rate=t,!!this.context)for(const[o,n]of this.voices.entries())n.oscillator.detune.setTargetAtTime(t*(o%2?4:-4),this.context.currentTime,.8)}pulse(){if(!this.context||!this.enabled)return;const t=this.context,o=t.createOscillator(),n=t.createGain();o.frequency.setValueAtTime(90,t.currentTime),o.frequency.exponentialRampToValueAtTime(25,t.currentTime+2.5),n.gain.setValueAtTime(0,t.currentTime),n.gain.linearRampToValueAtTime(.17,t.currentTime+.1),n.gain.exponentialRampToValueAtTime(.001,t.currentTime+3),o.connect(n).connect(this.master),o.start(),o.stop(t.currentTime+3),o.onended=()=>{o.disconnect(),n.disconnect()}}getState(){var t;return{enabled:this.enabled,status:((t=this.context)==null?void 0:t.state)??"not-started",voices:this.voices.length}}}const r=e=>document.querySelector(e),E=r("#universe"),At=matchMedia("(prefers-reduced-motion: reduce)").matches,q=()=>innerWidth<761,i={ready:!1,epoch:1,time:0,rate:1,paused:At,pulse:0,journey:!1,sound:!1,frames:0,fps:60},C=[{color:"#ed7941",secondary:"#ffe6a6",age:"10<sup>14</sup>",temp:"2.725",caption:"在无尽长夜之前，再看一眼星光。",poem:"每一束尚未熄灭的光，<br/>都是宇宙写给黑暗的信。",bloom:.85},{color:"#d99a59",secondary:"#ffe2ad",age:"10<sup>100</sup>",temp:"0.000",caption:"所有的结束，都是另一种开始。",poem:"当最后一颗恒星熄灭，<br/>宇宙终于学会了安静。",bloom:.72},{color:"#5babb9",secondary:"#d0eaff",age:"0<sup>+</sup>",temp:"∞",caption:"时间再次呼吸，光有了新的名字。",poem:"从一粒不肯沉默的尘埃，<br/>重新长出整个宇宙。",bloom:.9}];let p;try{p=new Ue({canvas:E,antialias:!1,alpha:!1,powerPreference:"high-performance",preserveDrawingBuffer:!0})}catch(e){throw r("#loading").classList.add("loaded"),r("#fallback").hidden=!1,e}p.setPixelRatio(Math.min(devicePixelRatio,q()?1.5:1.75));p.setSize(innerWidth,innerHeight);p.toneMapping=Qe;p.toneMappingExposure=1.02;p.outputColorSpace=Ze;p.info.autoReset=!1;const g=new et,d=new tt(43,innerWidth/innerHeight,.1,500),ce=new B(.1,5.9,22.7);d.position.copy(ce);const m=new $e(d,E);m.enableDamping=!0;m.dampingFactor=.055;m.enablePan=!1;m.rotateSpeed=.45;m.zoomSpeed=.7;m.minDistance=8.5;m.maxDistance=43;m.minPolarAngle=.1;m.maxPolarAngle=Math.PI-.1;m.target.set(0,0,0);const M=new Ne(p);M.addPass(new Ke(g,d));const te=new Xe(new Me(innerWidth,innerHeight),.58,.52,.85);M.addPass(te);const F=new Ye({uniforms:{tDiffuse:{value:null},uCenter:{value:new Me(.605,.5)},uRadius:{value:.12},uAspect:{value:innerWidth/innerHeight},uDark:{value:1}},vertexShader:Ee,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform vec2 uCenter;
    uniform float uRadius;
    uniform float uAspect;
    uniform float uDark;
    varying vec2 vUv;
    void main(){
      vec2 p=(vUv-uCenter)*vec2(uAspect,1.);
      float d=length(p)/uRadius;
      float lens=exp(-abs(d-1.06)*15.)*.0025*uDark;
      vec2 bent=vUv+normalize(p+vec2(.00001))*lens/vec2(uAspect,1.);
      vec4 color=texture2D(tDiffuse,bent);
      float horizon=(1.-smoothstep(.64,.94,d))*uDark;
      float foreground=1.-smoothstep(-.55,-.28,p.y/uRadius);
      horizon*=1.-foreground;
      color.rgb*=1.-horizon*.965;
      gl_FragColor=color;
    }
  `});M.addPass(F);M.addPass(new Je);const v={uTime:{value:0},uPulse:{value:0},uEpoch:{value:1},uPixelRatio:{value:p.getPixelRatio()},uColor:{value:new L(C[1].color)},uSecondary:{value:new L(C[1].secondary)}};function R(e,t,o={}){return new ut({uniforms:v,vertexShader:e,fragmentShader:t,...o})}let Q=74319;function u(){return Q=Math.imul(Q,1664525)+1013904223|0,(Q>>>0)/4294967296}const Ct=new b(new Pe(210,48,32),R(ft,ht,{side:dt,depthWrite:!1}));g.add(Ct);function Lt(){const t=new Float32Array(27600),o=new Float32Array(9200*3),n=new Float32Array(9200),s=new Float32Array(9200),a=new L;for(let l=0;l<9200;l++){const h=u()*Math.PI*2,P=u()*2-1,j=Math.sqrt(1-P*P),f=55+u()*135;t.set([f*j*Math.cos(h),f*P,f*j*Math.sin(h)],l*3),a.setHSL(.07+u()*.12,.1+u()*.35,.4+u()*.5),u()>.87&&a.setHSL(.58,.25,.7),o.set([a.r,a.g,a.b],l*3),n[l]=u()>.98?2.2:.3+Math.pow(u(),3)*1.15,s[l]=u()*Math.PI*2}const c=new Le;return c.setAttribute("position",new S(t,3)),c.setAttribute("color",new S(o,3)),c.setAttribute("aSize",new S(n,1)),c.setAttribute("aPhase",new S(s,1)),new ze(c,R(wt,bt,{vertexColors:!0,transparent:!0,blending:W,depthWrite:!1}))}const Re=Lt();g.add(Re);const U=new V;g.add(U);const ke=new b(new Pe(2.17,96,64),R(Pt,St));U.add(ke);const oe=new b(new ot(10,10),R(Ee,yt,{transparent:!0,blending:W,depthWrite:!1}));U.add(oe);const D=new V;D.rotation.z=-.16;D.rotation.x=.07;U.add(D);const zt=R(vt,gt,{side:Ce,transparent:!0,blending:W,depthWrite:!1}),je=new b(new Se(2.3,8,240,8),zt);je.rotation.x=-Math.PI/2;D.add(je);function Et(e){const t=new Float32Array(e*3),o=new Float32Array(e),n=new Float32Array(e);for(let a=0;a<e;a++){const c=3.1+Math.pow(u(),1.55)*14,l=u()*Math.PI*2,h=Math.sin(l*3+c*.5)*.3;t.set([Math.cos(l)*c,(u()-.5)*(.13+Math.pow(c/16,3)*3.5)+h,Math.sin(l)*c],a*3),o[a]=.3+Math.pow(u(),3)*1.5,n[a]=u()*6.28}const s=new Le;return s.setAttribute("position",new S(t,3)),s.setAttribute("aSize",new S(o,1)),s.setAttribute("aPhase",new S(n,1)),new ze(s,R(xt,Mt,{transparent:!0,blending:W,depthWrite:!1}))}const Rt=Et(16500);D.add(Rt);g.add(new at("#b1b9c9",1.2));const le=new Te("#ffc489",110,40,1.5);le.position.set(-3,5,5);g.add(le);const Fe=new nt("#7c9eae",3);Fe.position.set(4,5,-7);g.add(Fe);const ue=new Te("#e8b26c",55,30,1.5);ue.position.set(1,-3,1);g.add(ue);const Ve=new it({color:"#45423c",metalness:.82,roughness:.36,emissive:"#5d4023",emissiveIntensity:.055}),$=new se({color:"#99784a",transparent:!0,opacity:.55}),We=new se({color:new L("#f2c589").multiplyScalar(1.4),transparent:!0,opacity:.75}),z=new V;z.rotation.set(.38,-.26,-.35);g.add(z);function G(e,t,o,n,s=.055){const a=new pt;return a.absarc(0,0,e,o,o+n,!1),a.absarc(0,0,e-t,o+n,o,!0),a.closePath(),new mt(a,{steps:1,depth:s,bevelEnabled:!0,bevelSegments:1,bevelSize:.014,bevelThickness:.012,curveSegments:90})}const De=[];for(let e=0;e<7;e++){const t=e/7*Math.PI*2+.055,o=Math.PI*2/7-.16-u()*.1,n=new V,s=new b(G(6.85,.145,t,o,.09),Ve);n.add(s),n.add(new b(G(6.88,.012,t,o,.004),We)),n.add(new b(G(6.62,.009,t+.02,o-.04,.004),$)),n.position.z=(u()-.5)*.45,n.rotation.x=(u()-.5)*.04,z.add(n),De.push({group:n,base:n.position.z,phase:u()*6.28})}const He=new Ae(new rt(1,1,1),$,240),w=new st;for(let e=0;e<240;e++){const t=e/240*Math.PI*2,o=e%10===0,n=o?7.075:7.02;w.position.set(Math.cos(t)*n,Math.sin(t)*n,.05),w.rotation.z=t,w.scale.set(o?.19:.065,o?.014:.008,.012),w.updateMatrix(),He.setMatrixAt(e,w.matrix)}z.add(He);const N=new V;N.rotation.set(-.5,.5,.7);g.add(N);for(let e=0;e<3;e++){const t=e*2.2;N.add(new b(G(7.7,.012,t,1.65,.005),$))}const ae=new Ae(new ct(1,0),Ve,180),ne=[];for(let e=0;e<180;e++){const t=u()*Math.PI*2,o=7+u()*5;ne.push({a:t,r:o,y:(u()-.5)*4.5,scale:.025+Math.pow(u(),3)*.19,phase:u()*6.28})}g.add(ae);const de=new b(new lt(10.5,.006,3,240,Math.PI*1.25),$);de.rotation.set(1.1,-.3,.9);g.add(de);const ie=[];for(let e=0;e<3;e++){const t=new b(new Se(.98,1,192),new se({color:"#e9c797",transparent:!0,opacity:0,side:Ce,blending:W,depthWrite:!1}));g.add(t),ie.push(t)}const k=new Tt;let pe=-100,re=-100,x=null,qe,ge;function y(e){r("#toast").textContent=e,r("#toast").classList.add("visible"),clearTimeout(ge),ge=setTimeout(()=>r("#toast").classList.remove("visible"),3200)}function Ge(){pe=performance.now()/1e3,k.pulse(),y("引力涟漪，正在穿过你。")}function I(e,t=!0){i.epoch=e;const o=C[e];document.querySelectorAll("[data-epoch]").forEach(n=>{const s=Number(n.dataset.epoch)===e;n.classList.toggle("active",s),n.setAttribute("aria-pressed",String(s))}),r("#age").innerHTML=o.age,r("#temperature").innerHTML=o.temp+"<small>K</small>",r("#caption-index").textContent=`0${e+1} / 03`,r("#caption").textContent=o.caption,r("#poem").innerHTML=o.poem,r("#curvature").innerHTML=e===1?"∞<small>无限</small>":e===0?"0.97<small>临界</small>":"0.01<small>新生</small>",document.documentElement.style.setProperty("--gold",e===2?"#9acbd0":"#d9b68a"),k.setEpoch(e),t&&y(["第一纪元 · 最后的恒星","第二纪元 · 时间的尽头","第三纪元 · 另一个黎明"][e])}function me(){const e=i.paused?0:i.rate;r("#rate-label").textContent=`${e.toFixed(1)} ×`,r("#pause").setAttribute("aria-pressed",String(i.paused)),r("#pause").setAttribute("aria-label",i.paused?"继续时间":"冻结时间"),r("#pause").innerHTML=i.paused?'<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="m5 3 8 5-8 5z"/></svg>':'<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 3h2v10H4zm6 0h2v10h-2z"/></svg>',k.setRate(e)}function _e(){i.paused=!i.paused,!i.paused&&i.rate===0&&(i.rate=1,r("#time-rate").value="1"),me(),y(i.paused?"此刻，时间为你停留。":"时间，继续流淌。")}function Ie(e,t=2){x={from:d.position.clone(),to:e.clone(),start:performance.now()/1e3,duration:t}}function K(e=!0){i.journey=!1,document.body.classList.remove("journey-active","clean-ui"),m.minDistance=8.5,m.enabled=!0,m.target.set(0,0,0),Ie(ce),r("#journey").disabled=!1,e&&y("回到最后的观测站。")}async function Be(){try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen()}catch{y("当前窗口暂不支持全屏，可使用浏览器全屏模式。")}}document.querySelectorAll("[data-epoch]").forEach(e=>e.addEventListener("click",()=>I(Number(e.dataset.epoch))));r("#time-rate").addEventListener("input",e=>{i.rate=Number(e.target.value),i.paused=i.rate===0;const t=(i.rate+2)*25,o=Math.min(t,50),n=Math.max(t,50);e.target.style.background=`linear-gradient(90deg,#615a4b ${o}%,var(--gold) ${o}%,var(--gold) ${n}%,#615a4b ${n}%)`,me()});r("#pause").addEventListener("click",_e);r("#reset").addEventListener("click",()=>K());r(".brand").addEventListener("click",e=>{e.preventDefault(),K()});r("#fullscreen").addEventListener("click",Be);r("#sound").addEventListener("click",async()=>{try{i.sound=await k.toggle(),r("#sound").setAttribute("aria-pressed",String(i.sound)),r("#sound").setAttribute("aria-label",i.sound?"关闭环境音":"开启环境音"),r(".sound-label").textContent=i.sound?"声音开启":"声音关闭",y(i.sound?"戴上耳机，聆听宇宙的余音。":"宇宙重归寂静。")}catch{y("声音暂不可用，请检查浏览器的音频权限。")}});const T=r("#about-dialog");r("#about").addEventListener("click",()=>T.showModal());r("#close-about").addEventListener("click",()=>T.close());T.addEventListener("click",e=>{if(e.target===T){const t=T.getBoundingClientRect();(e.clientX<t.left||e.clientX>t.right||e.clientY<t.top||e.clientY>t.bottom)&&T.close()}});r("#capture").addEventListener("click",()=>{M.render(),E.toBlob(e=>{if(!e){y("画面保存失败，请稍后重试。");return}const t=URL.createObjectURL(e),o=document.createElement("a");o.download=`时间的尽头-${["恒星","永恒","黎明"][i.epoch]}-${new Date().toISOString().replaceAll(":","-").slice(0,19)}.png`,o.href=t,o.click(),setTimeout(()=>URL.revokeObjectURL(t),1e4),y("已留住这一瞬间。")},"image/png")});r("#journey").addEventListener("click",()=>{i.journey=!0,re=performance.now()/1e3,x=null,m.enabled=!1,r("#journey").disabled=!0,document.body.classList.add("journey-active"),pe=re,k.pulse(),y("不要害怕。光会带你去往另一边。")});E.addEventListener("dblclick",Ge);m.addEventListener("start",()=>{x=null,r("#interaction-hint").style.opacity=".25",clearTimeout(qe)});m.addEventListener("end",()=>{qe=setTimeout(()=>{r("#interaction-hint").style.opacity=""},2500)});document.addEventListener("keydown",e=>{if(T.open||e.target.matches("input, textarea, select")||e.target.isContentEditable||e.ctrlKey||e.metaKey||e.altKey)return;const t=e.key.toLowerCase();t===" "&&e.target.matches("button, a")||(t===" "&&(e.preventDefault(),_e()),(t==="r"||t==="escape")&&K(),t==="g"&&Ge(),t==="h"&&(document.body.classList.toggle("clean-ui"),y(document.body.classList.contains("clean-ui")?"纯净观测 · 按 H 恢复界面":"观测界面已恢复")),t==="f"&&Be(),["1","2","3"].includes(t)&&I(Number(t)-1))});function fe(){d.aspect=innerWidth/innerHeight,d.setViewOffset(innerWidth,innerHeight,-innerWidth*(q()?.09:.105),q()?-innerHeight*.025:0,innerWidth,innerHeight),d.fov=q()?66:43,d.updateProjectionMatrix(),p.setSize(innerWidth,innerHeight),M.setSize(innerWidth,innerHeight),v.uPixelRatio.value=p.getPixelRatio()}window.addEventListener("resize",fe);E.addEventListener("webglcontextlost",e=>{e.preventDefault(),r("#fallback").hidden=!1});E.addEventListener("webglcontextrestored",()=>location.reload());fe();me();const ye=new L,we=new L,be=new B,H=new B,xe=new B;let _=performance.now()/1e3,Z=_,ee=0;function Oe(){if(requestAnimationFrame(Oe),document.hidden){_=performance.now()/1e3;return}const e=performance.now()/1e3,t=Math.min(e-_,.075);_=e,i.paused||(i.time+=t*i.rate);const o=i.time;v.uTime.value=o;const n=1-Math.exp(-t*1.7);ye.set(C[i.epoch].color),we.set(C[i.epoch].secondary),v.uColor.value.lerp(ye,n),v.uSecondary.value.lerp(we,n),v.uEpoch.value=J.lerp(v.uEpoch.value,i.epoch,n),te.strength=J.lerp(te.strength,C[i.epoch].bloom*.72,n),le.color.copy(v.uSecondary.value),ue.color.copy(v.uColor.value),We.color.copy(v.uColor.value).multiplyScalar(1.2);const s=e-pe;i.pulse=s>0&&s<5?Math.exp(-s*.8)*Math.sin(Math.min(s*2,Math.PI)):0,v.uPulse.value=Math.max(0,i.pulse);for(let a=0;a<ie.length;a++){const c=s-a*.33,l=ie[a];l.visible=c>0&&c<4,l.visible&&(l.quaternion.copy(d.quaternion),l.scale.setScalar(2.3+c*5.5),l.material.opacity=Math.max(0,.25*(1-c/4)),l.material.color.copy(v.uSecondary.value))}oe.quaternion.copy(d.quaternion),be.copy(d.position).normalize().multiplyScalar(.3),oe.position.copy(be),ke.rotation.y=o*.025,z.rotation.z=-.35+o*.009,z.rotation.y=-.26+Math.sin(o*.045)*.06,N.rotation.z=.7-o*.012,de.rotation.z=.9+o*.003,Re.rotation.y=o*4e-4;for(const a of De)a.group.position.z=a.base+Math.sin(o*.2+a.phase)*.07;for(let a=0;a<ne.length;a++){const c=ne[a],l=c.a+o*.012/(c.r*.1),h=c.r*(1+i.pulse*.07);w.position.set(Math.cos(l)*h,c.y+Math.sin(c.phase+o*.15)*.15,Math.sin(l)*h*.5),w.rotation.set(c.phase+o*.06,l,o*.03+c.phase),w.scale.set(c.scale,c.scale*1.6,c.scale*.65),w.updateMatrix(),ae.setMatrixAt(a,w.matrix)}if(ae.instanceMatrix.needsUpdate=!0,x){const a=Math.min((e-x.start)/x.duration,1),c=a*a*(3-2*a);d.position.lerpVectors(x.from,x.to,c),a===1&&(x=null)}if(i.journey){const a=e-re;if(a<5){const c=Math.min(a/5,1),l=J.lerp(23.5,3.1,c*c),h=a*.11;d.position.set(Math.sin(h)*l*.5,(1-c)*5.9+.35,Math.cos(h)*l),d.lookAt(0,0,0),r("#flash").style.opacity=String(Math.max(0,(c-.86)/.14))}else a<5.15?(I((i.epoch+1)%3,!1),i.journey=!1,d.position.set(-2,2.5,10),r("#flash").style.opacity="0",document.body.classList.remove("journey-active"),m.enabled=!0,r("#journey").disabled=!1,Ie(ce,3),y("你穿过了终点。欢迎来到另一段时间。")):(I((i.epoch+1)%3,!1),r("#flash").style.opacity="0",K(!1))}i.journey||m.update(),d.updateMatrixWorld(),H.set(0,0,0).project(d),xe.setFromMatrixColumn(d.matrixWorld,0).multiplyScalar(2.17).project(d),F.uniforms.uCenter.value.set(H.x*.5+.5,H.y*.5+.5),F.uniforms.uRadius.value=Math.abs(xe.x-H.x)*.5*d.aspect,F.uniforms.uAspect.value=d.aspect,F.uniforms.uDark.value=Math.max(0,1-Math.abs(v.uEpoch.value-1)*1.4),p.info.reset(),M.render(),i.frames++,ee++,e-Z>1.5&&(i.fps=Math.round(ee/(e-Z)),ee=0,Z=e,i.frames>120&&i.fps<28&&p.getPixelRatio()>1&&(p.setPixelRatio(Math.max(1,p.getPixelRatio()-.25)),M.setPixelRatio(p.getPixelRatio()),fe())),!i.ready&&i.frames>=3&&(i.ready=!0,r("#loading").classList.add("loaded"),document.documentElement.dataset.ready="true")}Oe();window.__universe={getState:()=>({...i,camera:d.position.toArray(),target:m.target.toArray(),pixelRatio:p.getPixelRatio(),drawCalls:p.info.render.calls,geometries:p.info.memory.geometries,webgl:p.capabilities.isWebGL2?2:1,audio:k.getState()})};
