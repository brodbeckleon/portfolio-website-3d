<script lang="ts">
	import * as THREE from 'three';
	import { FrontSide, Mesh, MeshStandardMaterial, Object3D } from 'three';
	import {
		GLTFLoader,
		OrbitControls,
		EffectComposer,
		RenderPass,
		UnrealBloomPass
	} from 'three-stdlib';
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';
	import { onMount } from 'svelte';

	interface ThreePortfolioProps {
		isMobile: boolean;
	}

	let { isMobile }: ThreePortfolioProps = $props();

	const isHelperNeeded: boolean = false;
	let isLoading = $state(true);
	let loadedModels = $state(0);
	const totalModels = 4;

	let prefersDarkMode = $state(true);

	onMount(() => {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		prefersDarkMode = prefersDark;

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryListEvent) => {
			prefersDarkMode = e.matches;
		};
		mediaQuery.addEventListener('change', handleChange);

		return () => mediaQuery.removeEventListener('change', handleChange);
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
			ambientIntensity: 0.4,
			directionalIntensity: 2.8,
			deskLampShadowIntensity: 2
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
			ambientIntensity: 0.7,
			directionalIntensity: 3.2,
			deskLampShadowIntensity: 1.5
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
		node.appendChild(renderer.domElement);

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
			1,
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

		const deskLampPointLight = new THREE.PointLight(currentTheme.pointLightColor, 0.3, 6);
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
		hoverSpotLight.penumbra = 0.1;
		hoverSpotLight.angle = Math.PI / 12;
		hoverSpotLight.decay = 0.9;
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
			width: number = 1.8 * SCALE_FACTOR,
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
			1.8 * SCALE_FACTOR,
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
			1.8 * SCALE_FACTOR,
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
			2.25 * SCALE_FACTOR,
			0.9 * SCALE_FACTOR,
			(Math.PI / 180) * 25,
			0.0045,
			3,
			currentTheme.textColor,
			'center',
			false,
			20
		);

		const loader = new GLTFLoader();
		let cameraModel: THREE.Object3D;
		let macintoshModel: THREE.Object3D;
		let deskLampModel: THREE.Object3D;
		let coffeeMugModel: THREE.Object3D;

		function onModelLoad() {
			loadedModels += 1;
			if (loadedModels === totalModels) {
				setTimeout(() => {
					isLoading = false;
				}, 500);
			}
		}

		loader.load('/models/camera.glb', (gltf) => {
			cameraModel = gltf.scene;
			cameraModel.position.set(-0.75, 0, -0.3);
			cameraModel.scale.set(2.55, 2.55, 2.55);
			cameraModel.rotation.y = (Math.PI / 180) * 40;

			cameraModel.traverse((child) => {
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

			scene.add(cameraModel);
			onModelLoad();
		});

		loader.load('/models/computer.glb', (gltf) => {
			macintoshModel = gltf.scene;
			macintoshModel.position.set(0.45, 0, -0.75);
			macintoshModel.scale.set(1.8, 1.8, 1.8);
			macintoshModel.traverse((obj) => {
				obj.castShadow = true;
			});
			scene.add(macintoshModel);
			onModelLoad();
		});

		loader.load('/models/optimized-desk_lamp.glb', (gltf) => {
			deskLampModel = gltf.scene;
			deskLampModel.position.set(-1.05, 0, -0.75);
			deskLampModel.scale.set(0.825, 0.825, 0.825);
			deskLampModel.rotation.y = (Math.PI / 180) * 60;
			deskLampModel.traverse((obj) => {
				obj.castShadow = true;
			});
			scene.add(deskLampModel);
			onModelLoad();
		});

		loader.load('/models/coffee_cup.glb', (gltf) => {
			coffeeMugModel = gltf.scene;
			coffeeMugModel.position.set(0.9, 0, -0.375);
			coffeeMugModel.scale.set(1.8, 1.8, 1.8);
			coffeeMugModel.rotation.y = (Math.PI / 180) * 150;
			coffeeMugModel.traverse((obj) => {
				obj.castShadow = true;
			});
			scene.add(coffeeMugModel);
			onModelLoad();
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

		function updateSpotlight(deltaTime: number) {
			if (!activeModel) {
				hoverSpotLight.intensity = 0;
				return;
			}

			const worldPos = new THREE.Vector3();
			activeModel.getWorldPosition(worldPos);

			let heightOffset = 1.2;
			if (activeModel === macintoshModel) {
				heightOffset = 2.7;
			}

			hoverSpotLight.position.copy(worldPos).add(new THREE.Vector3(0, heightOffset, 0));
			hoverLightTarget.position.copy(worldPos);

			flickerTimer += deltaTime;

			if (flickerTimer < 1.5) {
				flickerTime += 0.1;
				const flicker = 0.7 * (Math.sin(flickerTime * 7) + Math.sin(flickerTime * 15 + 3));
				hoverSpotLight.intensity = 2.5 + flicker;
			} else {
				hoverSpotLight.intensity = 2.8;
			}
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
						goto('/it');
						return;
					}
					if (current === cameraModel) {
						goto('/photography');
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

		function animate(time: number) {
			animationFrameId = requestAnimationFrame(animate);
			controls.update();

			const deltaTime = (time - lastTime) / 1000;
			lastTime = time;
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
			deskLampSpotLight.shadow.intensity = newTheme.deskLampShadowIntensity;

			deskLampPointLight.color.set(newTheme.pointLightColor);

			hoverSpotLight.color.set(newTheme.spotLightColor);

			// Update bloom pass
			bloomPass.strength = newTheme.bloomStrength;
			bloomPass.threshold = newTheme.bloomThreshold;

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

				renderer.dispose();
				controls.dispose();

				scene.traverse((object) => {
					if (object instanceof THREE.Mesh) {
						object.geometry.dispose();
						(object.material as THREE.Material).dispose();
					}
				});

				scene.remove(hoverSpotLight);
				scene.remove(hoverLightTarget);
				scene.remove(lightTarget);
			}
		};
	};
</script>

<div class="scene-container">
	<!-- Loading Screen -->
	{#if isLoading}
		<div class="loading-screen">
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
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		transition: opacity 0.5s ease-out;
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

	.loading-text {
		font-size: 1.2rem;
		font-weight: 500;
		color: #ffd5a5;
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
