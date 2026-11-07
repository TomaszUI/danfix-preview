/* DANFIX: spring-driven light particles. No dependencies or external assets. */
(() => {
  'use strict';
  const canvas = document.getElementById('danfixParticles');
  if (!canvas) return;
  const host = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const trigger = document.getElementById('energyTrigger');
  if (!ctx || !trigger) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const palette = ['#e1f9ff', '#68d6ff', '#21f4dc', '#378eff'];
  let width = 0, height = 0, points = [], stars = [], frame = 0, last = 0;
  let hovering = false, burstUntil = 0, waveAt = -10000, introAt = 0;
  let visible = true, initialized = false, reduced = motion.matches;
  let wordLight = null, energy = 0, settled = 1, sparks = [];
  let chargeUntil = 0, pendingBlast = false, wasActive = false, recallAt = -10000;
  const pointer = { x: -1000, y: -1000 };
  const random = (a, b) => a + Math.random() * (b - a);
  const glows = palette.map(color => {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const g = sprite.getContext('2d');
    const gradient = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(.12, color);
    gradient.addColorStop(.35, color + '60');
    gradient.addColorStop(1, color + '00');
    g.fillStyle = gradient; g.fillRect(0, 0, 32, 32);
    return sprite;
  });

  function layout() {
    const rect = host.getBoundingClientRect();
    width = rect.width; height = rect.height;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mask = document.createElement('canvas');
    mask.width = Math.ceil(width); mask.height = Math.ceil(height);
    const m = mask.getContext('2d', { willReadFrequently: true });
    let size = Math.min(width * .22, height * .3, 140);
    m.font = `900 ${size}px Arial,sans-serif`;
    size *= width * .88 / m.measureText('DANFIX').width;
    m.font = `900 ${size}px Arial,sans-serif`;
    m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillStyle = '#fff';
    const cy = height * .46;
    m.fillText('DANFIX', width / 2, cy);
    const pixels = m.getImageData(0, 0, mask.width, mask.height).data;
    wordLight = document.createElement('canvas');
    wordLight.width = mask.width; wordLight.height = mask.height;
    const light = wordLight.getContext('2d');
    const ink = light.createLinearGradient(width*.08,0,width*.92,0);
    ink.addColorStop(0,'#e5faff');ink.addColorStop(.48,'#8edfff');
    ink.addColorStop(.53,'#2affdf');ink.addColorStop(1,'#3edcff');
    light.font=m.font;light.textAlign='center';light.textBaseline='middle';
    light.fillStyle=ink;light.shadowColor='#27cfe8';light.shadowBlur=18;
    light.fillText('DANFIX',width/2,cy);
    const step = width < 400 ? 2 : 2.5;
    points = [];
    for (let y = 0; y < mask.height; y += step) {
      for (let x = 0; x < mask.width; x += step) {
        if (pixels[(Math.floor(y) * mask.width + Math.floor(x)) * 4 + 3] < 170) continue;
        const angle = Math.atan2(y - cy, (x - width / 2) * .75) + random(-.85, .85);
        const radius = random(.07, .46);
        const color = x < width * .51 ? (Math.random() < .75 ? 0 : 1) : (Math.random() < .8 ? 2 : 3);
        const theta = angle + random(-1.25,1.25);
        const tx = width / 2 + Math.cos(theta) * width * radius;
        const ty = cy + Math.sin(theta) * height * radius * .9;
        points.push({ bx:x, by:y, x, y, vx:0, vy:0, tx, ty, angle,
          color, size:random(.9, 1.3), phase:random(0, Math.PI * 2), depth:random(.5, 1.5), z:random(-1,1), arm:Math.floor(random(0,3)) });
      }
    }
    stars = Array.from({ length: width < 400 ? 34 : 55 }, () => ({
      x:random(15,width-15), y:random(55,height-75), phase:random(0,7), size:random(.35,1.1)
    }));
    if (!initialized && !reduced) {
      introAt = performance.now();
      points.forEach(p => { p.x=p.tx; p.y=p.ty; });
    }
    initialized = true;
    draw(performance.now());
    start();
  }

  function explode(now = performance.now()) {
    if (reduced) return;
    if (pendingBlast) return;
    chargeUntil = now + 280;
    pendingBlast = true;
    host.classList.add('is-charging');
    start();
  }

  function launch(now) {
    pendingBlast = false;
    host.classList.remove('is-charging');
    waveAt = now;
    sparks = Array.from({length:width<400?32:58},()=>({
      angle:random(0,Math.PI*2),speed:random(.25,.85),length:random(8,34),color:Math.random()<.5?1:2
    }));
    points.forEach(p => {
      const force = random(8, 23) * Math.min(width / 500, 1.2);
      p.vx += Math.cos(p.angle) * force;
      p.vy += Math.sin(p.angle) * force * .7;
    });
    start();
  }

  function draw(now) {
    const dt = Math.min((now - last) / 16.667 || 1, 2);
    last = now;
    const active = !reduced && (hovering || now < burstUntil);
    if(pendingBlast && !active){pendingBlast=false;host.classList.remove('is-charging');}
    if(pendingBlast && now>=chargeUntil)launch(now);
    const charging=pendingBlast && active;
    const charge=charging?Math.max(0,1-(chargeUntil-now)/280):0;
    if(wasActive && !active)recallAt=now;
    if(wasActive!==active)host.classList.toggle('is-energized',active);
    wasActive=active;
    const intro = !reduced && introAt && now - introAt < 150;
    const time = reduced ? 0 : now * .001;
    energy += ((active&&!charging?1:0)-energy) * Math.min(1,dt*.07);
    if(reduced)energy=0;
    ctx.clearRect(0, 0, width, height);
    // A luminous core opens into a three-dimensional particle cloud.
    if(energy>.01){
      const core=ctx.createRadialGradient(width/2,height*.46,0,width/2,height*.46,width*.48);
      core.addColorStop(0,'#d2ffff12');core.addColorStop(.2,'#21e9df1c');
      core.addColorStop(.6,'#1476e310');core.addColorStop(1,'#1476e300');
      ctx.globalAlpha=energy;ctx.fillStyle=core;ctx.fillRect(0,0,width,height);ctx.globalAlpha=1;
    }
    // Quiet orbital traces give the light a sense of depth.
    ctx.save();
    ctx.translate(width / 2, height * .46);
    ctx.rotate(-.18);
    ctx.strokeStyle = '#4ac3df18'; ctx.lineWidth = .7;
    for (let i=0; i<2; i++) {
      ctx.beginPath(); ctx.ellipse(0,0,width*(.41+i*.08),height*(.2+i*.075),0,0,Math.PI*2); ctx.stroke();
    }
    if(!reduced){
      ctx.strokeStyle='#50dfee';ctx.globalAlpha=.2+energy*.45;ctx.lineWidth=1;
      for(let i=0;i<3;i++){
        const a=time*(.18+energy*.35)+i*Math.PI*.7;
        ctx.beginPath();ctx.ellipse(0,0,width*.43,height*.24,0,a,a+.15+energy*.2);ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
    ctx.restore();
    for (const s of stars) {
      ctx.globalAlpha = .22 + .2 * Math.sin(time * .7 + s.phase);
      ctx.fillStyle = '#78d8f6';
      ctx.fillRect(s.x, s.y + (reduced ? 0 : Math.sin(time*.3+s.phase)*5), s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // Converging charge lines lead into the burst, rather than a white flash.
    if(charging){
      ctx.save();ctx.globalCompositeOperation='lighter';
      ctx.strokeStyle='#8cfff0';ctx.lineWidth=1;ctx.globalAlpha=charge*.7;
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        const r=width*(.44-charge*.16);
        ctx.beginPath();ctx.moveTo(width/2+Math.cos(a)*r,height*.46+Math.sin(a)*r*.55);
        ctx.lineTo(width/2+Math.cos(a)*(r+18),height*.46+Math.sin(a)*(r+18)*.55);ctx.stroke();
      }
      ctx.restore();
    }

    const age = (now - waveAt) / 1000;
    if (!reduced && age >= 0 && age < 1.15) {
      const progress = age / 1.15;
      const r = (1 - Math.pow(1-progress,3)) * width * .72;
      ctx.save(); ctx.translate(width/2,height*.46);
      ctx.scale(1,.65); ctx.globalAlpha=(1-progress)*.6;
      ctx.strokeStyle='#8cffff';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=(1-progress)*.16;ctx.lineWidth=12;
      ctx.stroke();ctx.restore();
      // Two tilted wave fronts expand through the depth of the scene.
      ctx.save();ctx.translate(width/2,height*.46);ctx.rotate(-.4);
      ctx.strokeStyle='#35ffe3';ctx.globalAlpha=(1-progress)*.45;ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(0,0,r*.85,r*.28,0,0,Math.PI*2);ctx.stroke();
      ctx.rotate(.85);ctx.globalAlpha=(1-progress)*.24;
      ctx.beginPath();ctx.ellipse(0,0,r*.95,r*.36,0,0,Math.PI*2);ctx.stroke();ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      for(const spark of sparks){
        const travel=width*spark.speed*(1-Math.pow(1-progress,2));
        const sx=width/2+Math.cos(spark.angle)*travel;
        const sy=height*.46+Math.sin(spark.angle)*travel*.65;
        ctx.globalAlpha=Math.pow(1-progress,2)*.75;
        ctx.strokeStyle=palette[spark.color];ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(sx,sy);
        ctx.lineTo(sx-Math.cos(spark.angle)*spark.length*(1-progress),sy-Math.sin(spark.angle)*spark.length*(1-progress)*.65);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Three comet heads trace the same tilted vortex as the particle arms.
    if(energy>.05){
      ctx.save();ctx.translate(width/2,height*.46);ctx.rotate(-.4);
      ctx.globalCompositeOperation='lighter';
      for(let arm=0;arm<3;arm++){
        const a=time*.55+arm*Math.PI*2/3;
        for(let tail=0;tail<16;tail++){
          const t=a-tail*.028, r=width*.34;
          const size=tail===0?22:Math.max(3,11-tail*.5);
          ctx.globalAlpha=energy*(1-tail/16)*.7;
          ctx.drawImage(glows[arm===0?0:2],Math.cos(t)*r-size/2,Math.sin(t)*r*.42-size/2,size,size);
        }
      }
      ctx.restore();
    }

    if(wordLight){
      ctx.globalAlpha=(reduced?1:settled)*(1-energy)*(.65+charge*.3);
      const scale=1-charge*.1;
      ctx.save();ctx.translate(width/2,height*.46);ctx.scale(scale,scale);
      ctx.drawImage(wordLight,-width/2,-height*.46);ctx.restore();ctx.globalAlpha=1;
    }

    const damping = Math.pow(active ? .86 : .8, dt);
    let displacement=0;
    const blastAge=(now-waveAt)/1000;
    const vortex=Math.min(1,Math.max(0,(blastAge-.25)/1.3));
    const turn=time*.32, cosine=Math.cos(turn), sine=Math.sin(turn);
    for (const p of points) {
      const ox=p.x, oy=p.y;
      if (reduced) { p.x=p.bx; p.y=p.by; p.vx=p.vy=0; }
      else if (!intro) {
        const dx3=p.tx-width/2, z3=p.z*width*.28;
        const rx=dx3*cosine+z3*sine;
        const rz=-dx3*sine+z3*cosine;
        const perspective=1+rz/width*.48;
        let tx=active ? width/2+rx*perspective+Math.sin(time+p.phase)*8 : p.bx;
        let ty=active ? height*.46+(p.ty-height*.46)*perspective+Math.cos(time*.6+p.phase)*12 : p.by;
        if(active && !charging){
          const radius=width*(.1+(p.z+1)*.135);
          const a=time*.55+p.arm*Math.PI*2/3+(p.z+1)*1.8+p.phase*.14;
          const gx=Math.cos(a)*radius,gy=Math.sin(a)*radius*.42+Math.sin(p.phase*3+time)*height*.025;
          const vx=gx*.921+gy*.389,vy=-gx*.389+gy*.921;
          tx+=(width/2+vx-tx)*vortex;
          ty+=(height*.46+vy-ty)*vortex;
        }
        if(charging){tx=width/2+(p.bx-width/2)*(1-charge*.1);ty=height*.46+(p.by-height*.46)*(1-charge*.1);}
        if (active && !charging) {
          const dx=tx-pointer.x, dy=ty-pointer.y, d=Math.hypot(dx,dy);
          if (d>0 && d<85) { tx+=dx/d*(85-d)*.6; ty+=dy/d*(85-d)*.6; }
        }
        const spring=charging?.09:active?.024:.055;
        p.vx=(p.vx+(tx-p.x)*spring*dt)*damping;
        p.vy=(p.vy+(ty-p.y)*spring*dt)*damping;
        p.x+=p.vx*dt;p.y+=p.vy*dt;
      }
      const speed=Math.hypot(p.vx,p.vy);
      displacement+=Math.abs(p.x-p.bx)+Math.abs(p.y-p.by);
      ctx.fillStyle=palette[p.color];
      ctx.globalAlpha=active?.8:1;
      // Sparse luminous cores, crisp typography at rest.
      if (active || speed>1.5) {
        if (speed>1.1) {
          ctx.strokeStyle=palette[p.color];ctx.lineWidth=p.size*.7;
          ctx.globalAlpha=Math.min(.58,speed*.05);
          const trail=Math.min(1,9/Math.max(1,speed));
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(ox-p.vx*trail,oy-p.vy*trail);ctx.stroke();
        }
        ctx.globalAlpha=.48;
        const size=p.size*(6+p.depth*4);
        ctx.drawImage(glows[p.color],p.x-size/2,p.y-size/2,size,size);
      }
      ctx.globalAlpha=active?.72+Math.sin(time*2+p.phase)*.2:.93;
      ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size*1.5,p.size*1.5);
    }
    settled=1-Math.min(1,displacement/Math.max(1,points.length)/22);
    ctx.globalAlpha=1;
    const recall=(now-recallAt)/1000;
    if(!reduced && !active && recall>=0 && recall<1.4){
      const r=width*.6*Math.pow(1-recall/1.4,2);
      ctx.save();ctx.translate(width/2,height*.46);ctx.rotate(-.4);
      ctx.globalAlpha=Math.sin(recall/1.4*Math.PI)*.5;ctx.strokeStyle='#b3fff9';ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(0,0,r,r*.42,0,0,Math.PI*2);ctx.stroke();ctx.restore();
      if(settled>.6){
        ctx.save();ctx.beginPath();ctx.rect(width*(recall/1.4)-30,0,32,height);ctx.clip();
        ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-recall/1.4)*.7;
        ctx.drawImage(wordLight,0,0);ctx.restore();
      }
    }
    // A slow highlight travels over the assembled letters, without flashing.
    if (!active && !reduced) {
      const scan=((time*.11)%1)*width;
      ctx.globalCompositeOperation='lighter';
      for (let i=0;i<points.length;i+=9) {
        const p=points[i], distance=Math.abs(p.bx-scan);
        if (distance<22) {
          ctx.globalAlpha=(1-distance/22)*.6;
          ctx.drawImage(glows[p.color],p.x-5,p.y-5,10,10);
        }
      }
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    }
  }
  function tick(now) {
    frame=0;
    if (!visible || document.hidden || reduced) return;
    draw(now); frame=requestAnimationFrame(tick);
  }
  function start() {
    if (!frame && visible && !document.hidden && !reduced) {
      last=performance.now();frame=requestAnimationFrame(tick);
    }
  }
  function stop() { cancelAnimationFrame(frame);frame=0; }
  host.addEventListener('pointerenter',e=>{
    if(e.pointerType==='touch'||reduced)return;
    hovering=true;explode();
  });
  host.addEventListener('pointermove',e=>{
    const r=host.getBoundingClientRect();pointer.x=e.clientX-r.left;pointer.y=e.clientY-r.top;
  });
  host.addEventListener('pointerleave',()=>{hovering=false;pointer.x=pointer.y=-1000;});
  host.addEventListener('pointercancel',()=>{hovering=false;burstUntil=0;pointer.x=pointer.y=-1000;});
  host.addEventListener('click',e=>{
    if(e.target===trigger || trigger.contains(e.target))return;
    burstUntil=performance.now()+2600;explode();
  });
  trigger.addEventListener('click',()=>{burstUntil=performance.now()+2800;explode();});
  host.addEventListener('keydown',e=>{
    if(e.key==='Escape'){hovering=false;burstUntil=0;pointer.x=pointer.y=-1000;}
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){hovering=false;burstUntil=0;stop();}else start();
  });
  motion.addEventListener('change',()=>{
    reduced=motion.matches;hovering=false;burstUntil=0;stop();layout();
  });
  new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible)start();else{hovering=false;burstUntil=0;stop();}
  },{threshold:.05}).observe(host);
  new ResizeObserver(layout).observe(host);
  layout();
})();
