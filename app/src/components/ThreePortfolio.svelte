<script lang="ts">
    import { onMount } from 'svelte';
    import * as THREE from 'three';
    import { GLTFLoader } from 'three-stdlib';
    import { OrbitControls } from 'three-stdlib';

    let container: HTMLDivElement;

    onMount(() => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0d0d0d);

        const camera = new THREE.PerspectiveCamera(20, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0.5, 0, 4);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        // Floor
        const floorGeo = new THREE.PlaneGeometry(10, 10);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // --- Lighting ---
        // Brighter ambient light for overall scene brightness
        const ambient = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(ambient);

        // Directional light for better shadows and highlights
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        // --- Glowing Lights ---
        // Orange glow for the camera
        const cameraGlow = new THREE.PointLight(0xff8800, 0, 5);
        cameraGlow.position.set(-1.5, 0.5, 0);
        scene.add(cameraGlow);

        // Violet glow for the computer
        const computerGlow = new THREE.PointLight(0xaa00ff, 0, 5);
        computerGlow.position.set(1.5, 0.5, 0);
        scene.add(computerGlow);


        // Load models
        const loader = new GLTFLoader();

        let cameraModel: THREE.Object3D;
        let macbookModel: THREE.Object3D;

        loader.load('/models/camera.glb', (gltf) => {
            cameraModel = gltf.scene;
            cameraModel.position.set(-0.5, 0, 0);
            // Increase the size of the camera by 50%
            cameraModel.scale.set(1.8, 1.8, 1.8);
            cameraModel.traverse((obj) => (obj.castShadow = true));
            scene.add(cameraModel);
        });

        loader.load('/models/computer.glb', (gltf) => {
            macbookModel = gltf.scene;
            macbookModel.position.set(0.5, 0, 0);
            macbookModel.traverse((obj) => (obj.castShadow = true));
            scene.add(macbookModel);
        });

        // --- Controls ---
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        // Limit movement to only rotation
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.target.set(0, 0.2, 0);
        // Lock camera to a 30-degree downward angle
        const angle = THREE.MathUtils.degToRad(60);
        controls.minPolarAngle = angle;
        controls.maxPolarAngle = angle;


        // Raycaster
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredObject: THREE.Object3D | null = null;

        function onMouseMove(event: MouseEvent) {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        }

        function onClick() {
            if (hoveredObject) {
                if (hoveredObject.parent === cameraModel) {
                    focusOn(cameraModel, 'photography');
                } else if (hoveredObject.parent === macbookModel) {
                    focusOn(macbookModel, 'computerscience');
                }
            }
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('click', onClick);

        // Hover light logic
        function animate() {
            requestAnimationFrame(animate);
            controls.update();

            raycaster.setFromCamera(mouse, camera);
            const models = [cameraModel, macbookModel].filter(Boolean);
            if (models.length > 0) {
                const intersects = raycaster.intersectObjects(models.map(m => m.children[0]));

                if (intersects.length > 0) {
                    const target = intersects[0].object;
                    if (target !== hoveredObject) {
                        hoveredObject = target;

                        // Turn on the correct glow and turn off the other
                        if (hoveredObject.parent === cameraModel) {
                            cameraGlow.intensity = 2;
                            computerGlow.intensity = 0;
                        } else if (hoveredObject.parent === macbookModel) {
                            cameraGlow.intensity = 0;
                            computerGlow.intensity = 2;
                        }
                    }
                } else {
                    hoveredObject = null;
                    // Turn off both glows when not hovering
                    cameraGlow.intensity = 0;
                    computerGlow.intensity = 0;
                }
            }

            renderer.render(scene, camera);
        }

        // Camera focus animation
        function focusOn(obj: THREE.Object3D, portfolio: string) {
            const targetPos = new THREE.Vector3();
            obj.getWorldPosition(targetPos);
            const start = camera.position.clone();
            const end = targetPos.clone().add(new THREE.Vector3(0, 0.5, 2));

            let progress = 0;
            const duration = 1.2;

            function move() {
                progress += 0.02 / duration;
                if (progress < 1) {
                    camera.position.lerpVectors(start, end, progress);
                    requestAnimationFrame(move);
                } else {
                    console.log('Open portfolio:', portfolio);
                    // TODO: Trigger UI transition (e.g., set a Svelte state)
                }
            }
            move();
        }

        animate();

        // Handle resize
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('click', onClick);
        };
    });
</script>

<div bind:this={container} class="scene" style="width:100%; height:100vh;"></div>