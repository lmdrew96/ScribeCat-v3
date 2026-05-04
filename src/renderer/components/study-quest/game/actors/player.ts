/**
 * Player — the cat. WASD or arrow keys to move; collides with solid tiles.
 *
 * Idle animation reflects the cat's current mood (read from gameBridge.state.mood)
 * — happy plays idle2, studying plays sitting, sleepy plays sleep, etc.
 * While moving, run animation takes over regardless of mood.
 *
 * Speed is modulated by mood: sleepy slows the cat, excited speeds it up.
 *
 * `inputEnabled = false` (set by the scene during dialogue) freezes movement.
 */

import * as ex from 'excalibur';
import { type CatMood, type CatVariant, MOOD_TO_SPRITE, SPRITE_CONFIG } from '../../cat-sprites';
import { gameBridge } from '../bridge';
import { getCatResources } from '../resources';

const BASE_SPEED = 120;

const SPEED_MULT: Record<CatMood, number> = {
  idle: 1.0,
  happy: 1.0,
  studying: 0.9,
  sleepy: 0.6,
  excited: 1.4,
};

export interface PlayerOptions {
  variant: CatVariant;
  spawn: ex.Vector;
}

export class Player extends ex.Actor {
  inputEnabled = true;

  private variant: CatVariant;

  constructor(options: PlayerOptions) {
    super({
      name: 'player',
      pos: options.spawn,
      width: SPRITE_CONFIG.idle.frameSize,
      height: SPRITE_CONFIG.idle.frameSize,
      collisionType: ex.CollisionType.Active,
      // Above tilemap (z=0) so room transitions don't bury the cat under
      // a freshly-inserted tilemap. Features (chests/portals) sit at z=0
      // too, which keeps the cat visible when standing on them.
      z: 10,
    });
    this.variant = options.variant;
  }

  override onInitialize(): void {
    const resources = getCatResources(this.variant);

    const buildAnim = (
      image: ex.ImageSource,
      frameCount: number,
      frameDuration: number,
      frameSize: number,
    ) => {
      const sheet = ex.SpriteSheet.fromImageSource({
        image,
        grid: { rows: 1, columns: frameCount, spriteWidth: frameSize, spriteHeight: frameSize },
      });
      return ex.Animation.fromSpriteSheet(
        sheet,
        ex.range(0, frameCount - 1),
        frameDuration,
        ex.AnimationStrategy.Loop,
      );
    };

    const animIdle = buildAnim(
      resources.idle,
      SPRITE_CONFIG.idle.frameCount,
      SPRITE_CONFIG.idle.frameDuration,
      SPRITE_CONFIG.idle.frameSize,
    );
    const animIdle2 = buildAnim(
      resources.idle2,
      SPRITE_CONFIG.idle2.frameCount,
      SPRITE_CONFIG.idle2.frameDuration,
      SPRITE_CONFIG.idle2.frameSize,
    );
    const animSitting = buildAnim(
      resources.sitting,
      SPRITE_CONFIG.sitting.frameCount,
      SPRITE_CONFIG.sitting.frameDuration,
      SPRITE_CONFIG.sitting.frameSize,
    );
    const animSleep = buildAnim(
      resources.sleep,
      SPRITE_CONFIG.sleep.frameCount,
      SPRITE_CONFIG.sleep.frameDuration,
      SPRITE_CONFIG.sleep.frameSize,
    );
    const animRun = buildAnim(
      resources.run,
      SPRITE_CONFIG.run.frameCount,
      SPRITE_CONFIG.run.frameDuration,
      SPRITE_CONFIG.run.frameSize,
    );

    this.graphics.add('idle', animIdle);
    this.graphics.add('idle2', animIdle2);
    this.graphics.add('sitting', animSitting);
    this.graphics.add('sleep', animSleep);
    this.graphics.add('run', animRun);
    this.graphics.use('idle');
  }

  override onPreUpdate(engine: ex.Engine): void {
    const mood = gameBridge.state.mood;
    const speed = BASE_SPEED * (SPEED_MULT[mood] ?? 1);

    let vx = 0;
    let vy = 0;

    if (this.inputEnabled) {
      const kb = engine.input.keyboard;
      if (kb.isHeld(ex.Keys.W) || kb.isHeld(ex.Keys.Up)) vy -= speed;
      if (kb.isHeld(ex.Keys.S) || kb.isHeld(ex.Keys.Down)) vy += speed;
      if (kb.isHeld(ex.Keys.A) || kb.isHeld(ex.Keys.Left)) vx -= speed;
      if (kb.isHeld(ex.Keys.D) || kb.isHeld(ex.Keys.Right)) vx += speed;
    }

    this.vel = ex.vec(vx, vy);

    const moving = vx !== 0 || vy !== 0;
    const targetAnim = moving ? 'run' : MOOD_TO_SPRITE[mood];
    this.graphics.use(targetAnim);
    if (vx !== 0) this.graphics.flipHorizontal = vx < 0;
  }
}
