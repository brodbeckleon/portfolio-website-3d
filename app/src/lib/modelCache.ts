import * as THREE from 'three';
import { DRACOLoader, GLTFLoader } from 'three-stdlib';

/**
 * Models are fetched and parsed once per page session and handed out as clones.
 * Leaving and returning to the homepage then costs nothing: no refetch, no
 * re-parse, and the clones share the cached geometries and materials.
 */

// Also caches the raw files, so anything else using a three loader benefits.
THREE.Cache.enabled = true;

let loader: GLTFLoader | undefined;

function getLoader(): GLTFLoader {
	if (!loader) {
		const draco = new DRACOLoader();
		draco.setDecoderPath('/draco/');
		loader = new GLTFLoader();
		loader.setDRACOLoader(draco);
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
