import * as THREE from 'three';

/**
 * The Apple II's keyboard is a single mesh, but every key cap in it is its
 * own island of triangles, so the keys can be found and pressed one by one
 * without touching the asset.
 *
 * The rows run from the back of the keyboard to the front, each left to
 * right as seen from in front of the computer. The last row is the power
 * light and the space bar, which is all the real one has down there.
 */
const KEY_ROWS: (string | null)[][] = [
	['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ':', '-', 'RESET'],
	['ESC', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'REPT', 'RETURN'],
	['CTRL', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', 'LEFT', 'RIGHT'],
	['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'SHIFT'],
	[null, ' ']
];

/** How far a key goes down, as a share of the cap's own height. */
const TRAVEL = 0.35;

interface Key {
	vertices: Uint32Array;
	restY: Float32Array;
	travel: number;
}

export interface ComputerKeyboard {
	/** Whether a key with this label exists; letters are matched upper case. */
	has(label: string): boolean;
	/** 0 is at rest, 1 is fully down. Only uploaded on the next render. */
	press(label: string, amount: number): void;
	/** Puts every key back up. */
	release(): void;
	dispose(): void;
}

/** Vertices that share a triangle, or a position, end up in the same island. */
function findIslands(geometry: THREE.BufferGeometry): Uint32Array[] {
	const positions = geometry.getAttribute('position');
	const count = positions.count;
	const parent = new Uint32Array(count);
	for (let i = 0; i < count; i += 1) parent[i] = i;

	const find = (vertex: number) => {
		while (parent[vertex] !== vertex) {
			parent[vertex] = parent[parent[vertex]];
			vertex = parent[vertex];
		}
		return vertex;
	};
	const union = (a: number, b: number) => {
		const rootA = find(a);
		const rootB = find(b);
		if (rootA !== rootB) parent[rootA] = rootB;
	};

	const index = geometry.getIndex();
	if (index) {
		for (let i = 0; i < index.count; i += 3) {
			union(index.getX(i), index.getX(i + 1));
			union(index.getX(i), index.getX(i + 2));
		}
	} else {
		for (let i = 0; i < count; i += 3) {
			union(i, i + 1);
			union(i, i + 2);
		}
	}

	// UV and normal seams split a cap into several vertex runs that only
	// meet by position.
	const seen = new Map<string, number>();
	const vertex = new THREE.Vector3();
	for (let i = 0; i < count; i += 1) {
		vertex.fromBufferAttribute(positions, i);
		const key = `${Math.round(vertex.x * 1e4)},${Math.round(vertex.y * 1e4)},${Math.round(vertex.z * 1e4)}`;
		const other = seen.get(key);
		if (other === undefined) seen.set(key, i);
		else union(i, other);
	}

	const groups = new Map<number, number[]>();
	for (let i = 0; i < count; i += 1) {
		const root = find(i);
		let group = groups.get(root);
		if (!group) groups.set(root, (group = []));
		group.push(i);
	}
	return [...groups.values()].map((group) => Uint32Array.from(group));
}

/**
 * Gives the mesh a geometry of its own (the loaded one is shared with the
 * model cache) and works out which island is which key. Returns null when
 * the islands do not line up with the Apple II layout, so a different
 * asset only loses the key presses.
 */
export function rigKeyboard(mesh: THREE.Mesh): ComputerKeyboard | null {
	const geometry = mesh.geometry.clone();
	const positions = geometry.getAttribute('position') as THREE.BufferAttribute;

	const vertex = new THREE.Vector3();
	const islands = findIslands(geometry).map((vertices) => {
		const bounds = new THREE.Box3();
		for (const i of vertices) bounds.expandByPoint(vertex.fromBufferAttribute(positions, i));
		return {
			vertices,
			centre: bounds.getCenter(new THREE.Vector3()),
			size: bounds.getSize(new THREE.Vector3())
		};
	});

	// Rows sit a whole cap's depth apart, so any gap wider than half of one
	// starts the next row.
	islands.sort((a, b) => a.centre.z - b.centre.z);
	const capDepth = Math.min(...islands.map((island) => island.size.z));
	const rows: (typeof islands)[] = [];
	for (const island of islands) {
		const row = rows.at(-1);
		if (row && island.centre.z - row[0].centre.z < capDepth / 2) row.push(island);
		else rows.push([island]);
	}

	const matches =
		rows.length === KEY_ROWS.length && rows.every((row, r) => row.length === KEY_ROWS[r].length);
	if (!matches) {
		geometry.dispose();
		return null;
	}

	const keys = new Map<string, Key>();
	rows.forEach((row, r) => {
		row.sort((a, b) => a.centre.x - b.centre.x);
		row.forEach((island, c) => {
			const label = KEY_ROWS[r][c];
			// The second SHIFT is never typed with; the first one is enough.
			if (!label || keys.has(label)) return;
			const restY = new Float32Array(island.vertices.length);
			island.vertices.forEach((i, n) => (restY[n] = positions.getY(i)));
			keys.set(label, {
				vertices: island.vertices,
				restY,
				travel: island.size.y * TRAVEL
			});
		});
	});

	mesh.geometry = geometry;
	const pressed = new Map<Key, number>();

	function press(label: string, amount: number) {
		const key = keys.get(label.toUpperCase());
		if (!key || (pressed.get(key) ?? 0) === amount) return;
		pressed.set(key, amount);
		key.vertices.forEach((i, n) => positions.setY(i, key.restY[n] - key.travel * amount));
		positions.needsUpdate = true;
	}

	return {
		has: (label) => keys.has(label.toUpperCase()),
		press,
		release() {
			for (const label of keys.keys()) press(label, 0);
		},
		dispose: () => geometry.dispose()
	};
}
