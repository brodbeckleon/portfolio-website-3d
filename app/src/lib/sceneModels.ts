import camera from '$lib/assets/models/camera.glb?url';
import computer from '$lib/assets/models/computer.glb?url';
import deskLamp from '$lib/assets/models/desk_lamp.glb?url';
import coffeeCup from '$lib/assets/models/coffee_cup.glb?url';
import polaroid from '$lib/assets/polaroid.webp?url';

/**
 * The homepage models, imported as URLs so Vite content-hashes them into
 * /_app/immutable: they get the adapter's year-long immutable caching, and a
 * re-optimized model can never be served stale under an old name.
 *
 * Shared by the scene and hooks.server.ts, which preloads them.
 */
export const MODEL_URLS = { camera, computer, deskLamp, coffeeCup };

/** The homepage's textures, hashed and preloaded the same way. */
export const TEXTURE_URLS = { polaroid };
