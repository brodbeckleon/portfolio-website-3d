<script lang="ts">
	import * as THREE from 'three';
	import { FrontSide, Mesh, MeshStandardMaterial, Object3D } from 'three';
	import {
		OrbitControls,
		EffectComposer,
		RenderPass,
		RoomEnvironment,
		UnrealBloomPass
	} from 'three-stdlib';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { loadModel, preloadModels } from '$lib/modelCache.ts';
	import { createSteam } from '$lib/steam.ts';
	import { createHoverGlow } from '$lib/hoverGlow.ts';
	import { initTheme, theme as themeStore } from '$lib/theme.svelte.ts';
	import { onMount } from 'svelte';

	interface ThreePortfolioProps {
		isMobile: boolean;
	}

	let { isMobile }: ThreePortfolioProps = $props();

	const isHelperNeeded: boolean = false;
	let isLoading = $state(true);
	let loadedModels = $state(0);
	const totalModels = 4;

	// Shared with the header's toggle, so switching there relights the scene
	// instead of only recolouring the HTML around it.
	let prefersDarkMode = $derived(themeStore.isDark);

	const MODEL_URLS = {
		camera: '/models/camera.glb',
		computer: '/models/computer.glb',
		deskLamp: '/models/draco-desk_lamp.glb',
		coffeeCup: '/models/coffee_cup.glb'
	};

	onMount(() => {
		initTheme();
		preloadModels(Object.values(MODEL_URLS));
	});

	const theme = {
		dark: {
			background: 0x0d0d0d,
			floorColor: 0x2a1e15,
			ambientColor: 0x3d342a,
			directionalLightColor: 0xffd5a5,
			spotLightColor: 0xffe0a0,
			pointLightColor: 0xffe0a0,
			textColor: '#FFFFFF',
			subTextColor: '#999999',
			bloomStrength: 0.7,
			bloomThreshold: 0.7,
			ambientIntensity: 0.14,
			directionalIntensity: 2.4,
			deskLampShadowIntensity: 2,
			deskLampIntensity: 1.0,
			// Per-model image-based light: the only way to brighten one object
			// without touching the rest of the scene.
			cameraEnvIntensity: 2.0,
			macEnvIntensity: 0.75,
			exposure: 1.1,
			environmentIntensity: 0.18,
			hemisphereIntensity: 0.12,
			// Flat falloff: with a steep one the lit object burns out long
			// before the pool of light around it reads on the floor.
			hoverIntensity: 2.0,
			hoverDecay: 0.25,
			hoverPenumbra: 0.55,
			hoverFlickers: true,
			hoverGlowColor: 0xffd9a8,
			hoverGlowStrength: 1.0,
			hoverGlowOpacity: 0.5,
			hoverGlowCore: 0.0,
			steamColor: 0xffffff,
			steamOpacity: 0.34,
			steamAdditive: true
		},
		light: {
			background: 0xf0f0f0,
			floorColor: 0xe0d5c8,
			ambientColor: 0xffffff,
			directionalLightColor: 0xfff5e6,
			spotLightColor: 0xfff0d0,
			pointLightColor: 0xfff0d0,
			textColor: '#010101',
			subTextColor: '#444444',
			bloomStrength: 0.2,
			bloomThreshold: 0.9,
			ambientIntensity: 0.15,
			directionalIntensity: 2.2,
			deskLampShadowIntensity: 1.5,
			// The bright floor needs far less from the lamp than the dark one:
			// at full strength it burned out the whole pool.
			deskLampIntensity: 0.3,
			cameraEnvIntensity: 2.6,
			macEnvIntensity: 0.45,
			exposure: 0.95,
			environmentIntensity: 0.5,
			// Lifts the dark camera body, which direct light alone leaves muddy.
			hemisphereIntensity: 0.55,
			// Off on purpose: the lit floor sells the spotlight, and any real
			// light bright enough to read on the pale floor blows out the case.
			hoverIntensity: 0,
			hoverDecay: 0.3,
			hoverPenumbra: 0.7,
			hoverFlickers: false,
			hoverGlowColor: 0xffffff,
			// Has to out-shine a floor that is already bright before the pool
			// can read as a spotlight on it.
			hoverGlowStrength: 2.6,
			hoverGlowOpacity: 0.9,
			hoverGlowCore: 0.45,
			steamColor: 0xffffff,
			steamOpacity: 0.5,
			steamAdditive: false
		}
	};

	const SCALE_FACTOR = 1.5;

	/**
	 * Svelte Action for initializing the Three.js scene.
	 */
	const threeSceneAction = (node: HTMLDivElement) => {
		const currentTheme = prefersDarkMode ? theme.dark : theme.light;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(currentTheme.background);

		const camera = new THREE.PerspectiveCamera(40, node.clientWidth / node.clientHeight, 0.1, 100);
		camera.position.set(0.75, 0.3, 1.8);

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			logarithmicDepthBuffer: true,
			alpha: true
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(node.clientWidth, node.clientHeight);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		// Filmic response rolls off the highlights the strong key light would
		// otherwise clip, which is what made the render look flat and blown out.
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = currentTheme.exposure;
		node.appendChild(renderer.domElement);

		// Image-based lighting: gives the metal and ceramic something to reflect
		// instead of leaving them lit by direct lights alone.
		const pmrem = new THREE.PMREMGenerator(renderer);
		pmrem.compileEquirectangularShader();
		const environmentRT = pmrem.fromScene(RoomEnvironment(), 0.04);
		scene.environment = environmentRT.texture;
		scene.environmentIntensity = currentTheme.environmentIntensity;

		const composer = new EffectComposer(renderer);
		const renderPass = new RenderPass(scene, camera);
		composer.addPass(renderPass);

		const bloomPass = new UnrealBloomPass(
			new THREE.Vector2(node.clientWidth, node.clientHeight),
			currentTheme.bloomStrength,
			0.3,
			currentTheme.bloomThreshold
		);
		composer.addPass(bloomPass);

		// --- Floor (scaled up) ---
		const floorGeo = new THREE.CircleGeometry(8 * SCALE_FACTOR, 64);
		const floorMat = new THREE.MeshStandardMaterial({
			color: currentTheme.floorColor,
			roughness: 0.9,
			metalness: 0.1
		});
		const floor = new THREE.Mesh(floorGeo, floorMat);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		scene.add(floor);

		// --- Lights ---
		const ambient = new THREE.AmbientLight(
			currentTheme.ambientColor,
			currentTheme.ambientIntensity
		);
		scene.add(ambient);

		// Sky/ground fill: raises shadowed sides without flattening the scene
		// the way more ambient would.
		const hemisphereLight = new THREE.HemisphereLight(
			0xffffff,
			currentTheme.floorColor,
			currentTheme.hemisphereIntensity
		);
		scene.add(hemisphereLight);

		const directionalLight = new THREE.DirectionalLight(
			currentTheme.directionalLightColor,
			currentTheme.directionalIntensity
		);
		directionalLight.position.set(0, 2.5 * SCALE_FACTOR, 0.75 * SCALE_FACTOR);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.width = 2048;
		directionalLight.shadow.mapSize.height = 2048;
		directionalLight.shadow.camera.near = 0.2;
		directionalLight.shadow.camera.left = -2.5 * SCALE_FACTOR;
		directionalLight.shadow.camera.right = 2.5 * SCALE_FACTOR;
		directionalLight.shadow.camera.top = 2.5 * SCALE_FACTOR;
		directionalLight.shadow.camera.bottom = -2.5 * SCALE_FACTOR;
		directionalLight.shadow.camera.far = 8 * SCALE_FACTOR;
		scene.add(directionalLight);

		const lightTarget = new THREE.Object3D();
		lightTarget.position.set(0.3 * SCALE_FACTOR, 0.5 * SCALE_FACTOR, -1 * SCALE_FACTOR);
		scene.add(lightTarget);
		directionalLight.target = lightTarget;

		const deskLampSpotLight = new THREE.SpotLight(
			currentTheme.spotLightColor,
			currentTheme.deskLampIntensity,
			0,
			Math.PI / 3,
			0.9,
			1
		);
		deskLampSpotLight.position.set(-0.72, 0.9, -0.6);
		deskLampSpotLight.castShadow = true;
		deskLampSpotLight.shadow.mapSize.width = 1024;
		deskLampSpotLight.shadow.mapSize.height = 1024;
		deskLampSpotLight.shadow.intensity = currentTheme.deskLampShadowIntensity;
		scene.add(deskLampSpotLight);

		const deskLampPointLight = new THREE.PointLight(
			currentTheme.pointLightColor,
			currentTheme.deskLampIntensity * 0.3,
			6
		);
		deskLampPointLight.position.copy(deskLampSpotLight.position);
		deskLampPointLight.castShadow = false;
		scene.add(deskLampPointLight);

		if (isHelperNeeded) {
			const helper = new THREE.SpotLightHelper(deskLampSpotLight, 0.1);
			scene.add(helper);
			const helper2 = new THREE.PointLightHelper(deskLampPointLight, 0.1, 0xff0000);
			scene.add(helper2);
		}

		// --- Hover Spotlight ---
		const hoverSpotLight = new THREE.SpotLight(
			currentTheme.spotLightColor,
			1,
			15,
			Math.PI / 8,
			0.15,
			0
		);
		hoverSpotLight.position.set(0, 3 * SCALE_FACTOR, 0);
		hoverSpotLight.castShadow = true;
		hoverSpotLight.shadow.mapSize.width = 2048;
		hoverSpotLight.shadow.mapSize.height = 2048;
		hoverSpotLight.shadow.bias = -0.001;
		hoverSpotLight.shadow.radius = 2;
		hoverSpotLight.penumbra = currentTheme.hoverPenumbra;
		hoverSpotLight.angle = Math.PI / 9;
		hoverSpotLight.decay = currentTheme.hoverDecay;
		hoverSpotLight.shadow.camera.near = 0.5;
		hoverSpotLight.shadow.camera.far = 7 * SCALE_FACTOR;
		hoverSpotLight.shadow.camera.fov = 50;
		scene.add(hoverSpotLight);

		const hoverLightTarget = new THREE.Object3D();
		hoverLightTarget.position.set(0, 0, 0);
		scene.add(hoverLightTarget);
		hoverSpotLight.target = hoverLightTarget;

		// --- Text Labels ---
		function stripHtml(html: string): string {
			const tmp = document.createElement('div');
			tmp.innerHTML = html;
			return tmp.textContent || tmp.innerText || '';
		}

		function createTextTexture(
			text: string,
			fontSize: number = 40,
			fillColor: string,
			textAlignment: CanvasTextAlign = 'center',
			isBold: boolean = false
		): THREE.CanvasTexture {
			const cleanText = stripHtml(text);
			const lines = cleanText.split('\n');
			const lineHeight = fontSize * 1.5;
			const canvasWidth = 2048;
			const canvasHeight = Math.max(512, lines.length * lineHeight + 80);

			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d')!;
			canvas.width = canvasWidth;
			canvas.height = canvasHeight;

			context.clearRect(0, 0, canvasWidth, canvasHeight);
			context.fillStyle = fillColor;
			context.font = `${isBold ? 'bold ' : ''}${fontSize}px Helvetica Neue, Arial, sans-serif`;
			context.textAlign = textAlignment;
			context.textBaseline = 'middle';

			const startY = canvasHeight / 2 - ((lines.length - 1) * lineHeight) / 2;
			const xPosition = textAlignment === 'right' ? canvasWidth - 80 : canvasWidth / 2;

			lines.forEach((line, index) => {
				context.fillText(line, xPosition, startY + index * lineHeight);
			});

			const texture = new THREE.CanvasTexture(canvas);
			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
			texture.generateMipmaps = false;
			return texture;
		}

		function createTextPlane(
			text: string,
			position: THREE.Vector3,
			scene: THREE.Scene,
			height: number = 0.45 * SCALE_FACTOR,
			rotation: number = 0,
			heightOffset: number = 0.015,
			renderOrder: number = 0,
			fillColor: string,
			textAlignment: CanvasTextAlign = 'center',
			isBold: boolean = false,
			fontSize: number = 40
		): THREE.Mesh {
			const texture = createTextTexture(text, fontSize, fillColor, textAlignment, isBold);
			const material = new THREE.MeshStandardMaterial({
				map: texture,
				transparent: true,
				depthWrite: true,
				side: THREE.DoubleSide,
				polygonOffset: true,
				polygonOffsetFactor: -1,
				polygonOffsetUnits: -1
			});

			const aspectRatio = texture.image.width / texture.image.height;
			const adjustedWidth = height * aspectRatio;
			const geometry = new THREE.PlaneGeometry(adjustedWidth, height);
			const plane = new THREE.Mesh(geometry, material);

			plane.rotation.x = -Math.PI / 2;
			plane.position.copy(position);
			plane.position.y = heightOffset;
			plane.rotateZ(rotation);
			plane.renderOrder = renderOrder;

			scene.add(plane);
			return plane;
		}

		let photographyTextMesh: THREE.Mesh;
		let itTextMesh: THREE.Mesh;
		let welcomeTextMesh: THREE.Mesh;

		// Photography text
		photographyTextMesh = createTextPlane(
			m.photography(),
			new THREE.Vector3(-0.675, 0, 0),
			scene,
			0.3 * SCALE_FACTOR,
			(Math.PI / 180) * 30,
			0.0015,
			1,
			currentTheme.subTextColor,
			'center',
			true,
			120
		);

		// IT text
		itTextMesh = createTextPlane(
			m.information_technology(),
			new THREE.Vector3(0.3, 0, -0.225),
			scene,
			0.3 * SCALE_FACTOR,
			0,
			0.003,
			2,
			currentTheme.subTextColor,
			'center',
			true,
			120
		);

		// Welcome text
		const welcomeTextString =
			m.welcome_message_1({ name: m.leon_shinichi() }) +
			'\n' +
			m.welcome_message_2({ place: m.zurich_switzerland() }) +
			'\n' +
			m.welcome_message_3() +
			'\n' +
			m.welcome_message_4();

		welcomeTextMesh = createTextPlane(
			welcomeTextString,
			new THREE.Vector3(0.12, 0, 0.225),
			scene,
			0.9 * SCALE_FACTOR,
			(Math.PI / 180) * 25,
			0.0045,
			3,
			currentTheme.textColor,
			'center',
			false,
			20
		);

		// --- Steam over the mug ---
		const steam = createSteam({
			color: currentTheme.steamColor,
			opacity: currentTheme.steamOpacity,
			additive: currentTheme.steamAdditive
		});
		scene.add(steam.object);

		const hoverGlow = createHoverGlow({
			color: currentTheme.hoverGlowColor,
			strength: currentTheme.hoverGlowStrength,
			opacity: currentTheme.hoverGlowOpacity,
			core: currentTheme.hoverGlowCore
		});
		scene.add(hoverGlow.object);

		/**
		 * Sits the plume on the mug's opening. Neither the bounding box centre
		 * nor the model origin find it — the handle drags the box sideways and
		 * the origin is wherever the asset was authored. Averaging the vertices
		 * in the topmost slice lands on the rim ring, whose centre is the axis
		 * of the cup, whatever the model does.
		 */
		function placeSteamAbove(model: THREE.Object3D) {
			const bounds = new THREE.Box3().setFromObject(model);
			const rimBand = bounds.max.y - (bounds.max.y - bounds.min.y) * 0.06;

			model.updateWorldMatrix(true, true);

			const rimSum = new THREE.Vector3();
			const vertex = new THREE.Vector3();
			let rimCount = 0;

			model.traverse((child) => {
				if (!(child instanceof Mesh)) return;
				const positions = child.geometry.getAttribute('position');
				if (!positions) return;
				for (let i = 0; i < positions.count; i += 1) {
					vertex.fromBufferAttribute(positions, i).applyMatrix4(child.matrixWorld);
					if (vertex.y >= rimBand) {
						rimSum.add(vertex);
						rimCount += 1;
					}
				}
			});

			if (rimCount > 0) {
				rimSum.divideScalar(rimCount);
				steam.setOrigin(new THREE.Vector3(rimSum.x, bounds.max.y - 0.02, rimSum.z));
			} else {
				steam.setOrigin(new THREE.Vector3(model.position.x, bounds.max.y - 0.02, model.position.z));
			}
		}

		let cameraModel: THREE.Object3D;
		let macintoshModel: THREE.Object3D;

		function forEachStandardMaterial(
			model: THREE.Object3D | undefined,
			apply: (material: MeshStandardMaterial) => void
		) {
			if (!model) return;
			model.traverse((child) => {
				if (!(child instanceof Mesh)) return;
				const materials = Array.isArray(child.material) ? child.material : [child.material];
				for (const material of materials) {
					if (material instanceof MeshStandardMaterial) apply(material);
				}
			});
		}

		/**
		 * The camera asset is exported with metalness 1.0 and roughness 1.0 on
		 * every material. That combination is why no amount of light reached it:
		 * a fully metallic surface has no diffuse term at all, so ambient,
		 * hemisphere and key light simply do not apply to it, and at roughness
		 * 1.0 the only channel left — the environment reflection — is blurred
		 * into a flat dark average.
		 *
		 * Dialling both down gives it back a diffuse response, so it lights and
		 * shades like the black body it is meant to be.
		 */
		function retuneCameraMaterials(model: THREE.Object3D | undefined) {
			forEachStandardMaterial(model, (material) => {
				material.metalness = Math.min(material.metalness, 0.45);
				material.roughness = Math.min(material.roughness, 0.5);
			});
		}

		/**
		 * How strongly one model picks up the environment light. three has no
		 * per-object ambient, but envMapIntensity is per material, so this is
		 * the closest equivalent.
		 */
		function setModelLighting(model: THREE.Object3D | undefined, envIntensity: number) {
			forEachStandardMaterial(model, (material) => {
				material.envMapIntensity = envIntensity;
			});
		}

		let disposed = false;
		let settledModels = 0;

		/**
		 * Counts successes and failures alike, so a missing file cannot leave
		 * the loading screen up forever.
		 */
		function onModelSettled() {
			settledModels += 1;
			if (settledModels === totalModels) {
				setTimeout(() => {
					isLoading = false;
				}, 500);
			}
		}

		function onModelLoaded() {
			loadedModels += 1;
			onModelSettled();
		}

		async function addModel(url: string, place: (model: THREE.Object3D) => void) {
			try {
				const model = await loadModel(url);
				if (disposed) return;
				place(model);
				scene.add(model);
				onModelLoaded();
			} catch (error) {
				console.error(`[scene] could not load ${url}`, error);
				onModelSettled();
			}
		}

		addModel(MODEL_URLS.camera, (model) => {
			cameraModel = model;
			model.position.set(-0.75, 0, -0.3);
			model.scale.set(2.55, 2.55, 2.55);
			model.rotation.y = (Math.PI / 180) * 40;

			model.traverse((child) => {
				child.castShadow = true;
				if (child instanceof Mesh) {
					const materials = Array.isArray(child.material) ? child.material : [child.material];
					for (const material of materials) {
						if (!(material instanceof MeshStandardMaterial)) continue;
						material.transparent = false;
						material.depthWrite = true;
						material.side = FrontSide;
						material.needsUpdate = true;
					}
				}
			});

			// The body is almost black and direct light barely registers on it.
			retuneCameraMaterials(model);
			setModelLighting(model, currentTheme.cameraEnvIntensity);
		});

		addModel(MODEL_URLS.computer, (model) => {
			macintoshModel = model;
			model.position.set(0.45, 0, -0.75);
			model.scale.set(1.8, 1.8, 1.8);
			model.traverse((obj) => {
				obj.castShadow = true;
			});

			// Near-white case: the same environment that lifts the camera blows
			// this one out, so it gets a lot less of it.
			setModelLighting(model, currentTheme.macEnvIntensity);
		});

		addModel(MODEL_URLS.deskLamp, (model) => {
			model.position.set(-1.05, 0, -0.75);
			model.scale.set(0.825, 0.825, 0.825);
			model.rotation.y = (Math.PI / 180) * 60;
			model.traverse((obj) => {
				obj.castShadow = true;
			});
		});

		addModel(MODEL_URLS.coffeeCup, (model) => {
			model.position.set(0.9, 0, -0.375);
			model.scale.set(1.8, 1.8, 1.8);
			model.rotation.y = (Math.PI / 180) * 150;
			model.traverse((obj) => {
				obj.castShadow = true;
			});
			placeSteamAbove(model);
		});

		// --- Controls ---
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.enablePan = false;
		controls.enableZoom = true;
		let zoomScale = controls.getZoomScale();
		controls.setScale(zoomScale * 3.75);
		controls.maxDistance = zoomScale * 3.75;
		controls.minDistance = zoomScale * 0.75;
		controls.target.set(0, 0.3, 0);
		const angle = THREE.MathUtils.degToRad(60);
		controls.minPolarAngle = angle;
		controls.maxPolarAngle = angle;

		const dragThresholdSq = 25;
		let pointerDownPos: { x: number; y: number } | null = null;
		let suppressNextClick = false;

		const handlePointerDown = (event: PointerEvent) => {
			pointerDownPos = { x: event.clientX, y: event.clientY };
			suppressNextClick = false;
		};

		const handlePointerMove = (event: PointerEvent) => {
			if (!pointerDownPos) return;
			const dx = event.clientX - pointerDownPos.x;
			const dy = event.clientY - pointerDownPos.y;
			if (dx * dx + dy * dy > dragThresholdSq) {
				suppressNextClick = true;
			}
		};

		const handlePointerUp = () => {
			pointerDownPos = null;
		};

		renderer.domElement.addEventListener('pointerdown', handlePointerDown);
		renderer.domElement.addEventListener('pointermove', handlePointerMove);
		renderer.domElement.addEventListener('pointerup', handlePointerUp);
		renderer.domElement.addEventListener('pointerleave', handlePointerUp);

		// --- Interaction Setup ---
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();
		let flickerTime = 0;
		let flickerTimer = 0;
		let activeModel: THREE.Object3D | null = null;

		function onMouseMove(event: MouseEvent) {
			const rect = renderer.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		}

		function isModelInCenter(model: THREE.Object3D | undefined, threshold = 0.4): boolean {
			if (!model) return false;
			const worldPosition = new THREE.Vector3();
			model.getWorldPosition(worldPosition);
			worldPosition.project(camera);
			return Math.abs(worldPosition.x) < threshold && Math.abs(worldPosition.y) < threshold;
		}

		const hoverWorldPosition = new THREE.Vector3();
		let previousActiveModel: THREE.Object3D | null = null;

		const FLICKER_DURATION = 1.2;
		let hoverLevel = 0;

		function updateSpotlight(deltaTime: number) {
			const activeTheme = prefersDarkMode ? theme.dark : theme.light;

			// Restart the warm-up each time a new object is picked up, rather
			// than once per page load as the old accumulating timer did.
			if (activeModel !== previousActiveModel) {
				previousActiveModel = activeModel;
				flickerTimer = 0;
			}

			// Only the fade in and out is smoothed.
			hoverLevel = THREE.MathUtils.damp(hoverLevel, activeModel ? 1 : 0, 10, deltaTime);

			if (activeModel) {
				activeModel.getWorldPosition(hoverWorldPosition);

				// The Macintosh is tall: lifting its light keeps the cone off the
				// case top, which is what was burning out while the floor stayed dark.
				const heightOffset = activeModel === macintoshModel ? 3.4 : 1.6;
				hoverSpotLight.position.copy(hoverWorldPosition).setY(hoverWorldPosition.y + heightOffset);
				hoverLightTarget.position.copy(hoverWorldPosition);

				flickerTimer += deltaTime;
			}

			// Applied after the damping, never through it: the wobble is around
			// 5 Hz and damp is a low-pass filter, so smoothing it swallows it.
			// A cold lamp settling in only suits the dark scene; in daylight it
			// just reads as a fault.
			let flicker = 1;
			if (activeModel && activeTheme.hoverFlickers && flickerTimer < FLICKER_DURATION) {
				const settling = 1 - flickerTimer / FLICKER_DURATION;
				const wobble = Math.sin(flickerTime * 7) + Math.sin(flickerTime * 15 + 3);
				flicker = 1 + 0.18 * settling * wobble;
			}

			hoverSpotLight.intensity = hoverLevel * activeTheme.hoverIntensity * flicker;
			// Skip it entirely when it contributes nothing: an enabled spotlight
			// keeps rendering its shadow map even at zero intensity.
			hoverSpotLight.visible = hoverSpotLight.intensity > 0.001;
			hoverGlow.update(activeModel ? hoverWorldPosition : null, hoverLevel * flicker);
		}

		function onClick(event: MouseEvent) {
			if (suppressNextClick || !cameraModel || !macintoshModel) {
				suppressNextClick = false;
				return;
			}

			const rect = renderer.domElement.getBoundingClientRect();
			const clickMouse = new THREE.Vector2();
			clickMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			clickMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			raycaster.setFromCamera(clickMouse, camera);
			const intersects = raycaster.intersectObjects([cameraModel, macintoshModel], true);

			if (intersects.length > 0) {
				let current: THREE.Object3D | null = intersects[0].object;
				while (current) {
					if (current === macintoshModel) {
						goto(resolve('/it'));
						return;
					}
					if (current === cameraModel) {
						goto(resolve('/photography'));
						return;
					}
					current = current.parent;
				}
			}
		}

		if (!isMobile) {
			window.addEventListener('mousemove', onMouseMove);
		}
		window.addEventListener('click', onClick);

		// --- Animation Loop ---
		let animationFrameId: number;
		let lastTime = 0;

		let elapsedTime = 0;

		function animate(time: number) {
			animationFrameId = requestAnimationFrame(animate);
			controls.update();

			// requestAnimationFrame pauses on a hidden tab, so the first frame
			// back can carry a delta of many seconds. Clamping keeps every
			// time-driven effect from jumping to a wild state on return.
			const deltaTime = Math.min((time - lastTime) / 1000, 0.05);
			lastTime = time;
			elapsedTime += deltaTime;
			flickerTime += deltaTime * 5;

			activeModel = null;

			if (!isMobile) {
				if (cameraModel && macintoshModel) {
					raycaster.setFromCamera(mouse, camera);
					const intersects = raycaster.intersectObjects([cameraModel, macintoshModel], true);

					if (intersects.length > 0) {
						let current: Object3D = intersects[0].object;
						while (current && current !== cameraModel && current !== macintoshModel) {
							if (current.parent instanceof THREE.Object3D) {
								current = current.parent;
							}
						}
						if (current === cameraModel || current === macintoshModel) {
							activeModel = current;
						}
					}
				}
			} else {
				if (isModelInCenter(cameraModel)) {
					activeModel = cameraModel;
				} else if (isModelInCenter(macintoshModel)) {
					activeModel = macintoshModel;
				}
			}

			updateSpotlight(deltaTime);
			steam.update(elapsedTime);
			composer.render();
		}

		lastTime = performance.now();
		animate(lastTime);

		// --- Resize Handler ---
		const handleResize = () => {
			camera.aspect = node.clientWidth / node.clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(node.clientWidth, node.clientHeight);
			composer.setSize(node.clientWidth, node.clientHeight);
			bloomPass.setSize(node.clientWidth, node.clientHeight);
		};
		window.addEventListener('resize', handleResize);

		// --- Helper function to update text mesh ---
		function updateTextMesh(
			mesh: THREE.Mesh,
			text: string,
			fillColor: string,
			fontSize: number,
			textAlignment: CanvasTextAlign = 'center',
			isBold: boolean = false
		) {
			const material = mesh.material as MeshStandardMaterial;
			// Dispose old texture
			if (material.map) {
				material.map.dispose();
			}
			// Create new texture with updated color
			const newTexture = createTextTexture(text, fontSize, fillColor, textAlignment, isBold);
			material.map = newTexture;
			material.needsUpdate = true;
		}

		// --- Theme Update Function ---
		function updateTheme() {
			const newTheme = prefersDarkMode ? theme.dark : theme.light;

			// Update scene background
			scene.background = new THREE.Color(newTheme.background);

			// Update floor material
			(floor.material as MeshStandardMaterial).color.set(newTheme.floorColor);

			// Update lights
			ambient.color.set(newTheme.ambientColor);
			ambient.intensity = newTheme.ambientIntensity;

			directionalLight.color.set(newTheme.directionalLightColor);
			directionalLight.intensity = newTheme.directionalIntensity;

			deskLampSpotLight.color.set(newTheme.spotLightColor);
			deskLampSpotLight.intensity = newTheme.deskLampIntensity;
			deskLampSpotLight.shadow.intensity = newTheme.deskLampShadowIntensity;

			deskLampPointLight.color.set(newTheme.pointLightColor);
			deskLampPointLight.intensity = newTheme.deskLampIntensity * 0.3;

			setModelLighting(cameraModel, newTheme.cameraEnvIntensity);
			setModelLighting(macintoshModel, newTheme.macEnvIntensity);

			hoverSpotLight.color.set(newTheme.spotLightColor);
			hoverSpotLight.decay = newTheme.hoverDecay;
			hoverSpotLight.penumbra = newTheme.hoverPenumbra;

			hoverGlow.setAppearance({
				color: newTheme.hoverGlowColor,
				strength: newTheme.hoverGlowStrength,
				opacity: newTheme.hoverGlowOpacity,
				core: newTheme.hoverGlowCore
			});

			hemisphereLight.intensity = newTheme.hemisphereIntensity;
			hemisphereLight.groundColor.set(newTheme.floorColor);

			// Update bloom pass
			bloomPass.strength = newTheme.bloomStrength;
			bloomPass.threshold = newTheme.bloomThreshold;

			// Exposure and image-based lighting
			renderer.toneMappingExposure = newTheme.exposure;
			scene.environmentIntensity = newTheme.environmentIntensity;

			// Steam: additive reads as glow on dark, but vanishes on light.
			steam.setAppearance({
				color: newTheme.steamColor,
				opacity: newTheme.steamOpacity,
				additive: newTheme.steamAdditive
			});

			// Update text meshes
			if (photographyTextMesh) {
				updateTextMesh(
					photographyTextMesh,
					m.photography(),
					newTheme.subTextColor,
					120,
					'center',
					true
				);
			}
			if (itTextMesh) {
				updateTextMesh(
					itTextMesh,
					m.information_technology(),
					newTheme.subTextColor,
					120,
					'center',
					true
				);
			}
			if (welcomeTextMesh) {
				const welcomeTextString =
					m.welcome_message_1({ name: m.leon_shinichi() }) +
					'\n' +
					m.welcome_message_2({ place: m.zurich_switzerland() }) +
					'\n' +
					m.welcome_message_3() +
					'\n' +
					m.welcome_message_4();
				updateTextMesh(welcomeTextMesh, welcomeTextString, newTheme.textColor, 20, 'center', false);
			}
		}

		// Watch for theme changes
		$effect(() => {
			updateTheme();
		});

		// --- Cleanup ---
		return {
			destroy() {
				disposed = true;
				cancelAnimationFrame(animationFrameId);

				if (!isMobile) {
					window.removeEventListener('mousemove', onMouseMove);
				}
				window.removeEventListener('click', onClick);
				window.removeEventListener('resize', handleResize);

				renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
				renderer.domElement.removeEventListener('pointermove', handlePointerMove);
				renderer.domElement.removeEventListener('pointerup', handlePointerUp);
				renderer.domElement.removeEventListener('pointerleave', handlePointerUp);

				controls.dispose();

				// Only dispose what this scene created. Model geometries and
				// materials are shared with the module cache, so disposing them
				// here would break the next visit to this page.
				steam.dispose();
				hoverGlow.dispose();
				floorGeo.dispose();
				floorMat.dispose();

				for (const mesh of [photographyTextMesh, itTextMesh, welcomeTextMesh]) {
					if (!mesh) continue;
					mesh.geometry.dispose();
					const material = mesh.material as MeshStandardMaterial;
					material.map?.dispose();
					material.dispose();
				}

				environmentRT.texture.dispose();
				pmrem.dispose();
				renderer.dispose();

				scene.remove(hoverSpotLight);
				scene.remove(hoverLightTarget);
				scene.remove(lightTarget);
				scene.clear();
			}
		};
	};
