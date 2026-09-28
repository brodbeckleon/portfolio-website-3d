import * as THREE from 'three';

export interface HoverGlowAppearance {
	color: number;
	/**
	 * Linear light added at the centre. The scene renders in HDR and a lit
	 * floor already sits well above 1.0, so anything at or below 1.0 is dimmer
	 * than what it covers and disappears after tone mapping. Push this up until
	 * the pool reads against the floor it sits on.
	 */
	strength: number;
	/** 0..1 mask on top of the strength. */
	opacity: number;
	/**
	 * Fraction of the radius that stays at full strength before the edge
	 * feathers out. 0 gives a soft radial haze, ~0.5 gives a defined disc that
	 * reads as a spotlight pool on the floor.
	 */
	core: number;
}

export interface HoverGlow {
	object: THREE.Object3D;
	/**
	 * @param target world position to pool light under, or null while fading out
	 * @param level  0..1 visibility, owned by the caller so the pool and the
	 *               spotlight it belongs to cannot drift apart
	 */
	update(target: THREE.Vector3 | null, level: number): void;
	setAppearance(appearance: HoverGlowAppearance): void;
	dispose(): void;
}

const RADIUS = 1.25;

const FRAGMENT_SHADER = /* glsl */ `
	#include <common>
	#include <logdepthbuf_pars_fragment>
	uniform vec3 uColor;
	uniform float uOpacity;
	uniform float uStrength;
	uniform float uFade;
	uniform float uCore;
	varying vec2 vUv;
	void main() {
		#include <logdepthbuf_fragment>
		float dist = length(vUv - vec2(0.5)) * 2.0;
		// Flat out to uCore, feathered from there to the rim.
		float falloff = 1.0 - smoothstep(uCore, 1.0, dist);
		float alpha = falloff * falloff * uOpacity * uFade;
		if (alpha < 0.002) discard;
		// Strength rides on the colour, not the alpha: the blend factor is
		// clamped to 0..1, so brightness above that has to come from here.
		gl_FragColor = vec4(uColor * uStrength, alpha);
	}
`;

const VERTEX_SHADER = /* glsl */ `
	#include <common>
	#include <logdepthbuf_pars_vertex>
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		#include <logdepthbuf_vertex>
	}
`;

/**
 * A pool of light painted onto the floor under whatever is hovered.
 *
 * A spotlight alone cannot do this job: the dark floor material and the
 * near-white computer reflect the same light completely differently, so any
 * setting bright enough to show the floor blows out the object. Decoupling the
 * two lets each be dialled in on its own.
 */
export function createHoverGlow(appearance: HoverGlowAppearance): HoverGlow {
	const geometry = new THREE.PlaneGeometry(RADIUS * 2, RADIUS * 2);
	const material = new THREE.ShaderMaterial({
		uniforms: {
			uColor: { value: new THREE.Color(appearance.color) },
			uOpacity: { value: appearance.opacity },
			uStrength: { value: appearance.strength },
			uFade: { value: 0 },
			uCore: { value: appearance.core }
		},
		vertexShader: VERTEX_SHADER,
		fragmentShader: FRAGMENT_SHADER,
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending
	});

	const mesh = new THREE.Mesh(geometry, material);
	mesh.rotation.x = -Math.PI / 2;
	// Just clear of the floor, so it never fights it for depth.
	mesh.position.y = 0.004;
	mesh.renderOrder = 1;
	mesh.visible = false;

	return {
		object: mesh,

		update(target, level) {
			material.uniforms.uFade.value = Math.max(level, 0);

			// Keep the last position while fading out, so it does not slide away.
			if (target) {
				mesh.position.x = target.x;
				mesh.position.z = target.z;
			}

			mesh.visible = level > 0.004;
		},

		setAppearance(next) {
			material.uniforms.uColor.value.set(next.color);
			material.uniforms.uOpacity.value = next.opacity;
			material.uniforms.uStrength.value = next.strength;
			material.uniforms.uCore.value = next.core;
		},

		dispose() {
			geometry.dispose();
			material.dispose();
		}
	};
}
