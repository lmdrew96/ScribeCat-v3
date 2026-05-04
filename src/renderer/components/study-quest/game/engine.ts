/**
 * Engine factory — creates an Excalibur engine bound to a canvas, registers
 * scenes, and returns a dispose handle for React unmount.
 *
 * The bridge pattern (see bridge.ts) is the only escape hatch from scenes
 * back to React/Convex. Don't import Convex from inside scenes.
 */

import * as ex from 'excalibur';
import type { CatVariant } from '../cat-sprites';
import { buildLoader } from './resources';
import { TownScene } from './scenes/town';

export interface CreateGameOptions {
  canvas: HTMLCanvasElement;
  variant: CatVariant;
  width?: number;
  height?: number;
}

export interface GameHandle {
  engine: ex.Engine;
  ready: Promise<void>;
  dispose: () => void;
}

export function createGameEngine(options: CreateGameOptions): GameHandle {
  const { canvas, variant, width = 640, height = 480 } = options;

  const engine = new ex.Engine({
    canvasElement: canvas,
    width,
    height,
    displayMode: ex.DisplayMode.Fixed,
    backgroundColor: ex.Color.fromHex('#1e1830'),
    antialiasing: false,
    pixelArt: true,
    suppressPlayButton: true,
    suppressConsoleBootMessage: true,
  });

  engine.addScene('town', new TownScene({ variant }));

  const loader = buildLoader(variant);
  const ready = engine
    .start(loader)
    .then(() => {
      engine.goToScene('town');
    });

  const dispose = () => {
    try {
      engine.stop();
      engine.dispose();
    } catch {
      // Engine may already be disposed; ignore.
    }
  };

  return { engine, ready, dispose };
}
