<script lang="ts">
    import * as THREE from 'three';
    import { GLTFLoader } from 'three-stdlib';
    import { OrbitControls } from 'three-stdlib';
    import {DoubleSide, FrontSide, Mesh, MeshStandardMaterial, SkinnedMesh} from "three";

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
        node.appendChild(renderer.domElement); // The action appends the canvas here

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
        const cameraGlow = new THREE.PointLight(0xff8800, 0, 3, 2); // color, intensity, distance, decay
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

                    // 2. Ensure it writes to the depth buffer, which opaque objects always should.
                    material.depthWrite = true;

                    // 3. Reset the 'side' property. If the normals are correct, this is best for performance.
                    // If the model disappears again, it means you have BOTH problems: transparency AND inverted normals.
                    material.side = FrontSide; // Use FrontSide as the default

                    // Force the material to update with these new properties
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
            if (hoveredObject) {
                // Check the parent or grandparent, depending on the GLTF structure
                if (hoveredObject.parent === cameraModel || hoveredObject.parent?.parent === cameraModel) {
                    focusOn(cameraModel!, 'photography');
                } else if (hoveredObject.parent === macbookModel || hoveredObject.parent?.parent === macbookModel) {
                    focusOn(macbookModel!, 'computerscience');
                }
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

            raycaster.setFromCamera(mouse, camera);
            const models = [cameraModel, macbookModel].filter(Boolean) as THREE.Object3D[];

            if (models.length > 0) {
                const intersects = raycaster.intersectObjects(models, true);

                if (intersects.length > 0) {
                    const target = intersects[0].object;
                    hoveredObject = target;

                    // Traverse up to find the root model object
                    let parent = hoveredObject.parent;
                    while(parent && !models.includes(parent)) {
                        parent = parent.parent;
                    }

                    if (parent === cameraModel) {
                        cameraTargetIntensity = 2.5;
                        computerTargetIntensity = 0;
                    } else if (parent === macbookModel) {
                        cameraTargetIntensity = 0;
                        computerTargetIntensity = 2.5;
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

        // --- Camera focus animation ---
        function focusOn(obj: THREE.Object3D, portfolio: string) {
            const targetPos = new THREE.Vector3();
            obj.getWorldPosition(targetPos);
            const start = camera.position.clone();
            const end = targetPos.clone().add(new THREE.Vector3(0, 0.5, 2));

            let progress = 0;
            const duration = 1.2;
            let focusAnimationId: number;

            function move() {
                progress += 0.02 / duration;
                if (progress < 1) {
                    camera.position.lerpVectors(start, end, progress);
                    focusAnimationId = requestAnimationFrame(move);
                } else {
                    camera.position.copy(end); // Ensure it ends at the exact position
                    console.log('Open portfolio:', portfolio);
                    // TODO: Trigger UI transition
                }
            }
            move();
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
                // Stop the animation loop
                cancelAnimationFrame(animationFrameId);

                // Remove all event listeners
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('click', onClick);
                window.removeEventListener('resize', handleResize);

                // Important: Dispose of Three.js objects to free up GPU memory
                renderer.dispose();
                controls.dispose();
                scene.traverse(object => {
                    if (object instanceof THREE.Mesh) {
                        object.geometry.dispose();
                        object.material.dispose();
                    }
                });
            }
        };
    };
</script>

<!--
  Use the action on the div.
  The 'onMount' and 'bind:this' are no longer needed.
-->
<div use:threeSceneAction class="scene" style="width:100%; height:100vh;"></div>