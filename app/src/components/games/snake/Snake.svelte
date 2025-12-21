<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, Pause } from '@lucide/svelte';

	interface SnakeProps {
		isMobile: boolean;
	}

	let { isMobile }: SnakeProps = $props();

	const mapWidth: number = 15;
	const startingPosition: number = Math.floor(mapWidth / 2);

	type GameStates = 'paused' | 'playing' | 'lost' | 'won' | 'start';
	type GameDifficulties = 100 | 200 | 300;

	type Position = { x: number; y: number };

	type Snake = {
		body: Position[];
		direction: Position;
	};

	type MapCell = {
		isFood: boolean;
		isOccupied: boolean;
	};
	let gameDifficulty: GameDifficulties = $state(200);
	let gameState: GameStates = $state('start');

	const snakeMap: MapCell[][] = $state([]);
	let snake: Snake = $state({
		body: [{ x: startingPosition, y: startingPosition }],
		direction: { x: 0, y: 0 }
	});

	function setGameState(state: GameStates) {
		if (state === 'playing' && (gameState === 'won' || gameState === 'lost')) {
			init();
			spawnFood();
		}
		gameState = state;
	}

	function pauseOrUnpauseGame() {
		gameState = (gameState === 'paused' ? 'playing' : 'paused') as GameStates;
	}

	function setGameDifficulty(difficulty: GameDifficulties) {
		gameDifficulty = difficulty;
		gameState = 'playing';
	}

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

		snake = {
			body: [{ x: startingPosition, y: startingPosition }],
			direction: { x: 0, y: 0 }
		};

		updateMap();
	}

	function updateMap() {
		for (let i = 0; i < mapWidth; i++) {
			for (let j = 0; j < mapWidth; j++) {
				snakeMap[i][j].isOccupied = false;
			}
		}

		snake.body.forEach((segment) => {
			if (segment.x >= 0 && segment.x < mapWidth && segment.y >= 0 && segment.y < mapWidth) {
				snakeMap[segment.x][segment.y].isOccupied = true;
			}
		});
	}

	function moveSnake(): void {
		if (snake.direction.x === 0 && snake.direction.y === 0) {
			return;
		}

		const head = snake.body[0];
		const newHead: Position = {
			x: head.x + snake.direction.x,
			y: head.y + snake.direction.y
		};

		if (newHead.x < 0 || newHead.x >= mapWidth || newHead.y < 0 || newHead.y >= mapWidth) {
			gameState = 'lost';
			console.log('Out of bounds!');
			return;
		}

		for (let i = 1; i < snake.body.length; i++) {
			if (snake.body[i].x === newHead.x && snake.body[i].y === newHead.y) {
				gameState = 'lost';
				console.log('Collision with self!');
				return;
			}
		}

		snake.body.unshift(newHead);

		if (!snakeMap[newHead.x][newHead.y].isFood) {
			snake.body.pop();
		} else {
			snakeMap[newHead.x][newHead.y].isFood = false;
			spawnFood();
		}

		updateMap();
	}

	function spawnFood() {
		const emptyCells: Position[] = [];
		for (let i = 0; i < mapWidth; i++) {
			for (let j = 0; j < mapWidth; j++) {
				if (!snakeMap[i][j].isOccupied && !snakeMap[i][j].isFood) {
					emptyCells.push({ x: i, y: j });
				}
			}
		}

		if (emptyCells.length > 0) {
			const randomIndex = Math.floor(Math.random() * emptyCells.length);
			const foodPos = emptyCells[randomIndex];
			snakeMap[foodPos.x][foodPos.y].isFood = true;
		}
	}

	function setDirection(dx: number, dy: number) {
		const currentDir = snake.direction;
		if (currentDir.x !== -dx || currentDir.y !== -dy) {
			snake.direction = { x: dx, y: dy };
		}
	}

	function handleKeyDown(event: KeyboardEvent): void {
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
			event.preventDefault();
		}

		switch (event.key) {
			case 'ArrowUp':
			case 'w':
			case 'W':
				moveUp();
				break;
			case 'ArrowDown':
			case 's':
			case 'S':
				moveDown();
				break;
			case 'ArrowLeft':
			case 'a':
			case 'A':
				moveLeft();
				break;
			case 'ArrowRight':
			case 'd':
			case 'D':
				moveRight();
				break;
			case ' ':
			case 'escape':
				pauseOrUnpauseGame();
				break;
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
		init();
		spawnFood();

		const interval = setInterval(() => {
			if (gameState === 'playing') moveSnake();
		}, gameDifficulty);

		return () => {
			clearInterval(interval);
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	function moveDown() {
		setDirection(1, 0);
	}
	function moveUp() {
		setDirection(-1, 0);
	}
	function moveLeft() {
		setDirection(0, -1);
	}
	function moveRight() {
		setDirection(0, 1);
	}
</script>

<div>
	<h2>Snake</h2>
	{#if gameState === 'playing'}
		<h3>Score: {snake.body.length}</h3>

		{#each snakeMap as row, x}
			{#each row as cell, y}
				<div
					style="display: inline-block; width: 20px; height: 20px; border: 1px solid #ccc; background-color: {cell.isOccupied
						? '#333'
						: cell.isFood
							? '#f00'
							: '#fff'}"
				></div>
			{/each}
			<br />
		{/each}
	{:else if gameState === 'start'}
		<h4>choose difficulty</h4>
		<button onclick={() => setGameDifficulty(100)}>Easy</button>
		<button onclick={() => setGameDifficulty(200)}>Medium</button>
		<button onclick={() => setGameDifficulty(300)}>Hard</button>
	{:else if gameState === 'lost'}
		<h4>you lost!</h4>
		<h5>do you want to try again?</h5>
		<button onclick={() => setGameState('playing')}>try again</button>
	{:else if gameState === 'paused'}
		<h4>paused</h4>
		<button onclick={() => setGameState('playing')}>resume</button>
	{:else if gameState === 'won'}
		<h4>you won!</h4>
		<h5>do you want to try again?</h5>
		<button onclick={() => setGameState('playing')}>try again</button>
	{/if}

	{#if isMobile && (gameState === 'playing' || gameState === 'paused')}
		<!-- {#if isMobile} -->
		<div
			style="margin-top: 20px; display: flex; flex-direction: column; align-content: center; justify-content: center;"
		>
			<button class="earlyweb-button" style="width: 48px; height: 48px;" onclick={moveUp}
				><ArrowUp /></button
			>
			<div>
				<button class="earlyweb-button" style="width: 48px; height: 48px;" onclick={moveLeft}
					><ArrowLeft /></button
				>
				<button
					class="earlyweb-button"
					style="width: 48px; height: 48px;"
					onclick={() => pauseOrUnpauseGame()}
				>
					{#if gameState === 'paused'}
						<Play />
					{:else if gameState === 'playing'}
						<Pause />
					{/if}
				</button>
				<button class="earlyweb-button" style="width: 48px; height: 48px;" onclick={moveRight}>
					<ArrowRight />
				</button>
			</div>
			<button class="earlyweb-button" style="width: 48px; height: 48px;" onclick={moveDown}
				><ArrowDown /></button
			>
		</div>
	{/if}
</div>
