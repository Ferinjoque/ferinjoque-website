import React, { useRef, useEffect, useState } from 'react';

interface AnimatedSustainabilityGraphicProps {
  width?: number;
  height?: number;
  className?: string; // Keep for potential styling, but sizing primarily via props/defaults now
}

const AnimatedSustainabilityGraphic: React.FC<AnimatedSustainabilityGraphicProps> = ({
  width: propWidth = 300,     // Default width
  height: propHeight = 390,  // Default height (300 * 1.3 for lightbulb aspect ratio)
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // canvasSize will now be determined by props or defaults directly for PlayCode.io simplicity
  const [canvasSize, setCanvasSize] = useState({ width: propWidth, height: propHeight });

  // Theme colors
  const bulbColor = '#3F51B5';
  const recycleSymbolColor = '#4CAF50';
  const particleColor = '#81C784';
  const backgroundColor = '#111111';
  const plexusLineColor = 'rgba(63, 81, 181, 0.25)';
  const recyclePlexusLineColor = 'rgba(76, 175, 80, 0.25)';

  const growthSpeed = 0.007;
  const particleSpeedFactor = 0.5;
  let globalTime = 0; // Moved globalTime outside useEffect to be reset correctly if component re-renders

  // Update canvasSize if props change
  useEffect(() => {
    setCanvasSize({ width: propWidth, height: propHeight });
  }, [propWidth, propHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Ensure canvasSize has non-zero dimensions before proceeding
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    ctx.scale(dpr, dpr);

    let animationFrameId: number;
    let formationProgress = 0;

    const bulbOuterWidth = canvasSize.width * 0.7;
    const bulbOuterHeight = canvasSize.height * 0.8;
    const bulbBodyRatio = 0.65;
    const bulbNeckRatio = 0.15;
    const centerX = canvasSize.width / 2;
    const bulbTopY = canvasSize.height * 0.1;

    interface Point { x: number; y: number; id: number; spawnTime: number; }
    interface Line { p1: Point; p2: Point; spawnTime: number; }
    interface Particle {
      x: number; y: number; targetX: number; targetY: number;
      startX: number; startY: number; speed: number; progress: number;
      life: number; maxLife: number; color: string;
    }

    let bulbPoints: Point[] = [];
    let bulbLines: Line[] = [];
    let recycleSymbolPoints: Point[] = [];
    let recycleSymbolLines: Line[] = [];
    const particles: Particle[] = [];
    let pointIdCounter = 0;

    function defineBulbPoints() {
      bulbPoints = [];
      pointIdCounter = 0;
      const bodyHeight = bulbOuterHeight * bulbBodyRatio;
      const bodyCenterY = bulbTopY + bodyHeight / 2;
      const numEllipsePoints = 24;
      for (let i = 0; i < numEllipsePoints; i++) {
        const angle = (i / numEllipsePoints) * Math.PI * 2;
        bulbPoints.push({
          id: pointIdCounter++,
          x: centerX + (bulbOuterWidth / 2) * Math.cos(angle),
          y: bodyCenterY + (bodyHeight / 2) * Math.sin(angle),
          spawnTime: Math.random() * 0.3,
        });
      }
      const neckTopY = bulbTopY + bodyHeight;
      const neckHeight = bulbOuterHeight * bulbNeckRatio;
      const neckBottomY = neckTopY + neckHeight;
      const neckWidthStart = bulbOuterWidth * 0.35;
      const neckWidthEnd = bulbOuterWidth * 0.3;
      bulbPoints.push({ id: pointIdCounter++, x: centerX - neckWidthStart / 2, y: neckTopY, spawnTime: 0.1 });
      bulbPoints.push({ id: pointIdCounter++, x: centerX + neckWidthStart / 2, y: neckTopY, spawnTime: 0.1 });
      bulbPoints.push({ id: pointIdCounter++, x: centerX + neckWidthEnd / 2, y: neckBottomY, spawnTime: 0.15 });
      bulbPoints.push({ id: pointIdCounter++, x: centerX - neckWidthEnd / 2, y: neckBottomY, spawnTime: 0.15 });
      const baseTopY = neckBottomY;
      const baseHeight = bulbOuterHeight * (1 - bulbBodyRatio - bulbNeckRatio);
      const baseBottomY = baseTopY + baseHeight;
      const baseWidth = bulbOuterWidth * 0.35;
      bulbPoints.push({ id: pointIdCounter++, x: centerX - baseWidth / 2, y: baseTopY, spawnTime: 0.2 });
      bulbPoints.push({ id: pointIdCounter++, x: centerX + baseWidth / 2, y: baseTopY, spawnTime: 0.2 });
      bulbPoints.push({ id: pointIdCounter++, x: centerX + baseWidth / 2, y: baseBottomY, spawnTime: 0.25 });
      bulbPoints.push({ id: pointIdCounter++, x: centerX - baseWidth / 2, y: baseBottomY, spawnTime: 0.25 });
    }

    function defineRecycleSymbolPoints() {
      recycleSymbolPoints = [];
      const symbolSize = bulbOuterWidth * 0.35;
      const symbolCenterY = bulbTopY + (bulbOuterHeight * bulbBodyRatio) / 2;
      const armLength = symbolSize / 2;
      const armThickness = symbolSize / 5;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
        const x1 = centerX + Math.cos(angle) * armLength;
        const y1 = symbolCenterY + Math.sin(angle) * armLength;
        const x2 = centerX + Math.cos(angle) * (armLength - armThickness * 1.5);
        const y2 = symbolCenterY + Math.sin(angle) * (armLength - armThickness * 1.5);
        const x3 = centerX + Math.cos(angle + Math.PI / 3) * (armLength - armThickness * 0.5);
        const y3 = symbolCenterY + Math.sin(angle + Math.PI / 3) * (armLength - armThickness * 0.5);
        recycleSymbolPoints.push({ id: pointIdCounter++, x: x1, y: y1, spawnTime: 0.3 + i * 0.05 });
        recycleSymbolPoints.push({ id: pointIdCounter++, x: x2, y: y2, spawnTime: 0.3 + i * 0.05 });
        recycleSymbolPoints.push({ id: pointIdCounter++, x: x3, y: y3, spawnTime: 0.35 + i * 0.05 });
      }
      recycleSymbolLines = []; // Clear previous lines
      for (let i = 0; i < 3; i++) {
        const pBase = recycleSymbolPoints[i * 3];
        const pInner = recycleSymbolPoints[i * 3 + 1];
        const pBend = recycleSymbolPoints[i * 3 + 2];
        const pNextInner = recycleSymbolPoints[((i + 1) % 3) * 3 + 1];
        recycleSymbolLines.push({ p1: pBase, p2: pBend, spawnTime: 0.4 + i * 0.05 });
        recycleSymbolLines.push({ p1: pBend, p2: pNextInner, spawnTime: 0.45 + i * 0.05 });
        recycleSymbolLines.push({ p1: pInner, p2: pBend, spawnTime: 0.42 + i * 0.05 });
      }
    }

    function createPlexusLines(points: Point[], lines: Line[], maxDistFactor = 0.3) {
      lines.length = 0;
      const maxDist = canvasSize.width * maxDistFactor;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const p1 = points[i]; const p2 = points[j];
          const dx = p1.x - p2.x; const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist && dist > 1) {
            lines.push({ p1, p2, spawnTime: (p1.spawnTime + p2.spawnTime) / 2 + 0.1 });
          }
        }
      }
    }

    defineBulbPoints();
    defineRecycleSymbolPoints(); // This also defines recycleSymbolLines
    createPlexusLines(bulbPoints, bulbLines, 0.35);

    const drawStructure = (points: Point[], lines: Line[], pointColor: string, lineColor: string, pointSize: number, lineWidth: number) => {
      lines.forEach(line => {
        if (formationProgress >= line.spawnTime) {
          const lineProg = Math.min(1, (formationProgress - line.spawnTime) / 0.4);
          if (lineProg > 0) {
            ctx.beginPath(); ctx.moveTo(line.p1.x, line.p1.y);
            ctx.lineTo(line.p1.x + (line.p2.x - line.p1.x) * lineProg, line.p1.y + (line.p2.y - line.p1.y) * lineProg);
            ctx.strokeStyle = lineColor; ctx.lineWidth = lineWidth * (canvasSize.width / 300);
            ctx.globalAlpha = lineProg * 0.6 + Math.sin(globalTime * 0.1 + line.p1.id) * 0.1 + 0.1;
            ctx.stroke();
          }
        }
      });
      ctx.globalAlpha = 1;
      points.forEach(point => {
        if (formationProgress >= point.spawnTime) {
          const pointProg = Math.min(1, (formationProgress - point.spawnTime) / 0.2);
          if (pointProg > 0) {
            ctx.beginPath(); ctx.arc(point.x, point.y, pointSize * pointProg * (canvasSize.width / 300), 0, Math.PI * 2);
            ctx.fillStyle = pointColor;
            ctx.globalAlpha = pointProg * 0.8 + Math.sin(globalTime * 0.15 + point.id) * 0.2;
            ctx.fill();
          }
        }
      });
      ctx.globalAlpha = 1;
    };

    const manageParticles = () => {
        if (formationProgress > 0.9 && particles.length < 60 && Math.random() < 0.15) {
            const allLines = [...bulbLines, ...recycleSymbolLines].filter(l => formationProgress >= l.spawnTime + 0.3);
            if (allLines.length > 0) {
                const line = allLines[Math.floor(Math.random() * allLines.length)];
                const startAtP1 = Math.random() < 0.5;
                const p = startAtP1 ? line.p1 : line.p2;
                const target = startAtP1 ? line.p2 : line.p1;
                particles.push({
                    x: p.x, y: p.y, startX: p.x, startY: p.y,
                    targetX: target.x, targetY: target.y,
                    speed: (0.01 + Math.random() * 0.02) * particleSpeedFactor,
                    progress: 0, life: 1, maxLife: 60 + Math.random() * 60, color: particleColor,
                });
            }
        }
        ctx.fillStyle = particleColor;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.progress += p.speed; p.x = p.startX + (p.targetX - p.startX) * p.progress;
            p.y = p.startY + (p.targetY - p.startY) * p.progress; p.life -= 1 / p.maxLife;
            if (p.life <= 0 || p.progress >= 1) { particles.splice(i, 1); continue; }
            ctx.beginPath(); ctx.arc(p.x, p.y, (0.8 + Math.random() * 0.4) * p.life * (canvasSize.width / 300), 0, Math.PI * 2);
            ctx.globalAlpha = p.life * 0.9; ctx.fill();
        }
        ctx.globalAlpha = 1;
    };

    const render = () => {
      globalTime++;
      if (formationProgress < 1) {
        formationProgress += growthSpeed;
        formationProgress = Math.min(1, formationProgress);
      }
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      drawStructure(bulbPoints, bulbLines, bulbColor, plexusLineColor, 1.8, 0.6);
      if (formationProgress > 0.2) {
        ctx.save();
        drawStructure(recycleSymbolPoints, recycleSymbolLines, recycleSymbolColor, recyclePlexusLineColor, 1.4, 0.7);
        ctx.restore();
      }
      manageParticles();
      animationFrameId = requestAnimationFrame(render);
    };

    defineBulbPoints();
    defineRecycleSymbolPoints();
    createPlexusLines(bulbPoints, bulbLines, 0.35);
    // Note: recycleSymbolLines are defined in defineRecycleSymbolPoints now

    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [canvasSize, bulbColor, recycleSymbolColor, particleColor, plexusLineColor, recyclePlexusLineColor, backgroundColor, growthSpeed, particleSpeedFactor]); // Added dependencies

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}  // Set canvas element attributes directly
      height={canvasSize.height} // Set canvas element attributes directly
      className={className || ''}
      // Style attribute for width/height is handled by useEffect for dpr scaling
    />
  );
};

export default AnimatedSustainabilityGraphic;
