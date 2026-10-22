import * as THREE from 'three';

/**
 * An instant photo lying on the desk. Real ones never lie flat: the print
 * bows across its width as it dries and a corner tends to lift, so the card
 * is a finely divided plane bent that way rather than a flat quad. The bend
 * also lets the lamp and the key light shade it, and its raised edges cast
 * a sliver of shadow on the desk.
 *
 * Under the card sits a soft contact shadow. The real shadow is only as
 * wide as the lift at the edges, and a white card on the pale desk needs a
 * darker rim than that to stand out from it.
 */

// A little larger than a real 88 mm card would be at the desk's scale, so
// the face still reads from the default view; the photo's own proportions.
const WIDTH = 0.3;
const HEIGHT = WIDTH * (1291 / 1080);
const SEGMENTS_X = 24;
const SEGMENTS_Y = 28;

// How far the contact shadow reaches past the card, and how far it falls
// towards the back of the desk, away from the key light in front.
const SHADOW_SPREAD = 1.16;
const SHADOW_OFFSET = new THREE.Vector2(0.004, 0.01);
// Just under the card, in the card's own space (its z is up off the desk).
const SHADOW_DROP = 0.0007;

export interface PolaroidShape {
	/** Lift at the long edges, as a share of half the width. */
	bow: number;
	/** Extra lift at the bottom right corner, likewise. */
	cornerCurl: number;
}

/** A few millimetres on the real thing. */
export const CURLED: PolaroidShape = { bow: 0.05, cornerCurl: 0.07 };
/**
 * For a card with another lying on it: the one on top would hold it down,
 * and its edges must stay under the top card's contact shadow.
 */
export const PRESSED_FLAT: PolaroidShape = { bow: 0.02, cornerCurl: 0 };

export interface Polaroid {
	/** The card and its contact shadow; lies flat in its xy plane, z up. */
	object: THREE.Group;
	setShadowOpacity(opacity: number): void;
	dispose(): void;
}

function bend(geometry: THREE.PlaneGeometry, { bow, cornerCurl }: PolaroidShape) {
	const positions = geometry.getAttribute('position');
	for (let i = 0; i < positions.count; i += 1) {
		const u = positions.getX(i) / (WIDTH / 2);
		const v = positions.getY(i) / (HEIGHT / 2);
		// Bottom right, the corner a thumb peels it up by.
		const corner = THREE.MathUtils.clamp((u - v) / 2 - 0.45, 0, 1) / 0.55;
		const lift = bow * u * u + cornerCurl * corner * corner;
		positions.setZ(i, lift * (WIDTH / 2));
	}
	geometry.computeVertexNormals();
}

/** A blurred rounded rectangle, black with the falloff in alpha. */
function createShadowTexture(): THREE.CanvasTexture {
	const width = 128;
	const height = Math.round(width * (HEIGHT / WIDTH));
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d')!;
	const image = context.createImageData(width, height);

	// The card's outline inside the spread, and how soft its edge is.
	const halfX = width / 2 / SHADOW_SPREAD;
	const halfY = height / 2 / SHADOW_SPREAD;
	const feather = (width / 2) * (SHADOW_SPREAD - 1) * 1.6;
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const dx = Math.max(Math.abs(x + 0.5 - width / 2) - halfX + feather / 2, 0);
			const dy = Math.max(Math.abs(y + 0.5 - height / 2) - halfY + feather / 2, 0);
			const t = THREE.MathUtils.clamp(Math.hypot(dx, dy) / feather, 0, 1);
			image.data[(y * width + x) * 4 + 3] = Math.round(255 * (1 - t * t * (3 - 2 * t)));
		}
	}
	context.putImageData(image, 0, 0);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

/**
 * @param texture the photo with its frame; the transparent rim around the
 *                card is cut away by the alpha test, shadow included.
 */
export function createPolaroid(
	texture: THREE.Texture,
	shape: PolaroidShape = CURLED,
	shadowOpacity = 0.5
): Polaroid {
	texture.colorSpace = THREE.SRGBColorSpace;

	const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, SEGMENTS_X, SEGMENTS_Y);
	bend(geometry, shape);

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

	const card = new THREE.Mesh(geometry, material);
	card.castShadow = true;
	card.receiveShadow = true;

	const shadowGeometry = new THREE.PlaneGeometry(WIDTH * SHADOW_SPREAD, HEIGHT * SHADOW_SPREAD);
	const shadowTexture = createShadowTexture();
	// Unlit and without depth writes: it only darkens what is under it.
	const shadowMaterial = new THREE.MeshBasicMaterial({
		color: 0x000000,
		map: shadowTexture,
		transparent: true,
		opacity: shadowOpacity,
		depthWrite: false
	});
	const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
	shadow.position.set(SHADOW_OFFSET.x, SHADOW_OFFSET.y, -SHADOW_DROP);

	const object = new THREE.Group();
	object.add(shadow, card);

	return {
		object,
		setShadowOpacity(opacity) {
			shadowMaterial.opacity = opacity;
		},
		dispose() {
			geometry.dispose();
			material.dispose();
			texture.dispose();
			shadowGeometry.dispose();
			shadowMaterial.dispose();
			shadowTexture.dispose();
		}
	};
}
