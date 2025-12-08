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

	interface ThreePortfolioProps {
		isMobile: boolean;
	}

	let { isMobile }: ThreePortfolioProps = $props();

	const isHelperNeeded: boolean = false; //for testing purposes. shows where the desklamp is

	/**
	 * Svelte Action for initializing the Three.js scene.
	 * This encapsulates all the logic that needs to interact directly with the DOM node.
	 */
	const threeSceneAction = (node: HTMLDivElement) => {
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0d0d0d);

		const camera = new THREE.PerspectiveCamera(40, node.clientWidth / node.clientHeight, 0.1, 100);
		camera.position.set(0.5, 0, 1);

		const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
		renderer.setSize(node.clientWidth, node.clientHeight);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		node.appendChild(renderer.domElement);

		const composer = new EffectComposer(renderer);
		const renderPass = new RenderPass(scene, camera);
		composer.addPass(renderPass);
		const bloomPass = new UnrealBloomPass(
			new THREE.Vector2(node.clientWidth, node.clientHeight),
			0.9,
			0.3,
			0.85
		);

		bloomPass.strength = 0.7;
		bloomPass.radius = 0.3;
		bloomPass.threshold = 0.7;
		composer.addPass(bloomPass);

		// --- Floor ---
		const floorGeo = new THREE.PlaneGeometry(10, 10);
		const floorMat = new THREE.MeshStandardMaterial({
			color: 0x2a1e15, // Rich dark brown
			roughness: 0.9,
			metalness: 0.1
		});
		const floor = new THREE.Mesh(floorGeo, floorMat);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		scene.add(floor);

		// --- Lights ---
		const ambient = new THREE.AmbientLight(0x3d342a, 0.4);
		scene.add(ambient);

		const directionalLight = new THREE.DirectionalLight(0xffd5a5, 2.8);
		directionalLight.position.set(0, 1.8, 0.5);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.width = 1024;
		directionalLight.shadow.mapSize.height = 1024;
		directionalLight.shadow.camera.near = 0.2;
		directionalLight.shadow.camera.left = -1.5;
		directionalLight.shadow.camera.right = 1.5;
		directionalLight.shadow.camera.top = 1.5;
		directionalLight.shadow.camera.bottom = -1.5;
		directionalLight.shadow.camera.far = 5;
		scene.add(directionalLight);

		const lightTarget = new THREE.Object3D();
		lightTarget.position.set(0.2, 0.3, -0.6);
		scene.add(lightTarget);
		directionalLight.target = lightTarget;

		const deskLampSpotLight = new THREE.SpotLight(0xffe0a0, 1, 0, Math.PI / 3, 0.9, 1); //color, itensity, distance, angle, pneumbra, decay
		deskLampSpotLight.position.set(-0.48, 0.55, -0.37);
		deskLampSpotLight.castShadow = true;
		deskLampSpotLight.shadow.mapSize.width = 512;
		deskLampSpotLight.shadow.mapSize.height = 512;
		deskLampSpotLight.shadow.intensity = 2;
		scene.add(deskLampSpotLight);

		const deskLampPointLight = new THREE.PointLight(0xffe0a0, 0.3, 4);
		deskLampPointLight.position.set(
			deskLampSpotLight.position.x,
			deskLampSpotLight.position.y,
			deskLampSpotLight.position.z
		);
		deskLampPointLight.castShadow = false;
		scene.add(deskLampPointLight);

		if (isHelperNeeded) {
			const helper = new THREE.SpotLightHelper(deskLampSpotLight, 0.1);
			scene.add(helper);

			const helper2 = new THREE.PointLightHelper(deskLampPointLight, 0.1, 0xff0000);
			scene.add(helper2);
		}

		// --- Hover Spotlight ---
		const hoverSpotLight = new THREE.SpotLight(0xffe0a0, 1, 10, Math.PI / 8, 0.15, 0);
		hoverSpotLight.position.set(0, 2, 0);
		hoverSpotLight.castShadow = true; // Enable shadows
		hoverSpotLight.shadow.mapSize.width = 1024; // Higher resolution shadows
		hoverSpotLight.shadow.mapSize.height = 1024;
		hoverSpotLight.shadow.bias = -0.001; // Reduce shadow acne
		hoverSpotLight.shadow.radius = 2; // Softer shadow edges but still defined
		hoverSpotLight.penumbra = 0.1;
		hoverSpotLight.angle = Math.PI / 12; // Harsh narrow beam
		hoverSpotLight.decay = 0.9;
		hoverSpotLight.shadow.camera.near = 0.5;
		hoverSpotLight.shadow.camera.far = 5;
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
			fontSize: number = 32,
			fillColor: string = '#111111',
			textAlignment: CanvasTextAlign = 'center',
			isBold: boolean = false
		): THREE.CanvasTexture {
			const cleanText = stripHtml(text);

			const lines = cleanText.split('\n');
			const lineHeight = fontSize * 1.5;
			const canvasWidth = 1024;
			const canvasHeight = Math.max(256, lines.length * lineHeight + 40);

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

			const xPosition = textAlignment === 'right' ? canvasWidth - 40 : canvasWidth / 2;

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
			width: number = 1.2,
			height: number = 0.3,
			rotation: number = 0,
			heightOffset: number = 0.01,
			renderOrder: number = 0,
			fillColor: string = '#111111',
			textAlignment: CanvasTextAlign = 'center',
			isBold: boolean = false,
			fontSize: number = 28
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

		// Photography text
		createTextPlane(
			m.photography(),
			new THREE.Vector3(-0.45, 0, 0),
			scene,
			1.2,
			0.2,
			(Math.PI / 180) * 30,
			0.001,
			1,
			'#111111',
			'center',
			true,
			80
		);

		// IT text
		createTextPlane(
			m.information_technology(),
			new THREE.Vector3(0.2, 0, -0.15),
			scene,
			1.2,
			0.2,
			0,
			0.002,
			2,
			'#111111',
			'center',
			true,
			80
		);

		// Welcome text - properly formatted
		const welcomeTextString =
			m.welcome_message_1({ name: m.leon_shinichi() }) +
			'\n' +
			m.welcome_message_2({ place: m.zurich_switzerland() }) +
			'\n' +
			m.welcome_message_3() +
			'\n' +
			m.welcome_message_4();

		createTextPlane(
			welcomeTextString,
			new THREE.Vector3(0.08, 0, 0.15),
			scene,
			1.5,
			0.6,
			(Math.PI / 180) * 25,
			0.003,
			3,
			'#FFFFFF',
			'center',
			false,
			14
		);

		const loader = new GLTFLoader();
		let cameraModel: THREE.Object3D;
		let macintoshModel: THREE.Object3D;
		let deskLampModel: THREE.Object3D;
		let coffeeMugModel: THREE.Object3D;

		loader.load('/models/camera.glb', (gltf) => {
			cameraModel = gltf.scene;
			cameraModel.position.set(-0.5, 0, -0.2);
			cameraModel.scale.set(1.7, 1.7, 1.7);
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
		});

		loader.load('/models/computer.glb', (gltf) => {
			macintoshModel = gltf.scene;
			macintoshModel.position.set(0.3, 0, -0.5);
			macintoshModel.traverse((obj) => {
				obj.castShadow = true;
			});
			scene.add(macintoshModel);
		});

		loader.load('/models/desk_lamp.glb', (gltf) => {
			deskLampModel = gltf.scene;
			deskLampModel.position.set(-0.7, 0, -0.5);
			deskLampModel.scale.set(0.55, 0.55, 0.55);
			deskLampModel.rotation.y = (Math.PI / 180) * 60;
			deskLampModel.traverse((obj) => {
				obj.castShadow = true;
			});
			scene.add(deskLampModel);
		});

		loader.load('/models/coffee_cup.glb', (gltf) => {
			coffeeMugModel = gltf.scene;
			coffeeMugModel.position.set(0.6, 0, -0.25);
			coffeeMugModel.rotation.y = (Math.PI / 180) * 150;
			coffeeMugModel.traverse((obj) => {
				obj.castShadow = true;
			});
			scene.add(coffeeMugModel);
		});

		// --- Controls ---
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.enablePan = false;
		controls.enableZoom = true;
		let zoomScale = controls.getZoomScale();
		controls.minDistance = zoomScale * 0.5;
		controls.maxDistance = zoomScale * 2;
		controls.target.set(0, 0.2, 0);
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
		let flickerTimer = 0; // Tracks elapsed time for flicker duration
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

			// Adjust height based on which model is active
			let heightOffset = 0.8; // Default for camera
			if (activeModel === macintoshModel) {
				heightOffset = 1.8; // Higher for the bigger computer model
			}

			// Position spotlight above the model
			hoverSpotLight.position.copy(worldPos).add(new THREE.Vector3(0, heightOffset, 0));
			hoverLightTarget.position.copy(worldPos);

			// Update flicker timer
			flickerTimer += deltaTime;

			// Flicker animation (only for first 2 seconds)
			if (flickerTimer < 1.5) {
				flickerTime += 0.1;
				const flicker = 0.7 * (Math.sin(flickerTime * 7) + Math.sin(flickerTime * 15 + 3));
				hoverSpotLight.intensity = 2.5 + flicker;
			} else {
				// Steady light after 2 seconds
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

		// Only add mousemove listener on desktop
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

			const deltaTime = (time - lastTime) / 1000; // Convert to seconds
			lastTime = time;

			flickerTime += deltaTime * 5; // Adjust flicker speed based on time

			// Reset active model
			activeModel = null;

			if (!isMobile) {
				// Desktop: Check hover
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
				// Mobile: Check center position
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

		// --- Resize ---
		const handleResize = () => {
			camera.aspect = node.clientWidth / node.clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(node.clientWidth, node.clientHeight);
			composer.setSize(node.clientWidth, node.clientHeight);
			bloomPass.setSize(node.clientWidth, node.clientHeight);
		};
		window.addEventListener('resize', handleResize);

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

				// Clean up lights
				scene.remove(hoverSpotLight);
				scene.remove(hoverLightTarget);
				scene.remove(lightTarget);
			}
		};
	};
</script>

<div use:threeSceneAction class="scene" style="width:100%; height:100vh;"></div>
