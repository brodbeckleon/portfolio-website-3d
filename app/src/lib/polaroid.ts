import * as THREE from 'three';

/**
 * An instant photo lying on the desk. Real ones never lie flat: the print
 * bows across its width as it dries and a corner tends to lift, so the card
 * is a finely divided plane bent that way rather than a flat quad. The bend
 * also lets the lamp and the key light shade it, and its raised edges cast
 * a sliver of shadow on the desk.
 */

// A little larger than a real 88 mm card would be at the desk's scale, so
// the face still reads from the default view; the photo's own proportions.
const WIDTH = 0.3;
const HEIGHT = WIDTH * (1291 / 1080);
const SEGMENTS_X = 24;
const SEGMENTS_Y = 28;

// Lift at the long edges and at the curled corner, as a share of half the
// width: a few millimetres on the real thing.
const BOW = 0.05;
const CORNER_CURL = 0.07;

export interface Polaroid {
	object: THREE.Mesh;
	dispose(): void;
}

function bend(geometry: THREE.PlaneGeometry) {
	const positions = geometry.getAttribute('position');
	for (let i = 0; i < positions.count; i += 1) {
		const u = positions.getX(i) / (WIDTH / 2);
		const v = positions.getY(i) / (HEIGHT / 2);
		// Bottom right, the corner a thumb peels it up by.
		const corner = THREE.MathUtils.clamp((u - v) / 2 - 0.45, 0, 1) / 0.55;
		const lift = BOW * u * u + CORNER_CURL * corner * corner;
		positions.setZ(i, lift * (WIDTH / 2));
	}
	geometry.computeVertexNormals();
}

/**
 * @param texture the photo with its frame; the transparent rim around the
 *                card is cut away by the alpha test, shadow included.
 */
export function createPolaroid(texture: THREE.Texture): Polaroid {
	texture.colorSpace = THREE.SRGBColorSpace;

	const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, SEGMENTS_X, SEGMENTS_Y);
	bend(geometry);

	// Between the matte card and the glossy print; one material carries both.
	// Any glossier and the key light's highlight burns out the white card on
	// the light desk.
	const material = new THREE.MeshStandardMaterial({
		map: texture,
		roughness: 0.75,
		metalness: 0,
		envMapIntensity: 0.6,
		alphaTest: 0.5
	});

	const mesh = new THREE.Mesh(geometry, material);
	mesh.castShadow = true;
	mesh.receiveShadow = true;

	return {
		object: mesh,
		dispose() {
			geometry.dispose();
			material.dispose();
			texture.dispose();
		}
	};
}
