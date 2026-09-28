import * as THREE from 'three';

export interface SteamAppearance {
	color: number;
	opacity: number;
	additive: boolean;
}

export interface Steam {
	object: THREE.Object3D;
	setOrigin(origin: THREE.Vector3): void;
	update(elapsed: number): void;
	setAppearance(appearance: SteamAppearance): void;
	dispose(): void;
}

const SEGMENTS = 96;
const RISE = 0.36;

interface RibbonShape {
	phase: number;
	turns: number;
	radius: number;
	flare: number;
	speed: number;
	width: number;
}

const SHAPES: RibbonShape[] = [
	{ phase: 0, turns: 1.35, radius: 0.012, flare: 0.05, speed: 1.0, width: 0.02 },
	{ phase: 2.3, turns: 1.05, radius: 0.017, flare: 0.065, speed: 0.82, width: 0.017 },
	{ phase: 4.3, turns: 1.6, radius: 0.009, flare: 0.042, speed: 1.22, width: 0.014 }
];

/**
 * Builds one helix as a two-vertex-wide strip. The strip is turned to face the
 * camera in the vertex shader, so it reads as a ribbon of smoke from any angle
 * without needing a texture.
 */
function buildRibbon(shape: RibbonShape): THREE.BufferGeometry {
	const count = SEGMENTS + 1;
	const position = new Float32Array(count * 2 * 3);
	const tangent = new Float32Array(count * 2 * 3);
	const side = new Float32Array(count * 2);
	const along = new Float32Array(count * 2);
	const index: number[] = [];

	const point = new THREE.Vector3();
	const ahead = new THREE.Vector3();
	const behind = new THREE.Vector3();
	const direction = new THREE.Vector3();

	const sample = (t: number, out: THREE.Vector3) => {
		const angle = shape.phase + t * shape.turns * Math.PI * 2;
		const radius = shape.radius + t * shape.flare;
		out.set(Math.cos(angle) * radius, t * RISE, Math.sin(angle) * radius);
	};

	const step = 1 / SEGMENTS;

	for (let i = 0; i < count; i += 1) {
		const t = i * step;
		sample(t, point);
		// Central difference keeps the tangent stable at both ends.
		sample(Math.min(t + step, 1), ahead);
		sample(Math.max(t - step, 0), behind);
		direction.subVectors(ahead, behind).normalize();

		for (let s = 0; s < 2; s += 1) {
			const vertex = i * 2 + s;
			position[vertex * 3] = point.x;
			position[vertex * 3 + 1] = point.y;
			position[vertex * 3 + 2] = point.z;
			tangent[vertex * 3] = direction.x;
			tangent[vertex * 3 + 1] = direction.y;
			tangent[vertex * 3 + 2] = direction.z;
			side[vertex] = s === 0 ? -1 : 1;
			along[vertex] = t;
		}

		if (i < SEGMENTS) {
			const a = i * 2;
			const b = a + 1;
			const c = a + 2;
			const d = a + 3;
			index.push(a, b, c, b, d, c);
		}
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
	geometry.setAttribute('aTangent', new THREE.BufferAttribute(tangent, 3));
	geometry.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
	geometry.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
	geometry.setIndex(index);
	return geometry;
}

const VERTEX_SHADER = /* glsl */ `
	#include <common>
	#include <logdepthbuf_pars_vertex>
	attribute vec3 aTangent;
	attribute float aSide;
	attribute float aAlong;
	uniform float uWidth;
	varying float vAlong;
	varying float vSide;
	void main() {
		vAlong = aAlong;
		vSide = aSide;

		vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
		vec3 viewTangent = normalize(normalMatrix * aTangent);
		// Perpendicular to the curve on screen: this is what makes the strip
		// face the camera without a billboard matrix.
		vec2 across = normalize(vec2(-viewTangent.y, viewTangent.x));

		// Narrow at the spout, widest in the middle, dispersing at the top.
		float taper = 0.3 + 1.25 * sin(aAlong * PI);
		viewPosition.xy += aSide * uWidth * taper * across;

		gl_Position = projectionMatrix * viewPosition;
		#include <logdepthbuf_vertex>
	}
`;

const FRAGMENT_SHADER = /* glsl */ `
	#include <common>
	#include <logdepthbuf_pars_fragment>
	uniform vec3 uColor;
	uniform float uOpacity;
	uniform float uTime;
	uniform float uSpeed;
	varying float vAlong;
	varying float vSide;
	void main() {
		#include <logdepthbuf_fragment>

		// Soft edges across the ribbon.
		float edge = 1.0 - abs(vSide);
		edge *= edge;

		// Rises out of the cup, thins out before the top.
		float lifetime = smoothstep(0.0, 0.16, vAlong) * (1.0 - smoothstep(0.5, 1.0, vAlong));

		// Bands of density travelling up the ribbon read as movement.
		float band = 0.45 + 0.55 * sin(vAlong * 7.0 - uTime * uSpeed * 1.7);
		band *= 0.65 + 0.35 * sin(vAlong * 3.1 + uTime * uSpeed * 0.9);

		float alpha = edge * lifetime * band * uOpacity;
		if (alpha < 0.002) discard;
		gl_FragColor = vec4(uColor, alpha);
	}
`;

export function createSteam(appearance: SteamAppearance): Steam {
	const group = new THREE.Group();
	group.visible = false;
	group.frustumCulled = false;

	const geometries: THREE.BufferGeometry[] = [];
	const materials: THREE.ShaderMaterial[] = [];

	for (const shape of SHAPES) {
		const geometry = buildRibbon(shape);
		const material = new THREE.ShaderMaterial({
			uniforms: {
				uColor: { value: new THREE.Color(appearance.color) },
				uOpacity: { value: appearance.opacity },
				uTime: { value: 0 },
				uSpeed: { value: shape.speed },
				uWidth: { value: shape.width }
			},
			vertexShader: VERTEX_SHADER,
			fragmentShader: FRAGMENT_SHADER,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide,
			blending: appearance.additive ? THREE.AdditiveBlending : THREE.NormalBlending
		});

		const mesh = new THREE.Mesh(geometry, material);
		mesh.frustumCulled = false;
		group.add(mesh);

		geometries.push(geometry);
		materials.push(material);
	}

	return {
		object: group,

		setOrigin(origin) {
			group.position.copy(origin);
			group.visible = true;
		},

		update(elapsed) {
			for (const material of materials) {
				material.uniforms.uTime.value = elapsed;
			}
			// A slow turn stops the three helices from reading as fixed geometry.
			group.rotation.y = elapsed * 0.12;
		},

		setAppearance(next) {
			for (const material of materials) {
				material.uniforms.uColor.value.set(next.color);
				material.uniforms.uOpacity.value = next.opacity;
				material.blending = next.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
				material.needsUpdate = true;
			}
		},

		dispose() {
			for (const geometry of geometries) geometry.dispose();
			for (const material of materials) material.dispose();
		}
	};
}
