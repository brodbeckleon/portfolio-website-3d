<script lang="ts">
	import * as THREE from 'three';
	import { FrontSide, Mesh, MeshStandardMaterial } from 'three';
	import {
		GLTFLoader,
		OrbitControls,
		EffectComposer,
		RenderPass,
		UnrealBloomPass
	} from 'three-stdlib';
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';

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

		const TEXT_BASE_EMISSIVE = 0;
		const TEXT_BLOOM_MULTIPLIER = 3;

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
		const photographyText = createTextPlane(
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
		const itText = createTextPlane(
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

		const CAMERA_HIGHLIGHT_COLOR = new THREE.Color(0xff8800);
		const COMPUTER_HIGHLIGHT_COLOR = new THREE.Color(0xaa00ff);
		const cameraHighlightMeshes: Mesh[] = [];
		const computerHighlightMeshes: Mesh[] = [];

		const storeOriginalMaterialProps = (material: MeshStandardMaterial) => {
			if (!material.userData.__originalEmissive) {
				material.userData.__originalEmissive = material.emissive.clone();
				material.userData.__originalEmissiveIntensity = material.emissiveIntensity ?? 0;
			}
		};

		const updateMeshesHighlight = (meshes: Mesh[], color: THREE.Color, strength: number) => {
			const tempColor = new THREE.Color();
			for (const mesh of meshes) {
				const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				for (const material of materials) {
					if (!(material instanceof MeshStandardMaterial)) continue;
					storeOriginalMaterialProps(material);
					const originalColor = material.userData.__originalEmissive as THREE.Color;
					const originalIntensity = material.userData.__originalEmissiveIntensity ?? 0;
					tempColor.copy(originalColor).lerp(color, strength);
					material.emissive.copy(tempColor);
					material.emissiveIntensity = THREE.MathUtils.lerp(originalIntensity, 1.8, strength);
				}
			}
		};

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
					cameraHighlightMeshes.push(child);
					const materials = Array.isArray(child.material) ? child.material : [child.material];
					for (const material of materials) {
						if (!(material instanceof MeshStandardMaterial)) continue;
						material.transparent = false;
						material.depthWrite = true;
						material.side = FrontSide;
						storeOriginalMaterialProps(material);
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
				if (obj instanceof Mesh) {
					computerHighlightMeshes.push(obj);
					const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
					for (const material of materials) {
						if (!(material instanceof MeshStandardMaterial)) continue;
						storeOriginalMaterialProps(material);
					}
				}
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
		controls.enableZoom = false;
		controls.target.set(0, 0.2, 0);
		const angle = THREE.MathUtils.degToRad(60);
		controls.minPolarAngle = angle;
		controls.maxPolarAngle = angle;
		const controlsRotationSpeed = 0.0012;
		const orbitOffset = new THREE.Vector3();
		const rotateAroundTarget = (delta: number) => {
			orbitOffset.copy(camera.position).sub(controls.target);
			const cos = Math.cos(delta);
			const sin = Math.sin(delta);
			const rotatedX = orbitOffset.x * cos - orbitOffset.z * sin;
			const rotatedZ = orbitOffset.x * sin + orbitOffset.z * cos;
			orbitOffset.x = rotatedX;
			orbitOffset.z = rotatedZ;
			camera.position.copy(controls.target).add(orbitOffset);
			camera.lookAt(controls.target);
		};

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

		// --- Hover Detection ---
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();
		let hoveredObject: THREE.Object3D | null = null;

		function onMouseMove(event: MouseEvent) {
			const rect = renderer.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		}

		function onClick() {
			if (suppressNextClick || !hoveredObject || !cameraModel || !macintoshModel) return;
			suppressNextClick = false;

			let current: THREE.Object3D | null = hoveredObject;
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

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('click', onClick);
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			rotateAroundTarget(event.deltaY * controlsRotationSpeed);
			controls.update();
		};
		renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

		// --- Highlight Animation States ---
		let cameraTargetHighlight = 0;
		let computerTargetHighlight = 0;
		let cameraHighlight = 0;
		let computerHighlight = 0;
		let animationFrameId: number;

		// --- Animation Loop ---
		function animate() {
			animationFrameId = requestAnimationFrame(animate);
			controls.update();

			if (cameraModel && macintoshModel) {
				raycaster.setFromCamera(mouse, camera);
				const intersects = raycaster.intersectObjects([cameraModel, macintoshModel], true);

				if (intersects.length > 0) {
					hoveredObject = intersects[0].object;

					let current: THREE.Object3D | null = hoveredObject;
					while (current && current !== cameraModel && current !== macintoshModel) {
						current = current.parent;
					}

					if (current === cameraModel) {
						cameraTargetHighlight = 1;
						computerTargetHighlight = 0;
					} else if (current === macintoshModel) {
						cameraTargetHighlight = 0;
						computerTargetHighlight = 1;
					} else {
						hoveredObject = null;
						cameraTargetHighlight = 0;
						computerTargetHighlight = 0;
					}
				} else {
					hoveredObject = null;
					cameraTargetHighlight = 0;
					computerTargetHighlight = 0;
				}
			}

			cameraHighlight += (cameraTargetHighlight - cameraHighlight) * 0.08;
			computerHighlight += (computerTargetHighlight - computerHighlight) * 0.08;

			updateMeshesHighlight(cameraHighlightMeshes, CAMERA_HIGHLIGHT_COLOR, cameraHighlight);
			updateMeshesHighlight(computerHighlightMeshes, COMPUTER_HIGHLIGHT_COLOR, computerHighlight);

			const photographyMaterial = photographyText.material as MeshStandardMaterial;
			const itMaterial = itText.material as MeshStandardMaterial;

			const textLerpFactor = 0.18;
			const photographyTargetGlow = TEXT_BASE_EMISSIVE + cameraHighlight * TEXT_BLOOM_MULTIPLIER;
			const itTargetGlow = TEXT_BASE_EMISSIVE + computerHighlight * TEXT_BLOOM_MULTIPLIER;

			photographyMaterial.emissive.copy(CAMERA_HIGHLIGHT_COLOR);
			photographyMaterial.emissiveIntensity +=
				(photographyTargetGlow - photographyMaterial.emissiveIntensity) * textLerpFactor;

			itMaterial.emissive.copy(COMPUTER_HIGHLIGHT_COLOR);
			itMaterial.emissiveIntensity +=
				(itTargetGlow - itMaterial.emissiveIntensity) * textLerpFactor;

			composer.render();
		}

		animate();

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
				window.removeEventListener('mousemove', onMouseMove);
				window.removeEventListener('click', onClick);
				window.removeEventListener('resize', handleResize);
				renderer.domElement.removeEventListener('wheel', onWheel);
				renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
				renderer.domElement.removeEventListener('pointermove', handlePointerMove);
				renderer.domElement.removeEventListener('pointerup', handlePointerUp);
				renderer.domElement.removeEventListener('pointerleave', handlePointerUp);
				renderer.dispose();
				controls.dispose();
				scene.traverse((object) => {
					if (object instanceof THREE.Mesh) {
						object.geometry.dispose();
						object.material.dispose();
					}
				});
				if (lightTarget) scene.remove(lightTarget); // Cleanup light target
			}
		};
	};
</script>

<div use:threeSceneAction class="scene" style="width:100%; height:100vh;"></div>
