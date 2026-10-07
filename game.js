(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2);
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0)}addEventListener("resize",resize);resize();

const $=id=>document.getElementById(id), screens={loading:$("loading"),menu:$("menu"),panel:$("panel"),hud:$("hud"),pause:$("pause"),result:$("result")};
const state={level:1,coins:0,score:0,unlocked:1,character:"doge",theme:0,music:true,sfx:true,running:false,paused:false,won:false};
try{Object.assign(state,JSON.parse(localStorage.getItem("ddq-save")||"{}"))}catch{}
function save(){localStorage.setItem("ddq-save",JSON.stringify({...state,running:false,paused:false}))}
const themes=[
 {name:"Bright Cartoon Forest",sky:["#79dfff","#d9fbff"],ground:"#6b9b58",accent:"#8be27a"},
 {name:"Magical Crystal Night",sky:["#151a52","#5f52aa"],ground:"#4b4383",accent:"#7eeaff"},
 {name:"Fiery Volcano World",sky:["#261329","#d34e35"],ground:"#5b3431",accent:"#ffb13b"}
];
const levels=Array.from({length:8},(_,i)=>({name:["Doge's Beginning","Much Forest","Crystal Adventure","Night Sky Quest","Dragon Awakening","Volcano Run","Much Dangerous Mountain","Final Dragon Castle"][i],theme:i<3?0:i<5?1:2,difficulty:1+i*.35,boss:i===3||i===6||i===7}));
const chars={
 doge:{name:"Classic Doge",emoji:"🐶",desc:"Balanced hero. Bark, bite and double jump.",speed:4.4,jump:10,health:100},
 dragon:{name:"Doge Dragon",emoji:"🐲",desc:"Flies and breathes powerful fire.",speed:4.9,jump:9,health:130},
 explorer:{name:"Explorer Doge",emoji:"🦊",desc:"Fast and excellent at collecting coins.",speed:5.5,jump:11,health:90},
 magic:{name:"Magic Doge",emoji:"🧙",desc:"Shield and magical ranged attacks.",speed:4.1,jump:10,health:110}
};
let player,enemies=[],coins=[],particles=[],platforms=[],projectiles=[],texts=[],camera=0,last=0,keys={},touch={left:false,right:false};
const worldWidth=4200;
function resetLevel(){
 const L=levels[state.level-1];state.theme=L.theme;
 player={x:130,y:280,vx:0,vy:0,w:55,h:65,onGround:false,air:0,health:chars[state.character].health,max:chars[state.character].health,attack:0,fire:0,transform:state.character==="dragon",inv:0,checkpoint:130,fly:false};
 platforms=[{x:-100,y:420,w:4700,h:160},{x:420,y:340,w:210,h:25},{x:760,y:285,w:220,h:25},{x:1100,y:350,w:240,h:25},{x:1450,y:270,w:190,h:25},{x:1770,y:350,w:280,h:25},{x:2160,y:285,w:240,h:25},{x:2500,y:350,w:260,h:25},{x:2900,y:275,w:240,h:25},{x:3260,y:340,w:260,h:25},{x:3650,y:280,w:250,h:25}];
 enemies=[];coins=[];particles=[];projectiles=[];texts=[];
 for(let x=380;x<3900;x+=260){if(Math.random()<.78) enemies.push({x,y:355-Math.random()*85,w:48,h:48,hp:30+state.level*8,vx:(Math.random()<.5?-1:1)*(.5+Math.random()),kind:Math.random()<.18?"fly":"slime",hit:0})}
 for(let x=250;x<4050;x+=150) coins.push({x,y:Math.random()<.5?310:380,r:10,t:Math.random()*7,col:false});
 if(L.boss) enemies.push({x:3850,y:210,w:115,h:130,hp:260+state.level*45,vx:0,kind:"boss",hit:0});
}
function show(name){Object.values(screens).forEach(s=>s.classList.add("hidden"));screens[name].classList.remove("hidden");if(name==="menu")screens.menu.classList.add("active")}
function toast(t){const e=$("toast");e.textContent=t;e.style.opacity=1;e.style.transform="translate(-50%,0)";clearTimeout(toast.t);toast.t=setTimeout(()=>{e.style.opacity=0;e.style.transform="translate(-50%,-8px)"},1100)}
function addText(t,x,y){texts.push({t,x,y,a:1})}
function burst(x,y,color="#fff",n=14){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*6,vy:(Math.random()-.7)*6,a:1,s:3+Math.random()*5,c:color})}
function jump(){if(!state.running||state.paused)return;if(player.onGround||player.air<2){player.vy=-chars[state.character].jump;player.onGround=false;player.air++;burst(player.x+25,player.y+55,"#fff",8)}}
function melee(){if(!state.running||state.paused||player.attack>0)return;player.attack=.28;burst(player.x+30+(player.vx>=0?40:-20),player.y+30,"#fff",7)}
function fire(){if(!state.running||state.paused||state.character!=="dragon")return;player.fire=.18;projectiles.push({x:player.x+45,y:player.y+28,vx:9,r:12,life:1,charge:false});burst(player.x+50,player.y+28,"#ffb52e",8)}
function update(dt){
 if(!state.running||state.paused)return;
 const c=chars[state.character],dir=(keys.ArrowRight||keys.d||touch.right?1:0)-(keys.ArrowLeft||keys.a||touch.left?1:0);
 player.vx+=(dir*c.speed-player.vx)*Math.min(1,dt*12);
 if(player.transform){player.vy+=(keys.Space||keys.w||keys.ArrowUp?-2.5:0);player.vy=Math.max(-5,Math.min(5,player.vy+dt*5))}
 else player.vy+=dt*25;
 player.x+=player.vx;player.y+=player.vy;
 if(!player.transform){let ground=null;for(const p of platforms)if(player.x+40>p.x&&player.x+10<p.x+p.w&&player.y+player.h>=p.y&&player.y+player.h<=p.y+35&&player.vy>=0){ground=p;break}if(ground){player.y=ground.y-player.h;player.vy=0;player.onGround=true;player.air=0}else player.onGround=false}
 player.x=Math.max(20,Math.min(worldWidth-100,player.x));player.inv=Math.max(0,player.inv-dt);player.attack=Math.max(0,player.attack-dt);player.fire=Math.max(0,player.fire-dt);
 if(player.y>620){player.x=player.checkpoint;player.y=250;player.health-=20;toast("Ouch! Checkpoint!");}
 if(player.health<=0){gameOver();return}
 for(const e of enemies){
  e.x+=e.vx*dt*60;e.hit=Math.max(0,e.hit-dt);
  if(e.kind!=="boss"&&Math.abs(e.x-player.x)<170)e.vx+=(player.x>e.x?1:-1)*.02;
  if(Math.abs(e.x-player.x)<50&&Math.abs(e.y-player.y)<60&&player.inv<=0){player.health-=e.kind==="boss"?18:8;player.inv=.8;burst(player.x,player.y,"#ff6d7d",10)}
 }
 if(player.attack>0){for(const e of enemies)if(Math.abs(e.x-player.x)<90&&Math.abs(e.y-player.y)<75&&e.hit<=0){e.hp-=35;e.hit=.25;burst(e.x,e.y,"#fff",10);addText("-35",e.x,e.y)}}
 for(const p of projectiles){p.x+=p.vx*dt*60;p.life-=dt;for(const e of enemies)if(p.life>0&&Math.abs(e.x-p.x)<70&&Math.abs(e.y-p.y)<75){e.hp-=55; p.life=0;burst(p.x,p.y,"#ff8a30",20);addText("MUCH FIRE!",e.x,e.y-25)}}
 projectiles=projectiles.filter(p=>p.life>0);
 enemies=enemies.filter(e=>{if(e.hp<=0){state.score+=e.kind==="boss"?1000:100;burst(e.x,e.y,e.kind==="boss"?"#ff9c4a":"#fff",25);addText(e.kind==="boss"?"BOSS DEFEAT!":"Very Defeat!",e.x,e.y);if(e.kind==="boss"){win();return false}return false}return true});
 for(const c0 of coins)if(!c0.col&&Math.abs(c0.x-player.x)<45&&Math.abs(c0.y-player.y)<60){c0.col=true;state.coins++;state.score+=10;burst(c0.x,c0.y,"#ffe76a",12);addText("Much Coin!",c0.x,c0.y-10)}
 if(player.x>3500)player.checkpoint=Math.max(player.checkpoint,3500);
 camera+=(player.x-W*.35-camera)*Math.min(1,dt*5);camera=Math.max(0,Math.min(worldWidth-W,camera));
 for(const p of particles){p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.vy+=dt*8;p.a-=dt*1.8}
 particles=particles.filter(p=>p.a>0);for(const t of texts){t.y-=dt*20;t.a-=dt}texts=texts.filter(t=>t.a>0);
 $("hp").style.width=Math.max(0,player.health/player.max*100)+"%";$("coins").textContent=state.coins;$("score").textContent=state.score;
}
function draw(){
 const th=themes[state.theme],g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,th.sky[0]);g.addColorStop(1,th.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 drawParallax(th);
 ctx.save();ctx.translate(-camera,0);
 for(const p of platforms)drawPlatform(p,th);
 for(const c of coins)if(!c.col)drawCoin(c);
 for(const e of enemies)drawEnemy(e);
 for(const p of projectiles)drawFireball(p);
 drawPlayer();
 for(const p of particles){ctx.globalAlpha=p.a;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
 for(const t of texts){ctx.globalAlpha=t.a;ctx.fillStyle="#fff";ctx.font="900 16px system-ui";ctx.textAlign="center";ctx.fillText(t.t,t.x,t.y);ctx.globalAlpha=1}
 ctx.restore();
}
function drawParallax(th){for(let layer=0;layer<3;layer++){ctx.globalAlpha=.12+.08*layer;ctx.fillStyle=th.accent;const off=(-camera*(.12+layer*.1))%180;for(let x=off-180;x<W+200;x+=180){const h=100+layer*45;ctx.beginPath();ctx.arc(x+70,H-70,90+layer*25,Math.PI,0);ctx.fill()}ctx.globalAlpha=1}}
function drawPlatform(p,th){const y=p.y;ctx.fillStyle="rgba(0,0,0,.18)";ctx.fillRect(p.x+8,y+8,p.w,p.h);ctx.fillStyle=th.ground;roundRect(p.x,y,p.w,p.h,14);ctx.fill();ctx.fillStyle=th.accent;roundRect(p.x,y,p.w,10,8);ctx.fill()}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function drawCoin(c){ctx.save();ctx.translate(c.x,c.y+Math.sin(performance.now()/250+c.t)*4);ctx.fillStyle="#ffd95a";ctx.shadowBlur=18;ctx.shadowColor="#ffe878";ctx.beginPath();ctx.ellipse(0,0,c.r,c.r*.75,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#fff4ad";ctx.font="bold 12px system-ui";ctx.textAlign="center";ctx.fillText("$",0,4);ctx.restore()}
function drawPlayer(){const ch=chars[state.character];ctx.save();ctx.translate(player.x+27,player.y+33);if(player.vx<0)ctx.scale(-1,1);if(player.inv>0&&Math.floor(player.inv*12)%2)ctx.globalAlpha=.35;
 ctx.shadowBlur=18;ctx.shadowColor=state.character==="dragon"?"#ff9d35":"rgba(0,0,0,.3)";
 ctx.fillStyle=state.character==="dragon"?"#e98242":"#d89a55";ctx.beginPath();ctx.ellipse(0,5,27,30,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=state.character==="dragon"?"#ffb75c":"#b8793e";ctx.beginPath();ctx.moveTo(-22,-18);ctx.lineTo(-30,-48);ctx.lineTo(-5,-28);ctx.fill();ctx.beginPath();ctx.moveTo(22,-18);ctx.lineTo(30,-48);ctx.lineTo(5,-28);ctx.fill();
 ctx.shadowBlur=0;ctx.fillStyle="#111";ctx.beginPath();ctx.arc(-9,-1,4,0,7);ctx.arc(9,-1,4,0,7);ctx.fill();ctx.fillStyle="#49302b";ctx.beginPath();ctx.arc(0,10,7,0,7);ctx.fill();ctx.fillStyle="#fff";ctx.font="700 10px system-ui";ctx.textAlign="center";ctx.fillText(ch.emoji,0,-42);
 if(state.character==="dragon"){ctx.strokeStyle="#ffdb5c";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(20,-4);ctx.lineTo(45,-20);ctx.stroke();ctx.beginPath();ctx.moveTo(20,5);ctx.lineTo(45,20);ctx.stroke()}
 if(player.attack>0){ctx.strokeStyle="#fff";ctx.lineWidth=6;ctx.beginPath();ctx.arc(28,0,35,-1.1,1.1);ctx.stroke()}ctx.restore()}
function drawEnemy(e){ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2);ctx.fillStyle=e.kind==="boss"?"#6f2d78":e.kind==="fly"?"#4b8bd9":"#65b86b";ctx.shadowBlur=e.kind==="boss"?28:12;ctx.shadowColor=e.kind==="boss"?"#d15cff":"rgba(0,0,0,.2)";roundRect(-e.w/2,-e.h/2,e.w,e.h,18);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#17172a";ctx.beginPath();ctx.arc(-10,-5,4,0,7);ctx.arc(10,-5,4,0,7);ctx.fill();ctx.fillStyle="#fff";ctx.font=e.kind==="boss"?"38px serif":"25px serif";ctx.textAlign="center";ctx.fillText(e.kind==="boss"?"👑":e.kind==="fly"?"🦇":"👾",0,7);if(e.kind==="boss"){ctx.fillStyle="#111";ctx.fillRect(-55,-82,110,8);ctx.fillStyle="#ff5c68";ctx.fillRect(-55,-82,110*Math.max(0,e.hp/(260+state.level*45)),8)}ctx.restore()}
function drawFireball(p){ctx.save();ctx.translate(p.x,p.y);ctx.shadowBlur=25;ctx.shadowColor="#ff6b2b";ctx.fillStyle="#ffb72e";ctx.beginPath();ctx.arc(0,0,p.r,0,7);ctx.fill();ctx.fillStyle="#fff2a8";ctx.beginPath();ctx.arc(-3,-3,p.r*.45,0,7);ctx.fill();ctx.restore()}
function start(){state.running=true;state.paused=false;state.won=false;resetLevel();screens.menu.classList.add("hidden");screens.panel.classList.add("hidden");screens.result.classList.add("hidden");screens.pause.classList.add("hidden");screens.hud.classList.remove("hidden");}
function gameOver(){state.running=false;$("resultIcon").textContent="💥";$("resultTitle").textContent="VERY DEFEAT!";$("resultStats").textContent="Doge needs another try. Score: "+state.score;screens.result.classList.remove("hidden");save()}
function win(){state.running=false;state.unlocked=Math.max(state.unlocked,Math.min(8,state.level+1));save();$("resultIcon").textContent="🏆";$("resultTitle").textContent="WOW! LEVEL COMPLETE!";$("resultStats").textContent=`Level ${state.level}: ${levels[state.level-1].name} • 🪙 ${state.coins} • ⭐ ${state.score}`;screens.result.classList.remove("hidden")}
function openPanel(type){
 screens.menu.classList.add("hidden");screens.panel.classList.remove("hidden");const c=$("panelContent");
 if(type==="characters"){c.innerHTML=`<h2>Characters</h2><div class="grid">${Object.entries(chars).map(([id,v])=>`<div class="choice ${state.character===id?"selected":""}" data-char="${id}"><b>${v.emoji} ${v.name}</b><span>${v.desc}</span></div>`).join("")}</div>`;c.querySelectorAll("[data-char]").forEach(e=>e.onclick=()=>{const id=e.dataset.char;if((id==="dragon"&&state.unlocked<3)||(id==="explorer"&&state.unlocked<2)||(id==="magic"&&state.unlocked<5)){toast("Unlock it by playing more!");return}state.character=id;save();openPanel("characters")})}
 if(type==="levels"){c.innerHTML=`<h2>Level Select</h2><div class="grid">${levels.map((v,i)=>`<div class="choice ${state.level===i+1?"selected":""}" data-level="${i+1}"><b>${i+1}. ${v.name}</b><span>${i+1<=state.unlocked?"Unlocked":"🔒 Locked"} • ${v.boss?"Boss level":themes[v.theme].name}</span></div>`).join("")}</div>`;c.querySelectorAll("[data-level]").forEach(e=>e.onclick=()=>{const n=+e.dataset.level;if(n<=state.unlocked){state.level=n;save();start()}})}
 if(type==="themes"){c.innerHTML=`<h2>World Themes</h2>${themes.map((v,i)=>`<div class="choice ${state.theme===i?"selected":""}" data-theme="${i}"><b>${i===0?"🌳":i===1?"💎":"🌋"} ${v.name}</b><span>${i===state.theme?"Current world":"Used by story levels"}</span></div>`).join("")}`}
 if(type==="settings"){c.innerHTML=`<h2>Settings</h2><button id="music">Music: ${state.music?"ON":"OFF"}</button><button id="sfx">Sound Effects: ${state.sfx?"ON":"OFF"}</button><button id="install">INSTALL APP</button><button id="reset">RESET ALL PROGRESS</button><p style="opacity:.65">Offline-first PWA • Core gameplay works without an API.</p><div class="credit">Developer by Muhammed Usman</div>`;$("music").onclick=()=>{state.music=!state.music;save();openPanel("settings")};$("sfx").onclick=()=>{state.sfx=!state.sfx;save();openPanel("settings")};$("reset").onclick=()=>{if(confirm("Reset all progress?")){localStorage.removeItem("ddq-save");location.reload()}};$("install").onclick=installApp}
}
let deferredPrompt=null;addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e});async function installApp(){if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else toast("Use your browser's Add to Home Screen")}
document.addEventListener("click",e=>{const a=e.target.closest("[data-action]");if(!a)return;const x=a.dataset.action;
 if(x==="play"){state.level=Math.min(state.level,state.unlocked);start()}
 else if(x==="characters"||x==="levels"||x==="themes"||x==="settings")openPanel(x)
 else if(x==="menu"){state.running=false;screens.panel.classList.add("hidden");screens.pause.classList.add("hidden");screens.result.classList.add("hidden");screens.hud.classList.add("hidden");screens.menu.classList.remove("hidden");save()}
 else if(x==="pause"){state.paused=true;screens.pause.classList.remove("hidden")}
 else if(x==="resume"){state.paused=false;screens.pause.classList.add("hidden")}
 else if(x==="restart"){screens.pause.classList.add("hidden");screens.result.classList.add("hidden");start()}
 else if(x==="next"){state.level=Math.min(8,state.level+1);start()}
});
function bindHold(id,prop){const b=$(id);["pointerdown","touchstart"].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();touch[prop]=true}));["pointerup","pointercancel","pointerleave","touchend"].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();touch[prop]=false}))}
bindHold("left","left");bindHold("right","right");$("jump").addEventListener("pointerdown",jump);$("attack").addEventListener("pointerdown",melee);$("fire").addEventListener("pointerdown",fire);
addEventListener("keydown",e=>{keys[e.key]=true;if(e.key===" "||e.key==="ArrowUp")jump();if(["j","z"].includes(e.key.toLowerCase()))melee();if(["k","x"].includes(e.key.toLowerCase()))fire();if(e.key==="Escape"&&state.running){state.paused=!state.paused;screens.pause.classList.toggle("hidden",!state.paused)}});addEventListener("keyup",e=>keys[e.key]=false);
function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
function boot(){let n=0;const start=performance.now();const timer=setInterval(()=>{n=Math.min(100,n+2.2);$("progress").style.width=n+"%";$("loadText").textContent=n<35?"Much Wow Loading…":n<70?"Waking the Dragon…":"Preparing Adventure…";if(performance.now()-start>=5000){clearInterval(timer);screens.loading.classList.add("hidden");screens.menu.classList.remove("hidden");}},100);if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{})}
boot();
})();