/**
 * Resource registry — ImageSource definitions for the game.
 *
 * Loads all mood-mapped cat animations so the player can swap idle sprites
 * based on the cat's current mood (idle, happy, studying, sleepy).
 * `run` is used while moving regardless of mood.
 */

import * as ex from 'excalibur';
import { type CatVariant, getSpriteUrl } from '../cat-sprites';

export interface CatResources {
  idle: ex.ImageSource;
  idle2: ex.ImageSource;
  sitting: ex.ImageSource;
  sleep: ex.ImageSource;
  run: ex.ImageSource;
}

const cache = new Map<CatVariant, CatResources>();

export function getCatResources(variant: CatVariant): CatResources {
  const cached = cache.get(variant);
  if (cached) return cached;
  const resources: CatResources = {
    idle: new ex.ImageSource(getSpriteUrl(variant, 'idle')),
    idle2: new ex.ImageSource(getSpriteUrl(variant, 'idle2')),
    sitting: new ex.ImageSource(getSpriteUrl(variant, 'sitting')),
    sleep: new ex.ImageSource(getSpriteUrl(variant, 'sleep')),
    run: new ex.ImageSource(getSpriteUrl(variant, 'run')),
  };
  cache.set(variant, resources);
  return resources;
}

export function buildLoader(variant: CatVariant): ex.Loader {
  const cat = getCatResources(variant);
  return new ex.Loader([cat.idle, cat.idle2, cat.sitting, cat.sleep, cat.run]);
}
