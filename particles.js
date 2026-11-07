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
    size *= width * .84 / m.measureText('DANFIX').width;
    m.font = `900 ${size}px Arial,sans-serif`;
    m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillStyle = '#fff';
    const cy = height * .46;
    m.fillText('DANFIX', width / 2, cy);
    const pixels = m.getImageData(0, 0, mask.width, mask.height).data;
    const step = width < 400 ? 2 : 2.5;
    points = [];
    for (let y = 0; y < mask.height; y += step) {
      for (let x = 0; x < mask.width; x += step) {
        if (pixels[(Math.floor(y) * mask.width + Math.floor(x)) * 4 + 3] < 170) continue;
        const angle = Math.atan2(y - cy, (x - width / 2) * .75) + random(-.85, .85);
        const radius = random(.15, .5);
        const color = x < width * .51 ? (Math.random() < .75 ? 0 : 1) : (Math.random() < .8 ? 2 : 3);
        const tx = width / 2 + Math.cos(angle) * width * radius;
        const ty = cy + Math.sin(angle) * height * radius * .72;
        points.push({ bx:x, by:y, x, y, vx:0, vy:0, tx, ty, angle,
          color, size:random(.9, 1.3), phase:random(0, Math.PI * 2), depth:random(.5, 1.5) });
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
    waveAt = now;
    points.forEach(p => {
      const force = random(5, 15) * Math.min(width / 500, 1.2);
      p.vx += Math.cos(p.angle) * force;
      p.vy += Math.sin(p.angle) * force * .7;
    });
    start();
  }

  function draw(now) {
    const dt = Math.min((now - last) / 16.667 || 1, 2);
    last = now;
    const active = !reduced && (hovering || now < burstUntil);
    const intro = !reduced && introAt && now - introAt < 150;
    const time = reduced ? 0 : now * .001;
    ctx.clearRect(0, 0, width, height);
    // Quiet orbital traces give the light a sense of depth.
    ctx.save();
    ctx.translate(width / 2, height * .46);
    ctx.rotate(-.18);
    ctx.strokeStyle = '#4ac3df18'; ctx.lineWidth = .7;
    for (let i=0; i<2; i++) {
      ctx.beginPath(); ctx.ellipse(0,0,width*(.41+i*.08),height*(.2+i*.075),0,0,Math.PI*2); ctx.stroke();
    }
    ctx.restore();
    for (const s of stars) {
      ctx.globalAlpha = .22 + .2 * Math.sin(time * .7 + s.phase);
      ctx.fillStyle = '#78d8f6';
      ctx.fillRect(s.x, s.y + (reduced ? 0 : Math.sin(time*.3+s.phase)*5), s.size, s.size);
    }
    ctx.globalAlpha = 1;

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
    }

    const damping = Math.pow(active ? .86 : .8, dt);
    for (const p of points) {
      const ox=p.x, oy=p.y;
      if (reduced) { p.x=p.bx; p.y=p.by; p.vx=p.vy=0; }
      else if (!intro) {
        let tx=active ? p.tx+Math.sin(time*.85+p.phase)*12*p.depth : p.bx;
        let ty=active ? p.ty+Math.cos(time*.7+p.phase)*10*p.depth : p.by;
        if (active) {
          const dx=tx-pointer.x, dy=ty-pointer.y, d=Math.hypot(dx,dy);
          if (d>0 && d<85) { tx+=dx/d*(85-d)*.6; ty+=dy/d*(85-d)*.6; }
        }
        const spring=active?.018:.045;
        p.vx=(p.vx+(tx-p.x)*spring*dt)*damping;
        p.vy=(p.vy+(ty-p.y)*spring*dt)*damping;
        p.x+=p.vx*dt;p.y+=p.vy*dt;
      }
      const speed=Math.hypot(p.vx,p.vy);
      ctx.fillStyle=palette[p.color];
      ctx.globalAlpha=active?.8:1;
      // Sparse luminous cores, crisp typography at rest.
      if (active || speed>1.5) {
        if (speed>2) {
          ctx.strokeStyle=palette[p.color];ctx.lineWidth=p.size*.7;
          ctx.globalAlpha=Math.min(.65,speed*.045);
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(ox-p.vx*.9,oy-p.vy*.9);ctx.stroke();
        }
        ctx.globalAlpha=.48;
        const size=p.size*8;
        ctx.drawImage(glows[p.color],p.x-size/2,p.y-size/2,size,size);
      }
      ctx.globalAlpha=active?.72+Math.sin(time*2+p.phase)*.2:.93;
      ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size*1.5,p.size*1.5);
    }
    ctx.globalAlpha=1;
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
    burstUntil=performance.now()+1450;explode();
  });
  trigger.addEventListener('click',()=>{burstUntil=performance.now()+1600;explode();});
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
