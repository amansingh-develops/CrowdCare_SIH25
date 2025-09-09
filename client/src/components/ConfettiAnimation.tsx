import * as React from 'react';

export function ConfettiAnimation({ trigger }: { trigger: any }) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  React.useEffect(() => {
    if (!trigger) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * dpr;
    const height = canvas.clientHeight * dpr;
    canvas.width = width;
    canvas.height = height;
    let frame = 0;
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * width,
      y: -Math.random() * height,
      r: 4 + Math.random() * 6,
      vy: 1 + Math.random() * 3,
      vx: -1 + Math.random() * 2,
      color: `hsl(${Math.random() * 360}, 80%, 60%)`,
    }));
    let raf: number;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > height) p.y = -10;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (frame < 180) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [trigger]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0" aria-hidden="true" />;
}

export default ConfettiAnimation;


