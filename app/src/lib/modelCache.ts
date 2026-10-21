import * as THREE from 'three';
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib';

/**
 * Models are fetched and parsed once per page session and handed out as clones.
 * Leaving and returning to the homepage then skips the refetch and the re-parse,
 * and the clones share the cached geometries and materials. The GPU side is not
 * cached: every visit's scene gets a WebGL context of its own (and gives it up
 * on the way out), so geometry and textures are uploaded, and shaders compiled,
 * again each time.
 */

let loader: GLTFLoader | undefined;

function getLoader(): GLTFLoader {
	if (!loader) {
		// The models are meshopt-compressed (scripts/optimize-models.mjs): the
		// decoder is a few KB of inline wasm, with no extra fetch or workers.
		loader = new GLTFLoader();
		loader.setMeshoptDecoder(MeshoptDecoder());
	}
	return loader;
}

/** url -> the parsed prototype scene (or the in-flight promise for it). */
const models = new Map<string, Promise<THREE.Group>>();

function loadOnce(url: string): Promise<THREE.Group> {
	const cached = models.get(url);
	if (cached) return cached;

	const pending = new Promise<THREE.Group>((resolve, reject) => {
		getLoader().load(
			url,
			(gltf) => resolve(gltf.scene),
			undefined,
			(error) => reject(error)
		);
	}).catch((error) => {
		// Do not cache a failure: a later visit should be able to retry.
		models.delete(url);
		throw error;
	});

	models.set(url, pending);
	return pending;
}

/**
 * Returns a fresh clone, so callers can position and dispose it freely without
 * touching the cached prototype.
 */
export async function loadModel(url: string): Promise<THREE.Group> {
	const prototype = await loadOnce(url);
	return prototype.clone(true);
}

/** Warms the cache without blocking; failures are deliberately ignored. */
export function preloadModels(urls: string[]) {
	for (const url of urls) {
		loadOnce(url).catch(() => {});
	}
}
