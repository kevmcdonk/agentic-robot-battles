'use client';

import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { BattleRound, Robot } from '@/lib/types';

interface MatterArenaSimulationProps {
  robot1: Robot;
  robot2: Robot;
  activeRound: BattleRound | null;
  roundSignal: number;
}

const ARENA_WIDTH = 640;
const ARENA_HEIGHT = 280;

export default function MatterArenaSimulation({
  robot1,
  robot2,
  activeRound,
  roundSignal,
}: MatterArenaSimulationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const leftRobotRef = useRef<Matter.Body | null>(null);
  const rightRobotRef = useRef<Matter.Body | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
    const world = engine.world;

    const render = Matter.Render.create({
      element: containerRef.current,
      engine,
      options: {
        width: ARENA_WIDTH,
        height: ARENA_HEIGHT,
        background: '#181818',
        wireframes: false,
        showAngleIndicator: false,
      },
    });

    const wallOptions = { isStatic: true, render: { fillStyle: '#2a2a2a' } };
    const walls = [
      Matter.Bodies.rectangle(ARENA_WIDTH / 2, -10, ARENA_WIDTH, 20, wallOptions),
      Matter.Bodies.rectangle(ARENA_WIDTH / 2, ARENA_HEIGHT + 10, ARENA_WIDTH, 20, wallOptions),
      Matter.Bodies.rectangle(-10, ARENA_HEIGHT / 2, 20, ARENA_HEIGHT, wallOptions),
      Matter.Bodies.rectangle(ARENA_WIDTH + 10, ARENA_HEIGHT / 2, 20, ARENA_HEIGHT, wallOptions),
    ];

    const centerBarrier = Matter.Bodies.rectangle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 6, ARENA_HEIGHT * 0.35, {
      isStatic: true,
      render: { fillStyle: '#6a4d00' },
    });

    const leftRobot = Matter.Bodies.rectangle(140, ARENA_HEIGHT / 2, 54, 54, {
      frictionAir: 0.035,
      restitution: 0.35,
      chamfer: { radius: 5 },
      render: { fillStyle: '#FFD700', strokeStyle: '#111', lineWidth: 2 },
    });

    const rightRobot = Matter.Bodies.rectangle(ARENA_WIDTH - 140, ARENA_HEIGHT / 2, 54, 54, {
      frictionAir: 0.035,
      restitution: 0.35,
      chamfer: { radius: 5 },
      render: { fillStyle: '#FF6B00', strokeStyle: '#111', lineWidth: 2 },
    });

    leftRobotRef.current = leftRobot;
    rightRobotRef.current = rightRobot;

    Matter.World.add(world, [...walls, centerBarrier, leftRobot, rightRobot]);

    const runner = Matter.Runner.create();
    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);

    engineRef.current = engine;
    renderRef.current = render;
    runnerRef.current = runner;

    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
    };
  }, []);

  useEffect(() => {
    const leftRobot = leftRobotRef.current;
    const rightRobot = rightRobotRef.current;
    if (!leftRobot || !rightRobot) return;
    if (!activeRound || roundSignal <= 0) return;

    const attackerIsLeft = activeRound.attackerRobotId === robot1.id;
    const attacker = attackerIsLeft ? leftRobot : rightRobot;
    const defender = attackerIsLeft ? rightRobot : leftRobot;

    const forceScale = Math.min(0.07, 0.03 + activeRound.damageDealt / 220);
    const directionX = attackerIsLeft ? 1 : -1;

    Matter.Body.setAngularVelocity(attacker, (Math.random() - 0.5) * 0.16);
    Matter.Body.setAngularVelocity(defender, (Math.random() - 0.5) * 0.2);

    Matter.Body.applyForce(attacker, attacker.position, {
      x: directionX * forceScale,
      y: (Math.random() - 0.5) * 0.003,
    });

    Matter.Body.applyForce(defender, defender.position, {
      x: directionX * forceScale * 0.55,
      y: (Math.random() - 0.5) * 0.004,
    });
  }, [activeRound, roundSignal, robot1.id]);

  return (
    <div className="rounded border border-[#3a3a3a] bg-[#101010] overflow-hidden">
      <div className="grid grid-cols-3 items-center gap-2 border-b border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-[11px] uppercase tracking-widest text-[#8a9aa8]">
        <span className="truncate">{robot1.name}</span>
        <span className="text-center text-[#FFD700] font-bold">Matter.js</span>
        <span className="truncate text-right">{robot2.name}</span>
      </div>

      <div className="relative overflow-x-auto">
        <div ref={containerRef} className="min-w-[640px]" aria-label="Matter.js robot arena" />
      </div>
    </div>
  );
}