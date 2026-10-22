import * as THREE from 'three';

/**
 * A green phosphor picture for the Apple II monitor, drawn on a canvas and
 * shown through the screen material's emissive map. With the glow at zero
 * the screen looks exactly as the asset does, so the material can replace
 * the original from the start and be compiled with the rest of the scene.
 */

const SIZE = 1024;

// Where the glass sits in the screen mesh's UVs; outside it the canvas is
// never sampled. Canvas rows run top down and v bottom up.
const AREA = {
	x: 0.008 * SIZE,
	y: (1 - 0.874) * SIZE,
	width: (0.985 - 0.008) * SIZE,
	height: (0.874 - 0.126) * SIZE
};

// About half the Apple II's 40 columns, so the line still reads with the
// whole computer in view.
const COLUMNS = 18;
const CHAR_WIDTH = AREA.width / COLUMNS;
// Monospace faces are around 0.6em wide.
const FONT_SIZE = Math.round(CHAR_WIDTH / 0.6);
const LINE_HEIGHT = FONT_SIZE * 1.2;

// What the glass's own texture is multiplied by while the tube is on. Left
// as it is, the pale grey-green washes the text out on the light desk.
const DIMMED_GLASS = 0.3;

const PHOSPHOR = '#5dff8a';
const PHOSPHOR_GLOW = 'rgba(80, 255, 130, 0.75)';
const TUBE = '#03120a';

export interface ScreenPicture {
	/** 0 is off; on the way to 1 the picture opens out like a warming tube. */
	power: number;
	lines: string[];
	cursor: boolean;
}

export interface ComputerScreen {
	material: THREE.MeshStandardMaterial;
	draw(picture: ScreenPicture): void;
	/** Emissive strength; 0 leaves the screen exactly as the asset has it. */
	setGlow(intensity: number): void;
	dispose(): void;
}

function smoothstep(t: number) {
	const x = THREE.MathUtils.clamp(t, 0, 1);
	return x * x * (3 - 2 * x);
}

export function createComputerScreen(source: THREE.MeshStandardMaterial): ComputerScreen {
	const canvas = document.createElement('canvas');
	canvas.width = SIZE;
	canvas.height = SIZE;
	const context = canvas.getContext('2d')!;
	context.fillStyle = '#000';
	context.fillRect(0, 0, SIZE, SIZE);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 4;

	const material = source.clone();
	material.emissive.set(0xffffff);
	material.emissiveMap = texture;
	material.emissiveIntensity = 0;

	// Only redrawn when what it shows changes, not every frame.
	let drawn = '';

	function paintText(lines: string[], cursor: boolean) {
		context.font = `bold ${FONT_SIZE}px "Courier New", ui-monospace, monospace`;
		context.textBaseline = 'top';
		context.fillStyle = PHOSPHOR;
		context.shadowColor = PHOSPHOR_GLOW;
		context.shadowBlur = FONT_SIZE * 0.25;

		// Clear of the rounded corners of the glass.
		const left = AREA.x + CHAR_WIDTH * 1.5;
		const top = AREA.y + LINE_HEIGHT;
		lines.forEach((line, row) => context.fillText(line, left, top + row * LINE_HEIGHT));

		if (cursor) {
			const row = Math.max(lines.length - 1, 0);
			const x = left + context.measureText(lines[row] ?? '').width;
			context.fillRect(x, top + row * LINE_HEIGHT, CHAR_WIDTH * 0.9, FONT_SIZE * 0.95);
		}
		context.shadowBlur = 0;
	}

	function paintTube() {
		// Scanlines, then the falloff towards the edge of the glass.
		context.fillStyle = 'rgba(0, 0, 0, 0.3)';
		for (let y = AREA.y; y < AREA.y + AREA.height; y += 6) {
			context.fillRect(AREA.x, y, AREA.width, 2);
		}
		const vignette = context.createRadialGradient(
			SIZE / 2,
			SIZE / 2,
			AREA.height * 0.35,
			SIZE / 2,
			SIZE / 2,
			AREA.width * 0.62
		);
		vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
		vignette.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
		context.fillStyle = vignette;
		context.fillRect(AREA.x, AREA.y, AREA.width, AREA.height);
	}

	function draw({ power, lines, cursor }: ScreenPicture) {
		// The warm-up only has a few distinguishable steps.
		const step = Math.round(THREE.MathUtils.clamp(power, 0, 1) * 16);
		const key = `${step}|${cursor}|${lines.join('\n')}`;
		if (key === drawn) return;
		drawn = key;

		context.fillStyle = '#000';
		context.fillRect(0, 0, SIZE, SIZE);

		if (step > 0) {
			const warmth = step / 16;
			// A line across the middle first, then it opens to the full height.
			const width = AREA.width * smoothstep(warmth / 0.35);
			const height = Math.max(4, AREA.height * smoothstep((warmth - 0.35) / 0.65));

			context.save();
			context.beginPath();
			context.rect(SIZE / 2 - width / 2, SIZE / 2 - height / 2, width, height);
			context.clip();

			context.fillStyle = TUBE;
			context.fillRect(AREA.x, AREA.y, AREA.width, AREA.height);
			paintText(lines, cursor);
			paintTube();

			// The flash of a tube that has only just come on.
			context.fillStyle = `rgba(200, 255, 215, ${(1 - warmth) * 0.85})`;
			context.fillRect(AREA.x, AREA.y, AREA.width, AREA.height);
			context.restore();
		}

		texture.needsUpdate = true;
	}

	return {
		material,
		draw,
		setGlow(intensity) {
			material.emissiveIntensity = intensity;
			material.color.setScalar(intensity > 0 ? DIMMED_GLASS : 1);
		},
		dispose() {
			texture.dispose();
			material.dispose();
		}
	};
}
