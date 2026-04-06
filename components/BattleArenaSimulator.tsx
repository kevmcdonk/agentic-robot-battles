'use client';

import { useEffect, useRef } from 'react';
import type { BattleRound, Robot } from '@/lib/types';

interface HpSnapshot {
  hp1: number;
  hp2: number;
}

interface BattleArenaSimulatorProps {
  robot1: Robot;
  robot2: Robot;
  /** The round that just played (null = pre-battle) */
  activeRound: BattleRound | null;
  /** Toggles each time a new round fires, triggering the clash animation */
  attackBeat: boolean;
  hpSnapshot: HpSnapshot;
  startHp1: number;
  startHp2: number;
}

// Derive a colour from the weapon type string
function weaponColour(weaponType: string): string {
  const w = weaponType.toLowerCase();
  if (w.includes('spinner') || w.includes('disc')) return '#FF6B00';
  if (w.includes('flipper')) return '#00AAFF';
  if (w.includes('crusher') || w.includes('claw')) return '#AA00FF';
  if (w.includes('axe') || w.includes('hammer')) return '#FF0050';
  if (w.includes('wedge') || w.includes('scoop')) return '#00CC66';
  return '#FFD700';
}

export default function BattleArenaSimulator({
  robot1,
  robot2,
  activeRound,
  attackBeat,
  hpSnapshot,
  startHp1,
  startHp2,
}: BattleArenaSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReturnType<typeof import('matter-js')['Engine']['create']> | null>(null);
  const renderRef = useRef<ReturnType<typeof import('matter-js')['Render']['create']> | null>(null);
  const runnerRef = useRef<ReturnType<typeof import('matter-js')['Runner']['create']> | null>(null);
  const body1Ref = useRef<ReturnType<typeof import('matter-js')['Bodies']['rectangle']> | null>(null);
  const body2Ref = useRef<ReturnType<typeof import('matter-js')['Bodies']['rectangle']> | null>(null);
  const arenaWidthRef = useRef(700);
  const arenaHeightRef = useRef(300);

  // Initialise the Matter.js world once on mount
  useEffect(() => {
    let Matter: typeof import('matter-js');
    let cancelled = false;

    async function init() {
      Matter = await import('matter-js');
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const W = canvas.offsetWidth || 700;
      const H = 300;
      arenaWidthRef.current = W;
      arenaHeightRef.current = H;
      canvas.width = W;
      canvas.height = H;

      const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
      const runner = Matter.Runner.create();

      const render = Matter.Render.create({
        canvas,
        engine,
        options: {
          width: W,
          height: H,
          background: '#0d0d0d',
          wireframes: false,
          pixelRatio: window.devicePixelRatio || 1,
        },
      });

      // Arena floor/walls (invisible physics boundaries)
      const wallOpts = { isStatic: true, render: { fillStyle: '#1a1a1a' } };
      const walls = [
        Matter.Bodies.rectangle(W / 2, H + 25, W, 50, wallOpts),   // floor
        Matter.Bodies.rectangle(W / 2, -25, W, 50, wallOpts),        // ceiling
        Matter.Bodies.rectangle(-25, H / 2, 50, H, wallOpts),       // left wall
        Matter.Bodies.rectangle(W + 25, H / 2, 50, H, wallOpts),    // right wall
      ];

      // Hazard stripe lines on the arena floor (drawn via canvas, not physics)
      const col1 = weaponColour(robot1.weaponType);
      const col2 = weaponColour(robot2.weaponType);

      const robotSize = 56;

      // Robot 1 (left side)
      const body1 = Matter.Bodies.rectangle(W * 0.22, H / 2, robotSize, robotSize, {
        restitution: 0.6,
        friction: 0.05,
        frictionAir: 0.08,
        render: {
          fillStyle: col1,
          strokeStyle: '#FFD700',
          lineWidth: 2,
        },
        label: 'robot1',
      });

      // Robot 2 (right side)
      const body2 = Matter.Bodies.rectangle(W * 0.78, H / 2, robotSize, robotSize, {
        restitution: 0.6,
        friction: 0.05,
        frictionAir: 0.08,
        render: {
          fillStyle: col2,
          strokeStyle: '#FFD700',
          lineWidth: 2,
        },
        label: 'robot2',
      });

      Matter.Composite.add(engine.world, [...walls, body1, body2]);

      // After-render hook: draw robot labels and the centre hazard line
      Matter.Events.on(render, 'afterRender', () => {
        const ctx = render.context;
        const W2 = render.options.width ?? W;
        const H2 = render.options.height ?? H;

        // Centre dashed line
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(W2 / 2, 0);
        ctx.lineTo(W2 / 2, H2);
        ctx.stroke();
        ctx.restore();

        // Weapon sparks on the body centres
        function drawLabel(body: Matter.Body, name: string, weaponType: string, col: string) {
          const { x, y } = body.position;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(body.angle);
          // weapon colour rim
          ctx.strokeStyle = col;
          ctx.lineWidth = 3;
          ctx.strokeRect(-robotSize / 2 - 1, -robotSize / 2 - 1, robotSize + 2, robotSize + 2);
          // name label
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(-robotSize / 2, -robotSize / 2, robotSize, 16);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(name.substring(0, 10), 0, -robotSize / 2 + 8);
          // weapon type
          ctx.fillStyle = col;
          ctx.font = '7px monospace';
          ctx.fillText(weaponType.substring(0, 12), 0, robotSize / 2 - 6);
          ctx.restore();
        }

        drawLabel(body1, robot1.name, robot1.weaponType, col1);
        drawLabel(body2, robot2.name, robot2.weaponType, col2);
      });

      Matter.Render.run(render);
      Matter.Runner.run(runner, engine);

      engineRef.current = engine;
      renderRef.current = render;
      runnerRef.current = runner;
      body1Ref.current = body1;
      body2Ref.current = body2;
    }

    init();

    return () => {
      cancelled = true;
      if (renderRef.current) {
        import('matter-js').then((M) => {
          if (renderRef.current) M.Render.stop(renderRef.current);
          if (runnerRef.current && engineRef.current) M.Runner.stop(runnerRef.current);
          if (engineRef.current) M.Engine.clear(engineRef.current);
          renderRef.current = null;
          runnerRef.current = null;
          engineRef.current = null;
          body1Ref.current = null;
          body2Ref.current = null;
        });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // robot1/robot2 identity doesn't change within a battle

  // Apply lunge whenever a new round fires
  useEffect(() => {
    const body1 = body1Ref.current;
    const body2 = body2Ref.current;
    if (!body1 || !body2 || !activeRound) return;

    import('matter-js').then((Matter) => {
      const W = arenaWidthRef.current;
      const H = arenaHeightRef.current;
      const home1x = W * 0.22;
      const home2x = W * 0.78;
      const homey = H / 2;

      const isRobot1Attacker = activeRound.attackerRobotId === robot1.id;
      const attacker = isRobot1Attacker ? body1 : body2;
      const defender = isRobot1Attacker ? body2 : body1;
      const direction = isRobot1Attacker ? 1 : -1;

      // Speed scales with damage; weapon failure still produces a small lurch
      const lungeSpeed = activeRound.damageDealt === 0
        ? W * 0.008
        : W * 0.014 + (activeRound.damageDealt / 20) * W * 0.01;
      const wobble = (Math.random() - 0.5) * lungeSpeed * 0.3;

      // Attacker jumps forward; defender recoils
      Matter.Body.setVelocity(attacker, { x: direction * lungeSpeed, y: wobble });
      Matter.Body.setVelocity(defender, { x: -direction * lungeSpeed * 0.55, y: wobble * -0.5 });

      // After the lunge plays out, snap both back to home positions cleanly
      setTimeout(() => {
        if (!body1Ref.current || !body2Ref.current) return;
        const b1 = body1Ref.current;
        const b2 = body2Ref.current;
        Matter.Body.setPosition(b1, { x: home1x, y: homey });
        Matter.Body.setPosition(b2, { x: home2x, y: homey });
        Matter.Body.setVelocity(b1, { x: 0, y: 0 });
        Matter.Body.setVelocity(b2, { x: 0, y: 0 });
      }, 480);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackBeat]); // only re-run when attackBeat flips

  // Tilt/distort robots proportionally to HP loss
  useEffect(() => {
    const body1 = body1Ref.current;
    const body2 = body2Ref.current;
    if (!body1 || !body2) return;

    import('matter-js').then((Matter) => {
      const damage1 = 1 - Math.max(0, hpSnapshot.hp1) / startHp1;
      const damage2 = 1 - Math.max(0, hpSnapshot.hp2) / startHp2;
      // Slight angular tilt proportional to damage received
      Matter.Body.setAngle(body1, damage1 * 0.6);
      Matter.Body.setAngle(body2, -damage2 * 0.6);
    });
  }, [hpSnapshot, startHp1, startHp2]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Matter.js robot arena simulation"
      className="block w-full rounded h-[300px] bg-[#0d0d0d]"
    />
  );
}
