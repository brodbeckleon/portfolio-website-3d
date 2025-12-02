<script lang="ts">
import * as THREE from 'three';
import { FrontSide, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader, OrbitControls, EffectComposer, RenderPass, UnrealBloomPass } from 'three-stdlib';
	import { goto } from '$app/navigation';

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
		const bloomPass = new UnrealBloomPass(new THREE.Vector2(node.clientWidth, node.clientHeight), 0.9, 0.3, 0.85);
		bloomPass.threshold = 0.5;
		bloomPass.strength = 1.1;
		bloomPass.radius = 0.5;
		composer.addPass(bloomPass);

		// --- Floor ---
		const floorGeo = new THREE.PlaneGeometry(10, 10);
		const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
		const floor = new THREE.Mesh(floorGeo, floorMat);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		scene.add(floor);

		// --- Lights ---
		const ambient = new THREE.AmbientLight(0xffffff, 1.5);
		scene.add(ambient);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(5, 10, 7.5);
		directionalLight.castShadow = true;
		scene.add(directionalLight);

		// --- Text Labels ---
		function createTextTexture(text: string, fontSize: number = 32): THREE.CanvasTexture {
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d')!;
			canvas.width = 512;
			canvas.height = 128;
			
			context.fillStyle = '#111111'; // Dark gray
			context.font = `bold ${fontSize}px Helvetica Neue`;
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.fillText(text, canvas.width / 2, canvas.height / 2);
			
			return new THREE.CanvasTexture(canvas);
		}

		function createTextPlane(text: string, position: THREE.Vector3, scene: THREE.Scene, width: number = 1.2, height: number = 0.3, rotation: number = 0, heightOffset: number = 0.01, renderOrder: number = 0): THREE.Mesh {
			const texture = createTextTexture(text);
			texture.needsUpdate = true;
			
			const material = new THREE.MeshStandardMaterial({
				map: texture,
				transparent: true,
				emissive: 0x000000,
				emissiveIntensity: 0,
				depthWrite: true,
				polygonOffset: true,
				polygonOffsetFactor: renderOrder === 0 ? -1 : 1,
				polygonOffsetUnits: renderOrder === 0 ? -1 : 1
			});
			
			const geometry = new THREE.PlaneGeometry(width, height);
			const plane = new THREE.Mesh(geometry, material);
			plane.rotation.x = -Math.PI / 2;
			plane.position.copy(position);
			plane.position.y = heightOffset; // Slightly above floor to avoid z-fighting
			plane.rotateZ(rotation);
			plane.renderOrder = renderOrder;
			
			scene.add(plane);
			return plane;
		}

		const photographyText = createTextPlane('photography', new THREE.Vector3(-0.5, 0, 0.1), scene, 1.2, 0.3, Math.PI/180*-30, 0.02, 1);
		const itText = createTextPlane('information technology', new THREE.Vector3(0.3, 0, 0.3), scene, 1.2, 0.3, 0, 0.03, 2);

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
		let macbookModel: THREE.Object3D;

		loader.load('/models/camera.glb', (gltf) => {
			cameraModel = gltf.scene;
			cameraModel.position.set(-0.3, 0, 0);
			cameraModel.scale.set(1.7, 1.7, 1.7);
			cameraModel.rotation.y = Math.PI/180*-30;


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
			macbookModel = gltf.scene;
			macbookModel.position.set(0.3, 0, 0);
			macbookModel.traverse((obj) => {
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
			scene.add(macbookModel);
		});

		// --- Controls (optional - very limited movement) ---
		// If you don't need any camera rotation, you can remove OrbitControls entirely
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
			if (suppressNextClick || !hoveredObject || !cameraModel || !macbookModel) return;
			suppressNextClick = false;

			// Check if clicked object belongs to camera or macbook model
			let current: THREE.Object3D | null = hoveredObject;
			while (current) {
				if (current === macbookModel) {
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

			// Only check hover if models are loaded
			if (cameraModel && macbookModel) {
				raycaster.setFromCamera(mouse, camera);
				const intersects = raycaster.intersectObjects([cameraModel, macbookModel], true);

				if (intersects.length > 0) {
					hoveredObject = intersects[0].object;

					// Traverse up to find the root model object
					let current: THREE.Object3D | null = hoveredObject;
					while (current && current !== cameraModel && current !== macbookModel) {
						current = current.parent;
					}

					if (current === cameraModel) {
						cameraTargetHighlight = 1;
						computerTargetHighlight = 0;
					} else if (current === macbookModel) {
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

			// Smooth highlight transitions
			cameraHighlight += (cameraTargetHighlight - cameraHighlight) * 0.08;
			computerHighlight += (computerTargetHighlight - computerHighlight) * 0.08;

			updateMeshesHighlight(cameraHighlightMeshes, CAMERA_HIGHLIGHT_COLOR, cameraHighlight);
			updateMeshesHighlight(computerHighlightMeshes, COMPUTER_HIGHLIGHT_COLOR, computerHighlight);

			// Update text glow based on hover state
			const photographyMaterial = photographyText.material as MeshStandardMaterial;
			const itMaterial = itText.material as MeshStandardMaterial;
			
			const textLerpFactor = 0.12;
			const photographyTargetGlow = cameraHighlight * 1.5;
			const itTargetGlow = computerHighlight * 1.5;

			photographyMaterial.emissive.copy(CAMERA_HIGHLIGHT_COLOR);
			photographyMaterial.emissiveIntensity += (photographyTargetGlow - photographyMaterial.emissiveIntensity) * textLerpFactor;

			itMaterial.emissive.copy(COMPUTER_HIGHLIGHT_COLOR);
			itMaterial.emissiveIntensity += (itTargetGlow - itMaterial.emissiveIntensity) * textLerpFactor;

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
			}
		};
	};
</script>

<div use:threeSceneAction class="scene" style="width:100%; height:100vh;"></div>
