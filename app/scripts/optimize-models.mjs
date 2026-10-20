/**
 * Rebuilds the scene models in src/lib/assets/models from the full-size
 * sources in assets-src/models (which are not deployed).
 *
 * The tools are not app dependencies, so install them ad hoc first:
 *   npm i --no-save @gltf-transform/core@4.5.1 @gltf-transform/extensions@4.5.1 \
 *     @gltf-transform/functions@4.5.1 meshoptimizer@1.3.0 sharp@0.35.5
 *   node scripts/optimize-models.mjs
 *
 * Every model ends up meshopt-compressed (the loader only registers the
 * meshopt decoder) with WebP textures sized for how small each object is on
 * screen. The base colour and normal maps keep their resolution where an
 * object can fill a good part of the view; the metal/roughness maps carry
 * less visible detail and go down first.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
	compactPrimitive,
	dedup,
	flatten,
	instance,
	join,
	meshopt,
	palette,
	prune,
	sparse,
	textureCompress,
	weld
} from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (name) => path.join(root, 'assets-src/models', name);
const target = (name) => path.join(root, 'src/lib/assets/models', name);

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
	'meshopt.encoder': MeshoptEncoder,
	'meshopt.decoder': MeshoptDecoder
});

/** [size, quality, lossless?, nearLossless?] */
const webp = (slots, [size, quality, lossless = false, nearLossless = false]) =>
	textureCompress({
		encoder: sharp,
		targetFormat: 'webp',
		slots,
		resize: [size, size],
		quality,
		lossless,
		nearLossless,
		effort: 100
	});

/** Textured models: geometry is kept as is, only the textures are resized. */
async function optimizeTextured(name, { base, mr, normal, opaque = false, merge = false }) {
	const doc = await io.read(source(name));
	// The camera's single material is exported as BLEND, which the scene
	// overrides to opaque anyway; baking it in keeps it out of the
	// transparent pass.
	if (opaque) for (const material of doc.getRoot().listMaterials()) material.setAlphaMode('OPAQUE');

	await doc.transform(
		dedup(),
		prune({ keepAttributes: false, keepSolidTextures: false }),
		flatten(),
		// Only for models whose parts share one material: one draw call
		// instead of one per part. The computer stays split because joining it
		// makes the hover raycast slower.
		...(merge ? [weld(), join()] : []),
		webp(/^baseColor/, base),
		webp(/^metallicRoughness/, mr),
		webp(/^normal/, normal),
		prune(),
		sparse(),
		meshopt({ encoder: MeshoptEncoder, level: 'high' })
	);
	await io.write(target(name), doc);
}

/**
 * The lamp is ~750k triangles for an object a few hundred pixels tall, so it
 * is the one model that gets simplified. The simplifier weighs normals as
 * well as positions, which keeps the reflections on the shiny metal parts
 * where they were rather than only the silhouette.
 */
async function optimizeLamp(name, { error, normalWeight }) {
	const doc = await io.read(source(name));
	await doc.transform(dedup(), prune(), flatten());

	// Fully flat-shaded parts lose their normals: GLTFLoader then turns on
	// flatShading, which reproduces the facets exactly and lets weld and the
	// simplifier see one connected surface instead of split vertices.
	const a = [];
	const b = [];
	const c = [];
	for (const mesh of doc.getRoot().listMeshes()) {
		for (const primitive of mesh.listPrimitives()) {
			const normals = primitive.getAttribute('NORMAL');
			const indices = primitive.getIndices();
			if (!normals || !indices) continue;
			const triangles = indices.getCount() / 3;
			let flat = 0;
			for (let i = 0; i < triangles; i++) {
				normals.getElement(indices.getScalar(3 * i), a);
				normals.getElement(indices.getScalar(3 * i + 1), b);
				normals.getElement(indices.getScalar(3 * i + 2), c);
				if (a.every((v, k) => Math.abs(v - b[k]) < 1e-4 && Math.abs(v - c[k]) < 1e-4)) flat++;
			}
			if (flat / triangles > 0.99) primitive.setAttribute('NORMAL', null);
		}
	}

	await doc.transform(
		prune({ keepAttributes: false }),
		weld(),
		(document) => {
			for (const mesh of document.getRoot().listMeshes()) {
				for (const primitive of mesh.listPrimitives()) {
					const indices = primitive.getIndices();
					if (!indices) continue;
					const positions = Float32Array.from(primitive.getAttribute('POSITION').getArray());
					const normals = primitive.getAttribute('NORMAL');
					const input = new Uint32Array(indices.getArray());
					const [simplified] = normals
						? MeshoptSimplifier.simplifyWithAttributes(
								input,
								positions,
								3,
								Float32Array.from(normals.getArray()),
								3,
								[normalWeight, normalWeight, normalWeight],
								null,
								0,
								error,
								[]
							)
						: MeshoptSimplifier.simplify(input, positions, 3, 0, error, []);
					primitive.setIndices(
						document
							.createAccessor()
							.setType('SCALAR')
							.setArray(simplified)
							.setBuffer(indices.getBuffer())
					);
					compactPrimitive(primitive);
				}
			}
		},
		// Untextured materials collapse into a tiny palette texture, so the
		// parts can be joined into a handful of draw calls.
		palette({ min: 2 }),
		join(),
		instance({ min: 2 }),
		prune(),
		sparse(),
		meshopt({ encoder: MeshoptEncoder, level: 'high' })
	);
	await io.write(target(name), doc);
}

await optimizeTextured('computer.glb', { base: [1024, 85], mr: [512, 90], normal: [1024, 90] });
await optimizeTextured('camera.glb', {
	base: [1024, 85],
	mr: [512, 90, false, true],
	normal: [1024, 90],
	opaque: true,
	merge: true
});
// ~100-160 px on screen even fully zoomed in: the 4096² sources were far
// beyond what can ever be sampled.
await optimizeTextured('coffee_cup.glb', { base: [1024, 85], mr: [256, 90], normal: [1024, 90] });
await optimizeLamp('desk_lamp.glb', { error: 0.001, normalWeight: 0.2 });

console.log('models written to src/lib/assets/models');
