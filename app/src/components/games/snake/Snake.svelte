<script lang="ts">
	import { onMount } from 'svelte';

	const mapWidth: number = 25;
	const startingPosition: number = Math.floor(mapWidth / 2);

	type Snake = {
		length: number;
		occupiedCells: boolean[][];
		headPosition: { x: number; y: number };
	};

	type MapCell = {
		isFood: boolean;
		isOccupied: boolean;
	};

	const snakeMap: MapCell[][] = [];
	const snake: Snake = {
		length: 1,
		occupiedCells: [],
		headPosition: { x: startingPosition, y: startingPosition }
	};

	function init() {
		for (let i: number = 0; i < mapWidth; i++) {
			snakeMap[i] = [];
			for (let j: number = 0; j < mapWidth; j++) {
				snakeMap[i][j] = {
					isFood: false,
					isOccupied: false
				};
			}
		}

		snake.occupiedCells = Array(mapWidth)
			.fill(null)
			.map(() => Array(mapWidth).fill(false));

		const x = startingPosition;
		const y = startingPosition;
		snake.occupiedCells[x][y] = true;
		snakeMap[x][y].isOccupied = true;
		snake.headPosition = { x, y };
	}

	function isCellOccupied(x: number, y: number): boolean {
		return snake.occupiedCells[x]?.[y] || false;
	}

	function isCellFood(x: number, y: number): boolean {
		return snake.occupiedCells[x]?.[y] || false;
	}

	function occupyCell(x: number, y: number): void {
		if (x >= 0 && x < mapWidth && y >= 0 && y < mapWidth) {
			snake.occupiedCells[x][y] = true;
			snakeMap[x][y].isOccupied = true;
		}
	}

	function clearCell(x: number, y: number): void {
		if (x >= 0 && x < mapWidth && y >= 0 && y < mapWidth) {
			snake.occupiedCells[x][y] = false;
			snakeMap[x][y].isOccupied = false;
		}
	}

	function moveSnake(newX: number, newY: number): void {
		if (newX < 0 || newX >= mapWidth || newY < 0 || newY >= mapWidth) {
			console.log('Out of bounds!');
			return;
		}

		if (isCellOccupied(newX, newY)) {
			console.log('Collision with self!');
			return;
		}

		occupyCell(newX, newY);
		snake.headPosition = { x: newX, y: newY };

		if (isCellFood(newX, newY)) {
			snake.length += 1;
		} else {
			clearCell();
		}
	}

	onMount(() => init());

	function moveDown() {
		moveSnake(snake.headPosition.x + 1, snake.headPosition.y);
	}

	function moveUp() {
		moveSnake(snake.headPosition.x - 1, snake.headPosition.y);
	}

	function moveLeft() {
		moveSnake(snake.headPosition.x, snake.headPosition.y - 1);
	}

	function moveRight() {
		moveSnake(snake.headPosition.x, snake.headPosition.y + 1);
	}
</script>

<div>
	<!-- Optional: Display grid for debugging -->
	{#each snakeMap as row, x}
		{#each row as cell, y}
			<div
				style="display: inline-block; width: 20px; height: 20px; border: 1px solid #ccc; background-color: {cell.isOccupied
					? '#333'
					: '#fff'}"
			>
				{cell.isOccupied ? 'S' : ''}
			</div>
		{/each}
		<br />
	{/each}

	<button onclick={moveDown}>Move Down</button>
	<button onclick={moveUp}>Move Up</button>
	<button onclick={moveLeft}>Move Left</button>
	<button onclick={moveRight}>Move Right</button>
</div>