</script>

<div class="scene-container">
	<!-- Loading Screen -->
	{#if isLoading}
		<div class="loading-screen" class:is-light={!prefersDarkMode}>
			<div class="loading-content">
				<div class="loading-spinner"></div>
				<div class="loading-text glassmorphism-font">
					{m.loading_scene()}... {Math.round((loadedModels / totalModels) * 100)}%
				</div>
			</div>
		</div>
	{/if}

	<!-- Scene Container -->
	<div use:threeSceneAction class="scene" style="width:100%; height:100vh;"></div>
</div>

<style>
	.scene-container {
		position: relative;
		width: 100%;
		height: 100vh;
		overflow: hidden;
	}

	.loading-screen {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: #0d0d0d;
		/* Matches the scene it is covering, so light mode does not flash black. */
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		transition: opacity 0.5s ease-out;
	}

	.loading-screen.is-light {
		background: #f0f0f0;
	}

	.loading-content {
		text-align: center;
		color: white;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
	}

	.loading-spinner {
		width: 60px;
		height: 60px;
		border: 4px solid rgba(255, 213, 165, 0.1);
		border-left-color: #ffd5a5;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.loading-screen.is-light .loading-spinner {
		border-color: rgba(107, 90, 68, 0.15);
		border-left-color: #6b5a44;
	}

	.loading-text {
		font-size: 1.2rem;
		font-weight: 500;
		color: #ffd5a5;
	}

	.loading-screen.is-light .loading-text {
		color: #6b5a44;
	}

	.scene {
		position: relative;
		width: 100%;
		height: 100%;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
