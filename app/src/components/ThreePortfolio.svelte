<script lang="ts">
	import * as THREE from 'three';
	import { GLTFLoader } from 'three-stdlib';
	import { OrbitControls } from 'three-stdlib';
	import { FrontSide, Mesh, MeshStandardMaterial } from 'three';
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

		// --- Glowing point lights (off initially) ---
		const cameraGlow = new THREE.PointLight(0xff8800, 0, 3, 2);
		cameraGlow.position.set(-0.3, 0.5, 0);
		cameraGlow.castShadow = true;
		scene.add(cameraGlow);

		const computerGlow = new THREE.PointLight(0xaa00ff, 0, 3, 2);
		computerGlow.position.set(0.3, 0.5, 0);
		computerGlow.castShadow = true;
		scene.add(computerGlow);

		const loader = new GLTFLoader();
		let cameraModel: THREE.Object3D;
		let macbookModel: THREE.Object3D;

		loader.load('/models/camera.glb', (gltf) => {
			cameraModel = gltf.scene;
			cameraModel.position.set(-0.3, 0, 0);
			cameraModel.scale.set(1.7, 1.7, 1.7);

			cameraModel.traverse((child) => {
				child.castShadow = true;

				if (child instanceof Mesh) {
					const material = child.material as MeshStandardMaterial;
					material.transparent = false;
					material.depthWrite = true;
					material.side = FrontSide;
					material.needsUpdate = true;
				}
			});

			scene.add(cameraModel);
		});

		loader.load('/models/computer.glb', (gltf) => {
			macbookModel = gltf.scene;
			macbookModel.position.set(0.3, 0, 0);
			macbookModel.traverse((obj) => (obj.castShadow = true));
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
			if (!hoveredObject || !cameraModel || !macbookModel) return;

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

		// --- Light Animation States ---
		let cameraTargetIntensity = 0;
		let computerTargetIntensity = 0;
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
						cameraTargetIntensity = 2.5;
						computerTargetIntensity = 0;
					} else if (current === macbookModel) {
						cameraTargetIntensity = 0;
						computerTargetIntensity = 2.5;
					} else {
						hoveredObject = null;
						cameraTargetIntensity = 0;
						computerTargetIntensity = 0;
					}
				} else {
					hoveredObject = null;
					cameraTargetIntensity = 0;
					computerTargetIntensity = 0;
				}
			}

			// Smooth intensity transitions
			cameraGlow.intensity += (cameraTargetIntensity - cameraGlow.intensity) * 0.08;
			computerGlow.intensity += (computerTargetIntensity - computerGlow.intensity) * 0.08;

			// Add slight flicker when light is on
			if (cameraGlow.intensity > 0.3) {
				cameraGlow.intensity += Math.sin(Date.now() * 0.02) * 0.05;
			}
			if (computerGlow.intensity > 0.3) {
				computerGlow.intensity += Math.sin(Date.now() * 0.018) * 0.05;
			}

			renderer.render(scene, camera);
		}

		animate();

		// --- Resize ---
		const handleResize = () => {
			camera.aspect = node.clientWidth / node.clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(node.clientWidth, node.clientHeight);
		};
		window.addEventListener('resize', handleResize);

		// --- Cleanup ---
		return {
			destroy() {
				cancelAnimationFrame(animationFrameId);
				window.removeEventListener('mousemove', onMouseMove);
				window.removeEventListener('click', onClick);
				window.removeEventListener('resize', handleResize);
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
