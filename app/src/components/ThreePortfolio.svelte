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
	import { dev } from '$app/environment';
	import { beforeNavigate, goto, preloadCode } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { loadModel, preloadModels } from '$lib/modelCache.ts';
	import { MODEL_URLS, TEXTURE_URLS } from '$lib/sceneModels.ts';
	import { createSteam } from '$lib/steam.ts';
	import { createHoverGlow } from '$lib/hoverGlow.ts';
	import { createPolaroid, CURLED, type Polaroid, type PolaroidShape } from '$lib/polaroid.ts';
	import { rigKeyboard, type ComputerKeyboard } from '$lib/computerKeyboard.ts';
	import { createComputerScreen, type ComputerScreen } from '$lib/computerScreen.ts';
	import { initTheme, theme as themeStore } from '$lib/theme.svelte.ts';
	import { onMount } from 'svelte';

	interface ThreePortfolioProps {
		isMobile: boolean;
	}

	let { isMobile }: ThreePortfolioProps = $props();

	const isHelperNeeded: boolean = false;
	let isLoading = $state(true);
	let loadedModels = $state(0);
	/**
	 * The photos lying on the desk, bottom of the pile first: each lies a
	 * little above the one before, so later cards cover earlier ones. A card
	 * with another on top of it should take PRESSED_FLAT, so its curled edges
	 * stay under the top one. x and z are desk positions, angle is degrees.
	 */
	const POLAROIDS: { url: string; x: number; z: number; angle: number; shape: PolaroidShape }[] = [
		{ url: TEXTURE_URLS.polaroid, x: 0.8, z: 0.2, angle: -14, shape: CURLED }
	];

	// The four models and the photos.
	const totalModels = 4 + POLAROIDS.length;

	// Shared with the header's toggle, so switching there relights the scene
	// instead of only recolouring the HTML around it.
	let prefersDarkMode = $derived(themeStore.isDark);

	onMount(() => {
		initTheme();
		preloadModels(Object.values(MODEL_URLS));
	});

	// Set by the scene while the desk camera or computer intro runs. The
	// component only unmounts once a navigation has finished, so without this
	// a title-bar link or Back pressed mid-intro would be overridden by the
	// intro's own goto a few frames later.
	let abandonIntro: (() => void) | null = null;
	beforeNavigate(() => abandonIntro?.());

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
			steamAdditive: true,
			// Blended in HDR, before tone mapping, where the lit desk sits well
			// above 1.0: a half-strength shadow there barely shows once the
			// highlights are rolled off, so these run high.
			polaroidShadowOpacity: 0.85,
			// Past the bloom threshold, so the phosphor glows off the glass.
			screenGlow: 2.2
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
			steamAdditive: false,
			polaroidShadowOpacity: 0.9,
			screenGlow: 1.6
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

		// The scene is drawn into the composer's own target, which has no MSAA,
		// and all that reaches the canvas is the bloom pass's two full-screen
		// quads, which leave it opaque, so antialiasing and alpha on it bought
		// nothing but memory.
		// Logarithmic depth is gone too: the 0.1-100 range does not need it,
		// and it wrote gl_FragDepth in every shader, which turns off the GPU's
		// early depth rejection.
		const renderer = new THREE.WebGLRenderer({
			antialias: false,
			alpha: false
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
		// instead of leaving them lit by direct lights alone. It is generated
		// once, so the generator and the room it is rendered from are let go
		// straight away; only the finished map stays.
		const pmrem = new THREE.PMREMGenerator(renderer);
		const room = RoomEnvironment();
		const environmentRT = pmrem.fromScene(room, 0.04);
		pmrem.dispose();
		room.traverse((child) => {
			if (!(child instanceof Mesh)) return;
			child.geometry.dispose();
			(child.material as THREE.Material).dispose();
		});
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
		// Drawn after the models: it is the one surface that takes all the
		// shadows, and this way early depth rejection skips it wherever a model
		// already covers it.
		floor.renderOrder = 1;
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
		directionalLight.shadow.autoUpdate = false;
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
		deskLampSpotLight.shadow.autoUpdate = false;
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
		hoverSpotLight.shadow.autoUpdate = false;
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

		/**
		 * Nothing that casts a shadow ever moves, so the shadow maps are drawn
		 * once and kept instead of being redrawn every frame, which used to be
		 * about half of all draw calls. This has them redrawn on the next frame:
		 * call it whenever a caster or a light changes. (The hover light moves
		 * with its target, so it asks for its own redraw when that changes.)
		 */
		function refreshShadows() {
			directionalLight.shadow.needsUpdate = true;
			deskLampSpotLight.shadow.needsUpdate = true;
			hoverSpotLight.shadow.needsUpdate = true;
		}

		refreshShadows();

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
			// Front faces only: the polar angle is locked, so the underside is never
			// in view. The alpha test drops the empty texels, most of each plane,
			// before they run the full lighting only to blend in at zero alpha.
			// The lift above the floor (heightOffset) is what keeps the planes
			// clear of it; a polygon offset never had an effect under the old
			// logarithmic depth, and leaving it out keeps it that way.
			const material = new THREE.MeshStandardMaterial({
				map: texture,
				transparent: true,
				depthWrite: true,
				side: THREE.FrontSide,
				alphaTest: 0.002
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
		let screenMesh: THREE.Mesh | null = null;
		let keyboardMesh: THREE.Mesh | null = null;
		let computerScreen: ComputerScreen | null = null;
		let computerKeyboard: ComputerKeyboard | null = null;

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
		// Whether the hidden scene behind the loading screen has something new
		// to draw (see animate).
		let sceneDirty = true;

		/**
		 * Counts successes and failures alike, so a missing file cannot leave
		 * the loading screen up forever. A failure gets its frame too: the
		 * frame after the last one settles is what lifts the loading screen.
		 */
		function onModelSettled() {
			settledModels += 1;
			sceneDirty = true;
		}

		function onModelLoaded() {
			loadedModels += 1;
			onModelSettled();
		}

		// A lost context never finishes linking anything, so nothing may wait
		// on it past that point.
		const contextLost = new Promise<void>((settle) => {
			renderer.domElement.addEventListener('webglcontextlost', () => settle(), { once: true });
		});

		// Settles once every compile so far has. compileAsync polls the context
		// until its programs have linked, so the context and the materials it
		// was handed have to outlive them (see destroy).
		let compiling: Promise<unknown> = Promise.resolve();

		/**
		 * Builds an object's shader programs ahead of its first frame, with the
		 * driver linking them in parallel where it can, instead of that frame
		 * stalling on them.
		 */
		function compileAhead(object: THREE.Object3D): Promise<void> {
			// The scene is drawn into the composer's target, not the canvas, and
			// three builds different programs for that (no tone mapping, linear
			// output); compiling against the canvas would warm the wrong ones.
			const previousTarget = renderer.getRenderTarget();
			renderer.setRenderTarget(composer.readBuffer);
			let done: Promise<void>;
			try {
				done = Promise.race([renderer.compileAsync(object, camera, scene), contextLost]).then(
					() => {},
					() => {}
				);
			} catch {
				// The first frame that draws it compiles it instead, as it always did.
				done = Promise.resolve();
			} finally {
				renderer.setRenderTarget(previousTarget);
			}
			compiling = Promise.all([compiling, done]);
			return done;
		}

		async function addModel(url: string, place: (model: THREE.Object3D) => void) {
			try {
				const model = await loadModel(url);
				if (disposed) return;
				place(model);
				// The hover pick can reach the model from here on, but no render
				// brings its matrices up to date until it is in the scene.
				model.updateMatrixWorld(true);
				hoverDirty = true;
				await compileAhead(model);
				if (disposed) return;
				scene.add(model);
				refreshShadows();
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
				if (!(obj instanceof Mesh) || !(obj.material instanceof MeshStandardMaterial)) return;
				if (obj.material.name === 'monitor_screen_mat') screenMesh = obj;
				if (obj.material.name === 'appleII_keyboard_mat') keyboardMesh = obj;
			});

			// Both are set up before the first compile and upload, so the
			// click that runs the intro has nothing left to build.
			if (screenMesh) {
				computerScreen = createComputerScreen(screenMesh.material as MeshStandardMaterial);
				screenMesh.material = computerScreen.material;
			}
			if (keyboardMesh) {
				computerKeyboard = rigKeyboard(keyboardMesh);
				if (!computerKeyboard && dev) {
					console.warn('[scene] keyboard keys not recognised; the intro types without them');
				}
			}

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

		// --- Polaroids on the desk ---
		// Decoration only: they are not picked by the hover or the click.
		const polaroids: Polaroid[] = [];
		// Just above the floor text, so the bottom card lies on top of it;
		// then one layer per card, enough to clear the bend of the one below.
		const POLAROID_HEIGHT = 0.006;
		const POLAROID_LAYER = 0.005;

		async function addPolaroid(
			{ url, x, z, angle, shape }: (typeof POLAROIDS)[number],
			layer: number
		) {
			try {
				const texture = await new THREE.TextureLoader().loadAsync(url);
				if (disposed) {
					texture.dispose();
					return;
				}
				// Lying on the desk it is only ever seen at a slant, where plain
				// mipmapping smears the photo.
				texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
				const polaroid = createPolaroid(texture, shape, currentTheme.polaroidShadowOpacity);
				polaroids.push(polaroid);
				const card = polaroid.object;
				card.position.set(x, POLAROID_HEIGHT + layer * POLAROID_LAYER, z);
				card.rotation.set(-Math.PI / 2, 0, THREE.MathUtils.degToRad(angle));
				card.updateMatrixWorld(true);
				await compileAhead(card);
				if (disposed) return;
				scene.add(card);
				refreshShadows();
				onModelLoaded();
			} catch (error) {
				console.error(`[scene] could not load the polaroid ${url}`, error);
				onModelSettled();
			}
		}

		POLAROIDS.forEach(addPolaroid);

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

		// When anything last moved or changed the picture other than the steam.
		// The frame cap in animate only applies once the scene has been left
		// alone for a moment.
		let lastActivity = 0;
		function markActive() {
			lastActivity = performance.now();
		}
		controls.addEventListener('start', markActive);
		controls.addEventListener('change', markActive);

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

		// The hover pick depends only on the pointer, the camera and the models,
		// none of which move on their own, so it is redone only when one of them
		// did instead of raycasting both models every frame. hoverDirty covers
		// the pointer, the viewport and arriving models; the camera is compared
		// by matrix (see animate).
		let hoverDirty = true;
		let hoveredModel: THREE.Object3D | null = null;
		const pickedWith = new THREE.Matrix4();

		function onMouseMove(event: MouseEvent) {
			const rect = renderer.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			hoverDirty = true;
			markActive();
		}

		function isModelInCenter(model: THREE.Object3D | undefined, threshold = 0.4): boolean {
			if (!model) return false;
			const worldPosition = new THREE.Vector3();
			model.getWorldPosition(worldPosition);
			worldPosition.project(camera);
			return Math.abs(worldPosition.x) < threshold && Math.abs(worldPosition.y) < threshold;
		}

		function findHoveredModel(): THREE.Object3D | null {
			if (isMobile) {
				if (isModelInCenter(cameraModel)) return cameraModel;
				if (isModelInCenter(macintoshModel)) return macintoshModel;
				return null;
			}

			if (!cameraModel || !macintoshModel) return null;
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects([cameraModel, macintoshModel], true);
			if (intersects.length === 0) return null;

			let current: Object3D | null = intersects[0].object;
			while (current && current !== cameraModel && current !== macintoshModel) {
				current = current.parent;
			}
			return current;
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
				// The light is about to move to it, so its shadow map has to be
				// redrawn from there; it never is on its own.
				if (activeModel) hoverSpotLight.shadow.needsUpdate = true;
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

		// --- Desk camera handoff ---
		// Clicking the AT-1 winds it on and fires it before the page changes:
		// the view closes in, the advance lever swings out and back, the
		// shutter button drops, and only then does /photography load. It is
		// all advanced from animate() on the scene's own clamped clock, so a
		// hidden tab pauses it instead of letting it jump to the end.

		/** Seconds from the click. Every step is a window on one clock, so they can overlap. */
		const INTRO = {
			dollyEnd: 0.45,
			leverStart: 0.15,
			leverEnd: 0.5,
			shutterStart: 0.5,
			shutterEnd: 0.6,
			// A beat after the shutter, so the release registers before the page goes.
			end: 0.68
		};
		// Short of a full stroke on purpose: a small swing reads as winding on
		// without the lever sweeping across the shot.
		const LEVER_SWING = THREE.MathUtils.degToRad(35);
		// Used when the hinge cannot be found and the lever turns about its own
		// origin instead; a big angle there would show the lever orbiting.
		const LEVER_SWING_FALLBACK = THREE.MathUtils.degToRad(18);
		// Half the button's height: a couple of millimetres at the model's real
		// scale, about what the release actually travels.
		const SHUTTER_TRAVEL = 0.5;
		// Fraction of the current distance the view closes to.
		const DOLLY_MIN = 0.5;
		const DOLLY_MAX = 0.6;
		// Tips the view a little higher than the orbit's fixed 60 degrees, so
		// the top plate, where the lever and the release sit, faces the lens.
		const DOLLY_LIFT = 0.15;
		// The model stands upright on the desk, so its local up is world up.
		const WORLD_UP = new THREE.Vector3(0, 1, 0);

		interface LeverSwing {
			object: THREE.Object3D;
			restPosition: THREE.Vector3;
			restQuaternion: THREE.Quaternion;
			/** Hinge point and axis, both in the lever's parent space. */
			hinge: THREE.Vector3;
			axis: THREE.Vector3;
			/** Signed, so a positive pulse always swings away from the body. */
			angle: number;
		}

		interface ShutterDip {
			object: THREE.Object3D;
			restPosition: THREE.Vector3;
			/** Full travel, in the button's parent space. */
			travel: THREE.Vector3;
		}

		interface CameraIntro {
			elapsed: number;
			fromPosition: THREE.Vector3;
			toPosition: THREE.Vector3;
			fromTarget: THREE.Vector3;
			toTarget: THREE.Vector3;
			lever: LeverSwing | null;
			shutter: ShutterDip | null;
		}

		let cameraIntro: CameraIntro | null = null;
		// Set the moment goto is called, so nothing can navigate a second time.
		let leavingDesk = false;

		/**
		 * GLTFLoader runs node names through PropertyBinding.sanitizeNodeName,
		 * and the FBX names carry a '#' prefix whose survival should not be
		 * relied on, so names are compared on their word characters only.
		 * Matching the end, not includes(), keeps 'Shutter' from finding
		 * 'Shutter_Speed'; skipping meshes lands on the node rather than the
		 * '…_Textures_0' mesh inside it, whose transform is not the part's.
		 */
		function findCameraPart(part: string): THREE.Object3D | null {
			let found: THREE.Object3D | null = null;
			cameraModel.traverse((child) => {
				if (found || child instanceof Mesh) return;
				const name = child.name.replace(/\W/g, '');
				if (name === part || name.endsWith(`_${part}`)) found = child;
			});
			if (!found && dev) {
				console.warn(`[scene] camera part '${part}' not found; its intro step is skipped`);
			}
			return found;
		}

		/** Bounds of an object's geometry in its own space, so its long axis can be read off. */
		function localGeometryBounds(object: THREE.Object3D): THREE.Box3 {
			object.updateWorldMatrix(true, true);
			const toLocal = object.matrixWorld.clone().invert();
			const relative = new THREE.Matrix4();
			const meshBounds = new THREE.Box3();
			const bounds = new THREE.Box3();
			object.traverse((child) => {
				if (!(child instanceof Mesh)) return;
				if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
				relative.multiplyMatrices(toLocal, child.matrixWorld);
				meshBounds.copy(child.geometry.boundingBox!).applyMatrix4(relative);
				bounds.union(meshBounds);
			});
			return bounds;
		}

		function directionInSpaceOf(object: THREE.Object3D, worldDirection: THREE.Vector3) {
			const toLocal = object.getWorldQuaternion(new THREE.Quaternion()).invert();
			return worldDirection.clone().applyQuaternion(toLocal).normalize();
		}

		/**
		 * Works out where the advance lever hinges and which way is "out".
		 *
		 * In this asset the lever's origin already sits on its hub, coaxial
		 * with the shutter-speed dial, so it turns in place. That is checked
		 * rather than assumed: if the origin is not near one end of the
		 * lever's long axis, the hinge is taken as the end nearer the dial.
		 * Either way the rotation is applied about that point in the parent's
		 * space, so nothing is re-parented and restoring is two copies.
		 */
		function rigLever(
			lever: THREE.Object3D,
			dial: THREE.Object3D | null,
			bodyCentre: THREE.Vector3
		): LeverSwing | null {
			const parent = lever.parent;
			if (!parent) return null;

			const bounds = localGeometryBounds(lever);
			lever.updateMatrix();
			const axis = directionInSpaceOf(parent, WORLD_UP);
			const rest = {
				object: lever,
				restPosition: lever.position.clone(),
				restQuaternion: lever.quaternion.clone(),
				axis
			};

			if (bounds.isEmpty()) {
				return { ...rest, hinge: lever.position.clone(), angle: LEVER_SWING_FALLBACK };
			}

			const size = bounds.getSize(new THREE.Vector3());
			const longAxis = size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2;
			const min = bounds.min.getComponent(longAxis);
			const max = bounds.max.getComponent(longAxis);
			const centre = bounds.getCenter(new THREE.Vector3());
			const origin = new THREE.Vector3();
			const originAlong = (0 - min) / (max - min);

			const hingeLocal = new THREE.Vector3();
			let hingeAtMin: boolean;
			if (bounds.containsPoint(origin) && (originAlong < 0.3 || originAlong > 0.7)) {
				hingeAtMin = originAlong < 0.5;
			} else {
				const dialLocal = dial
					? lever.worldToLocal(dial.getWorldPosition(new THREE.Vector3()))
					: origin.clone();
				const dialAlong = dialLocal.getComponent(longAxis);
				hingeAtMin = Math.abs(dialAlong - min) <= Math.abs(dialAlong - max);
				hingeLocal.copy(centre).setComponent(longAxis, hingeAtMin ? min : max);
			}

			const tipLocal = centre.clone().setComponent(longAxis, hingeAtMin ? max : min);
			const hinge = hingeLocal.applyMatrix4(lever.matrix);
			const tip = tipLocal.applyMatrix4(lever.matrix);

			// "Out" is whichever way leaves the tip further from the body, read
			// on the desk plane so the sign holds however the model is rotated.
			const reachAfterSwing = (angle: number) => {
				const swung = tip
					.clone()
					.sub(hinge)
					.applyAxisAngle(axis, angle)
					.add(hinge)
					.applyMatrix4(parent.matrixWorld);
				return Math.hypot(swung.x - bodyCentre.x, swung.z - bodyCentre.z);
			};
			const angle =
				reachAfterSwing(LEVER_SWING) >= reachAfterSwing(-LEVER_SWING) ? LEVER_SWING : -LEVER_SWING;

			return { ...rest, hinge, angle };
		}

		function rigShutter(button: THREE.Object3D): ShutterDip | null {
			const parent = button.parent;
			if (!parent) return null;

			const height = new THREE.Box3().setFromObject(button).getSize(new THREE.Vector3()).y;
			if (height <= 0) return null;

			// Measured in world space and carried back into the parent's, so the
			// travel survives whatever scale and axis swaps the FBX export added.
			const top = button.getWorldPosition(new THREE.Vector3());
			const start = parent.worldToLocal(top.clone());
			const end = parent.worldToLocal(top.addScaledVector(WORLD_UP, -height * SHUTTER_TRAVEL));
			return { object: button, restPosition: button.position.clone(), travel: end.sub(start) };
		}

		/**
		 * Where the view lands: on the current bearing, so the move reads as
		 * stepping closer rather than flying somewhere, at a distance that
		 * keeps the whole body in frame on narrow screens too.
		 */
		function framingFor(subject: THREE.Object3D) {
			const bounds = new THREE.Box3().setFromObject(subject);
			const centre = bounds.getCenter(new THREE.Vector3());
			const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;

			const offset = camera.position.clone().sub(controls.target);
			const distance = offset.length();
			const direction = offset.normalize();
			direction.y += DOLLY_LIFT;
			direction.normalize();

			const halfVertical = THREE.MathUtils.degToRad(camera.fov / 2);
			const halfHorizontal = Math.atan(Math.tan(halfVertical) * camera.aspect);
			const fit = (radius / Math.sin(Math.min(halfVertical, halfHorizontal))) * 1.05;
			const landing = THREE.MathUtils.clamp(fit, distance * DOLLY_MIN, distance * DOLLY_MAX);

			return { target: centre, position: centre.clone().addScaledVector(direction, landing) };
		}

		function easeInOutCubic(t: number) {
			return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
		}

		/** 0 -> 1 -> 0 across [start, end]: out and straight back. */
		function pulse(time: number, start: number, end: number) {
			if (time <= start || time >= end) return 0;
			return Math.sin(((time - start) / (end - start)) * Math.PI);
		}

		const leverSwing = new THREE.Quaternion();

		function poseLever(lever: LeverSwing, amount: number) {
			leverSwing.setFromAxisAngle(lever.axis, lever.angle * amount);
			lever.object.position
				.copy(lever.restPosition)
				.sub(lever.hinge)
				.applyQuaternion(leverSwing)
				.add(lever.hinge);
			lever.object.quaternion.multiplyQuaternions(leverSwing, lever.restQuaternion);
		}

		function playCameraIntro() {
			if (cameraIntro || computerIntro || leavingDesk) return;

			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
				leaveFor('/photography');
				return;
			}

			const body = findCameraPart('Body');
			const lever = findCameraPart('Film_Advance');
			const dial = findCameraPart('Shutter_Speed');
			const shutter = findCameraPart('Shutter');
			const framing = framingFor(body ?? cameraModel);

			cameraIntro = {
				elapsed: 0,
				fromPosition: camera.position.clone(),
				toPosition: framing.position,
				fromTarget: controls.target.clone(),
				toTarget: framing.target,
				lever: lever ? rigLever(lever, dial, framing.target) : null,
				shutter: shutter ? rigShutter(shutter) : null
			};
			// The move is scripted; a drag mid-way would fight it.
			controls.enabled = false;
		}

		function advanceCameraIntro(deltaTime: number) {
			const intro = cameraIntro;
			if (!intro) return;

			intro.elapsed += deltaTime;
			const time = intro.elapsed;

			const dolly = easeInOutCubic(Math.min(time / INTRO.dollyEnd, 1));
			camera.position.lerpVectors(intro.fromPosition, intro.toPosition, dolly);
			controls.target.lerpVectors(intro.fromTarget, intro.toTarget, dolly);
			camera.lookAt(controls.target);

			if (intro.lever) {
				poseLever(intro.lever, pulse(time, INTRO.leverStart, INTRO.leverEnd));
			}
			if (intro.shutter) {
				const dip = pulse(time, INTRO.shutterStart, INTRO.shutterEnd);
				intro.shutter.object.position
					.copy(intro.shutter.restPosition)
					.addScaledVector(intro.shutter.travel, dip);
			}
			// The shadow maps only redraw on request, and the lever and the
			// release cast their own small shadows while they move.
			refreshShadows();

			if (time >= INTRO.end) finishCameraIntro();
		}

		/**
		 * Puts back what the intro moved and leaves. The view itself stays
		 * where it ended up: the page is going, and snapping back would show
		 * in the frame the transition captures.
		 */
		function finishCameraIntro() {
			if (!restoreAfterIntro()) return;
			leaveFor('/photography');
		}

		/** Puts the parts back and hands the desk to the controls; false if no intro ran. */
		function restoreAfterIntro(): boolean {
			const intro = cameraIntro;
			if (!intro) return false;
			cameraIntro = null;

			if (intro.lever) {
				intro.lever.object.position.copy(intro.lever.restPosition);
				intro.lever.object.quaternion.copy(intro.lever.restQuaternion);
			}
			if (intro.shutter) {
				intro.shutter.object.position.copy(intro.shutter.restPosition);
			}
			refreshShadows();
			hoverDirty = true;
			controls.enabled = true;
			return true;
		}

		// --- Computer handoff ---
		// The Apple II is on from the moment the desk appears, its prompt
		// blinking. Clicking it has it type a line before /it loads: the view
		// settles in front of it, the keys go down one by one as their letters
		// appear, RETURN, the answer, and the view pushes into the glass.
		// Advanced from animate() on the same clamped clock as the camera's.

		// A one-line Applesoft program and what it prints. The Apple II only
		// has capitals; a character with no key of its own (see SHIFTED) still
		// shows on screen, just without a key going down.
		const TYPED_LINE = 'PRINT "HELLO WORLD"';
		const PRINTED_LINE = 'HELLO WORLD';
		// Characters the Apple II types with SHIFT and another key.
		const SHIFTED: Record<string, string> = { '"': '2', '!': '1', '?': '/' };

		/** Seconds from the click, like INTRO. */
		const TERMINAL = {
			dollyEnd: 0.7,
			// The screen is already on, so typing starts while the view is
			// still settling.
			typingStart: 0.45,
			// Between keystrokes, give or take the jitter, so it reads as typed
			// by someone who knows the keyboard.
			keyGap: 0.05,
			keyJitter: 0.018,
			// A space is a thumb on a long bar, a touch slower.
			spaceExtra: 0.025,
			// From the last character to RETURN, from RETURN to the answer
			// (the interpreter takes a moment), and from the answer into the glass.
			returnPause: 0.15,
			printDelay: 0.12,
			pushDelay: 0.35,
			pushDuration: 0.55,
			// A key snaps down and springs back a little slower.
			keyDown: 0.03,
			keyUp: 0.05,
			// Half a cursor blink.
			blink: 0.27,
			// The tube warming up as the desk first appears.
			warmUp: 0.35
		};
		// How far above the screen's own level the view looks from, so the
		// keyboard stays in the shot.
		const TERMINAL_ELEVATION = THREE.MathUtils.degToRad(16);
		// How much of the frame the screen and keyboard fill before the push.
		// Roomy enough to keep the monitor clear of the title bar.
		const TERMINAL_MARGIN = 1.3;
		// Under 1 the glass overfills the frame by the end of the push, so the
		// bezel is gone before the page changes.
		const PUSH_FILL = 0.7;
		// The push aims this far above the middle of the glass, as a share of
		// its height, so the typed line at the top stays in the shot; with
		// PUSH_FILL it puts the top of the frame on the top of the glass.
		const PUSH_RAISE = 0.15;

		interface Keystroke {
			/** Every key that goes down for it: SHIFT as well, for a shifted one. */
			labels: string[];
			char: string;
			at: number;
		}

		interface ComputerIntro {
			elapsed: number;
			fromPosition: THREE.Vector3;
			fromTarget: THREE.Vector3;
			viewPosition: THREE.Vector3;
			viewTarget: THREE.Vector3;
			pushPosition: THREE.Vector3;
			pushTarget: THREE.Vector3;
			strokes: Keystroke[];
			returnAt: number;
			printAt: number;
			pushStart: number;
			end: number;
		}

		let computerIntro: ComputerIntro | null = null;

		// What the screen shows: the idle prompt, or whatever the intro has
		// typed so far. Kept as the intro left it while the page changes.
		const PROMPT = [']'];
		let terminalLines = PROMPT;
		let terminalTyping = false;
		// elapsedTime when the desk was revealed and the tube switched on.
		let screenOnAt: number | null = null;

		/** Uneven like a person typing, but the same on every visit. */
		function jitter(index: number) {
			const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
			return (x - Math.floor(x)) * 2 - 1;
		}

		function scheduleKeystrokes() {
			const strokes: Keystroke[] = [];
			let at = TERMINAL.typingStart;
			[...TYPED_LINE].forEach((char, index) => {
				const shifted = SHIFTED[char];
				strokes.push({ labels: shifted ? ['SHIFT', shifted] : [char], char, at });
				at +=
					TERMINAL.keyGap +
					TERMINAL.keyJitter * jitter(index) +
					(char === ' ' ? TERMINAL.spaceExtra : 0);
			});
			const returnAt = at - TERMINAL.keyGap + TERMINAL.returnPause;
			strokes.push({ labels: ['RETURN'], char: '', at: returnAt });
			return { strokes, returnAt };
		}

		/** 0 -> 1 -> 0 for one keystroke: snaps down, springs back. */
		function keyTravel(sinceStroke: number) {
			if (sinceStroke < 0) return 0;
			if (sinceStroke < TERMINAL.keyDown) return sinceStroke / TERMINAL.keyDown;
			return Math.max(0, 1 - (sinceStroke - TERMINAL.keyDown) / TERMINAL.keyUp);
		}

		/**
		 * Square on to the computer, whichever way the desk was turned, at a
		 * distance that fits the monitor and the keyboard; then a point close
		 * enough to the glass that it fills the view.
		 */
		function terminalFraming(screen: THREE.Mesh, keyboard: THREE.Mesh) {
			const screenBounds = new THREE.Box3().setFromObject(screen);
			const keyboardBounds = new THREE.Box3().setFromObject(keyboard);
			const screenCentre = screenBounds.getCenter(new THREE.Vector3());
			const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(
				macintoshModel.getWorldQuaternion(new THREE.Quaternion())
			);

			const halfVertical = THREE.MathUtils.degToRad(camera.fov / 2);
			const halfHorizontal = Math.atan(Math.tan(halfVertical) * camera.aspect);

			// Weighted to the screen: it is what the shot is about.
			const viewTarget = keyboardBounds.getCenter(new THREE.Vector3()).lerp(screenCentre, 0.65);
			const radius = screenBounds
				.clone()
				.union(keyboardBounds)
				.getBoundingSphere(new THREE.Sphere()).radius;
			const fit = (radius / Math.sin(Math.min(halfVertical, halfHorizontal))) * TERMINAL_MARGIN;
			const view = facing
				.clone()
				.multiplyScalar(Math.cos(TERMINAL_ELEVATION))
				.setY(Math.sin(TERMINAL_ELEVATION))
				.normalize();

			const glass = screenBounds.getSize(new THREE.Vector3());
			const fill =
				Math.min(glass.y / 2 / Math.tan(halfVertical), glass.x / 2 / Math.tan(halfHorizontal)) *
				PUSH_FILL;

			return {
				viewTarget,
				viewPosition: viewTarget.clone().addScaledVector(view, fit),
				pushTarget: screenCentre.clone().setY(screenCentre.y + glass.y * PUSH_RAISE),
				pushPosition: screenCentre
					.clone()
					.setY(screenCentre.y + glass.y * PUSH_RAISE)
					.addScaledVector(facing, fill)
			};
		}

		function playComputerIntro() {
			if (cameraIntro || computerIntro || leavingDesk) return;

			if (
				!screenMesh ||
				!keyboardMesh ||
				window.matchMedia('(prefers-reduced-motion: reduce)').matches
			) {
				leaveFor('/it');
				return;
			}

			const { strokes, returnAt } = scheduleKeystrokes();
			const printAt = returnAt + TERMINAL.printDelay;
			const pushStart = printAt + TERMINAL.pushDelay;
			computerIntro = {
				elapsed: 0,
				fromPosition: camera.position.clone(),
				fromTarget: controls.target.clone(),
				...terminalFraming(screenMesh, keyboardMesh),
				strokes,
				returnAt,
				printAt,
				pushStart,
				end: pushStart + TERMINAL.pushDuration
			};
			controls.enabled = false;
		}

		function easeInCubic(t: number) {
			return t * t * t;
		}

		function advanceComputerIntro(deltaTime: number) {
			const intro = computerIntro;
			if (!intro) return;

			intro.elapsed += deltaTime;
			const time = intro.elapsed;

			if (time < intro.pushStart) {
				const dolly = easeInOutCubic(Math.min(time / TERMINAL.dollyEnd, 1));
				camera.position.lerpVectors(intro.fromPosition, intro.viewPosition, dolly);
				controls.target.lerpVectors(intro.fromTarget, intro.viewTarget, dolly);
			} else {
				const push = easeInCubic(Math.min((time - intro.pushStart) / TERMINAL.pushDuration, 1));
				camera.position.lerpVectors(intro.viewPosition, intro.pushPosition, push);
				controls.target.lerpVectors(intro.viewTarget, intro.pushTarget, push);
			}
			camera.lookAt(controls.target);

			// Keys come up more than once (L, O, R, SHIFT), so each takes the deepest of its strokes.
			if (computerKeyboard) {
				const travels: Record<string, number> = {};
				for (const stroke of intro.strokes) {
					const travel = keyTravel(time - stroke.at);
					for (const label of stroke.labels) {
						travels[label] = Math.max(travels[label] ?? 0, travel);
					}
				}
				for (const [label, travel] of Object.entries(travels))
					computerKeyboard.press(label, travel);
				// The keys cast their own small shadows while they move.
				if (
					time >= TERMINAL.typingStart &&
					time <= intro.returnAt + TERMINAL.keyDown + TERMINAL.keyUp
				) {
					refreshShadows();
				}
			}

			const typed = intro.strokes
				.filter((stroke) => stroke.at <= time)
				.map((stroke) => stroke.char)
				.join('');
			terminalLines = [`]${typed}`];
			if (time >= intro.printAt) terminalLines.push(PRINTED_LINE, ']');
			terminalTyping = time >= TERMINAL.typingStart && time < intro.returnAt;

			if (time >= intro.end) finishComputerIntro();
		}

		function finishComputerIntro() {
			// The screen keeps what was typed: it is what the page transition
			// starts from.
			if (!restoreAfterComputerIntro()) return;
			leaveFor('/it');
		}

		/** Keys up, controls back; false if no intro ran. */
		function restoreAfterComputerIntro(): boolean {
			if (!computerIntro) return false;
			computerIntro = null;
			terminalTyping = false;

			computerKeyboard?.release();
			refreshShadows();
			hoverDirty = true;
			controls.enabled = true;
			return true;
		}

		// Someone else's navigation (a title-bar link, Back) won the race: drop
		// the intro without leaving. Our own goto also passes through here, and
		// by then leavingDesk is set, so it is left alone.
		abandonIntro = () => {
			if (leavingDesk) return;
			restoreAfterIntro();
			if (restoreAfterComputerIntro()) terminalLines = PROMPT;
		};

		function leaveFor(path: '/photography' | '/it') {
			// The scene can be torn down mid-intro (Back, a header link); the
			// page that replaced it must not then be navigated away from.
			if (disposed || leavingDesk) return;
			leavingDesk = true;
			goto(resolve(path)).catch(() => {
				// The navigation failed or was overtaken: hand the desk back.
				leavingDesk = false;
				terminalLines = PROMPT;
			});
		}

		/** Draws the screen for this frame; the canvas is only redrawn when the picture changes. */
		function updateScreen() {
			if (!computerScreen) return;
			const activeTheme = prefersDarkMode ? theme.dark : theme.light;
			const power = screenOnAt === null ? 0 : (elapsedTime - screenOnAt) / TERMINAL.warmUp;
			computerScreen.draw({
				power,
				lines: terminalLines,
				// Solid while the keys are going, blinking while it waits.
				cursor: terminalTyping || Math.floor(elapsedTime / TERMINAL.blink) % 2 === 0
			});
			// A fresh tube flickers before it holds steady.
			const warming = THREE.MathUtils.clamp(1 - power, 0, 1);
			const flicker = 1 + 0.3 * warming * Math.sin(elapsedTime * 90);
			computerScreen.setGlow(power > 0 ? activeTheme.screenGlow * flicker : 0);
		}

		function onClick(event: MouseEvent) {
			if (suppressNextClick || !cameraModel || !macintoshModel) {
				suppressNextClick = false;
				return;
			}

			// goto has already run; a click now must not start a second navigation.
			if (leavingDesk) return;

			// This listens on window, so it also hears the title bar over the
			// scene. Mid-intro only a click on the scene itself skips ahead; a
			// theme toggle or a link is meant for what it landed on.
			const intro = cameraIntro || computerIntro;
			if (intro && event.target !== renderer.domElement) return;

			// The visitor has already chosen: any click on the scene now is
			// impatience, wherever it lands, so it skips to that page.
			if (cameraIntro) {
				finishCameraIntro();
				return;
			}
			if (computerIntro) {
				finishComputerIntro();
				return;
			}

			const rect = renderer.domElement.getBoundingClientRect();
			const clickMouse = new THREE.Vector2();
			clickMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			clickMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			raycaster.setFromCamera(clickMouse, camera);
			const intersects = raycaster.intersectObjects([cameraModel, macintoshModel], true);
			if (intersects.length === 0) return;

			let current: THREE.Object3D | null = intersects[0].object;
			while (current) {
				if (current === macintoshModel) {
					playComputerIntro();
					return;
				}
				if (current === cameraModel) {
					playCameraIntro();
					return;
				}
				current = current.parent;
			}
		}

		// Decided once: isMobile can change on resize, and the listener has to
		// come off the same way it went on.
		const tracksPointer = !isMobile;
		if (tracksPointer) {
			window.addEventListener('mousemove', onMouseMove);
		}
		window.addEventListener('click', onClick);

		// A restored context comes back with blank shadow maps, and nothing else
		// would redraw them.
		renderer.domElement.addEventListener('webglcontextrestored', refreshShadows);

		/**
		 * In the dark theme the hover light joins the lamp, and every lit
		 * material then needs another program, for two shadowed spotlights,
		 * which the first hover used to compile on the spot. Building those in
		 * the background beforehand takes that stall away. The light theme
		 * never shows the light, so it is not worth the work there.
		 */
		let hoverProgramsWarm = false;
		function warmHoverPrograms() {
			if (hoverProgramsWarm || disposed || !prefersDarkMode || settledModels < totalModels) {
				return;
			}
			hoverProgramsWarm = true;
			// Only while the compile reads the scene's lights, which it does
			// straight away; the light is never drawn like this.
			const wasVisible = hoverSpotLight.visible;
			hoverSpotLight.visible = true;
			compileAhead(scene);
			hoverSpotLight.visible = wasVisible;
		}

		function revealScene() {
			isLoading = false;
			// Switched on with the reveal, so the warm-up is seen; already warm
			// under reduced motion.
			const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			screenOnAt = elapsedTime - (reduceMotion ? TERMINAL.warmUp : 0);
			// Neither is needed to show the scene, so both wait until after the
			// frame that does.
			setTimeout(() => {
				if (disposed) return;
				warmHoverPrograms();
				// The objects navigate with goto(), which SvelteKit's link
				// preloading never sees, so their pages' code is fetched here.
				preloadCode(resolve('/it')).catch(() => {});
				preloadCode(resolve('/photography')).catch(() => {});
			});
		}

		// --- Animation Loop ---
		let animationFrameId: number;
		let lastTime = 0;
		let lastFrameTime = 0;

		let elapsedTime = 0;

		function animate(time: number) {
			animationFrameId = requestAnimationFrame(animate);

			// Left alone, the only things moving are the slow steam and the
			// blinking cursor, which look the same at 60 and at 120 fps, so
			// high-refresh screens skip frames. One
			// is only skipped when the next still lands within 1/60 s (plus a
			// millisecond of jitter) of the last one drawn: nothing ever updates
			// less often than on a 60 Hz screen, and as soon as anything is
			// touched or hovered, or a hover is still fading out (to the glow's
			// own cut-off), the loop is back at the display's own rate. The camera
			// handoff always runs at full rate.
			const frameInterval = time - lastFrameTime;
			lastFrameTime = time;
			const idle =
				time - lastActivity > 300 &&
				!activeModel &&
				hoverLevel < 0.004 &&
				!cameraIntro &&
				!computerIntro;
			if (idle && time - lastTime + frameInterval < 1000 / 60 + 1) return;

			// The handoff moves the view itself. Left running, the controls
			// would pull it back to their fixed polar angle and distance range,
			// mid-move and again in the frames before the page swaps.
			if (!cameraIntro && !computerIntro && !leavingDesk) controls.update();

			// requestAnimationFrame pauses on a hidden tab, so the first frame
			// back can carry a delta of many seconds. Clamping keeps every
			// time-driven effect from jumping to a wild state on return.
			const deltaTime = Math.min((time - lastTime) / 1000, 0.05);
			lastTime = time;
			elapsedTime += deltaTime;
			flickerTime += deltaTime * 5;

			advanceCameraIntro(deltaTime);
			advanceComputerIntro(deltaTime);
			updateScreen();

			// The camera counts by the matrix the pick actually reads, which trails
			// the controls by a frame, rather than by their change event.
			if (hoverDirty || !camera.matrixWorld.equals(pickedWith)) {
				hoverDirty = false;
				pickedWith.copy(camera.matrixWorld);
				hoveredModel = findHoveredModel();
			}
			activeModel = hoveredModel;

			updateSpotlight(deltaTime);
			steam.update(elapsedTime);

			// Behind the opaque loading screen only an arriving model changes
			// anything, so the hidden scene is drawn once per arrival: each model
			// still gets its upload in a frame of its own, without the whole
			// pipeline running for nothing in between.
			if (isLoading) {
				if (sceneDirty) {
					sceneDirty = false;
					composer.render();
					return;
				}
				// Lifted on the frame after the complete scene was first drawn, so
				// that draw's upload stall stays hidden and the first frame anyone
				// sees is an ordinary one.
				if (settledModels < totalModels) return;
				revealScene();
			}

			composer.render();
		}

		lastTime = performance.now();
		animate(lastTime);

		// --- Resize Handler ---
		let viewWidth = node.clientWidth;
		let viewHeight = node.clientHeight;

		const handleResize = () => {
			// isMobile may have flipped as well, which changes how the hover is
			// picked.
			hoverDirty = true;

			const width = node.clientWidth;
			const height = node.clientHeight;
			// renderer.setSize clears the canvas even when nothing changed, and
			// mobile browser bars fire resizes that leave this element as it was.
			if (width === viewWidth && height === viewHeight) return;
			viewWidth = width;
			viewHeight = height;

			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			renderer.setSize(width, height);
			// This sizes the bloom chain too, in device pixels like the first
			// frame. Sizing it again in CSS pixels afterwards, as was done here,
			// quartered its resolution on HiDPI screens after any resize.
			composer.setSize(width, height);
			// The canvas was just cleared, so this frame has to draw.
			markActive();
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

			for (const polaroid of polaroids) polaroid.setShadowOpacity(newTheme.polaroidShadowOpacity);

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

			// The page around the canvas switches on this very frame, so the
			// scene must not sit it out under the idle frame cap.
			markActive();
			// Only after the frame that shows the switch, which already has the
			// text to redraw; a bare timeout would usually run before it.
			requestAnimationFrame(() => setTimeout(warmHoverPrograms));
		}

		// Watch for theme changes. The scene was just built in the current
		// theme, so only an actual switch rebuilds it (all three text textures
		// included).
		let appliedDark = prefersDarkMode;
		$effect(() => {
			const dark = prefersDarkMode;
			if (dark === appliedDark) return;
			appliedDark = dark;
			updateTheme();
		});

		// --- Cleanup ---
		return {
			destroy() {
				// Also what stops an intro cut short here from calling goto later.
				disposed = true;
				cameraIntro = null;
				computerIntro = null;
				abandonIntro = null;
				cancelAnimationFrame(animationFrameId);

				if (tracksPointer) {
					window.removeEventListener('mousemove', onMouseMove);
				}
				window.removeEventListener('click', onClick);
				window.removeEventListener('resize', handleResize);

				renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
				renderer.domElement.removeEventListener('pointermove', handlePointerMove);
				renderer.domElement.removeEventListener('pointerup', handlePointerUp);
				renderer.domElement.removeEventListener('pointerleave', handlePointerUp);
				renderer.domElement.removeEventListener('webglcontextrestored', refreshShadows);

				controls.dispose();

				// A compile still in flight keeps polling the programs of every
				// material it was handed, this scene's own included once the hover
				// light has been warmed, and a material disposed under it breaks
				// that poll for good. So everything waits for it to finish.
				compiling.then(() => {
					// Only dispose what this scene created. Model geometries and
					// materials are shared with the module cache, so disposing them
					// here would break the next visit to this page.
					steam.dispose();
					hoverGlow.dispose();
					for (const polaroid of polaroids) polaroid.dispose();
					computerScreen?.dispose();
					computerKeyboard?.dispose();
					floorGeo.dispose();
					floorMat.dispose();

					for (const mesh of [photographyTextMesh, itTextMesh, welcomeTextMesh]) {
						if (!mesh) continue;
						mesh.geometry.dispose();
						const material = mesh.material as MeshStandardMaterial;
						material.map?.dispose();
						material.dispose();
					}

					environmentRT.dispose();
					composer.dispose();
					bloomPass.dispose();

					// The cached models carry dispose listeners that close over this
					// context, so dropping the renderer alone never frees it; losing
					// it releases its GPU memory now rather than whenever the browser
					// runs into its context limit.
					renderer.dispose();
					renderer.forceContextLoss();
				});

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
