<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, Pause } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';

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
	let gameDifficulty: number = $state(0);
	let gameState: GameStates = $state('start');
	let highScore: number = $state(1);
	let nextDirections: Position[] = [];

	const snakeMap: MapCell[][] = $state([]);
	let snake: Snake = $state({
		body: [{ x: startingPosition, y: startingPosition }],
		direction: { x: 0, y: 0 }
	});

	function setGameState(state: GameStates) {
		if (state === 'start' && (gameState === 'won' || gameState === 'lost')) {
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
		if (nextDirections.length > 0) {
			const nextDir = nextDirections.shift();
			if (nextDir) {
				snake.direction = nextDir;
			}
		}

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
			return;
		}

		for (let i = 1; i < snake.body.length; i++) {
			if (snake.body[i].x === newHead.x && snake.body[i].y === newHead.y) {
				gameState = 'lost';
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
			nextDirections.push({ x: dx, y: dy });
		}
	}

	function updateHighScore() {
		if (snake.body.length > highScore) {
			highScore = snake.body.length;
		}
	}

	function checkWinCondition() {
		if (snake.body.length === mapWidth ** 2) gameState = 'won';
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
			case 'Escape':
				pauseOrUnpauseGame();
				break;
		}
	}

	$effect(() => {
		if (gameState === 'playing' && gameDifficulty > 0) {
			const interval = setInterval(() => {
				moveSnake();
				updateHighScore();
				checkWinCondition();
			}, gameDifficulty);

			return () => {
				clearInterval(interval);
			};
		}
	});

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
		init();
		spawnFood();

		return () => {
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

<div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
	<h2>{m.snake()}</h2>

	<div
		style="position: relative; display: inline-flex; flex-direction: row; justify-content: space-between; width: 100%; max-width: 450px; margin: 0 1rem"
	>
		<h3>{m.score()}: {snake.body.length}</h3>
		<h3>{m.high_score()}: {highScore}</h3>
	</div>

	<div
		style="position: relative; display: inline-block; margin: 0 auto; width: 100%; max-width: 450px;"
	>
		<div
			style="
			display: grid;
			grid-template-columns: repeat({mapWidth}, 1fr);
			gap: 1px;
			opacity: {gameState === 'playing' ? 1 : 0.3};
			width: 100%;
			aspect-ratio: 1 / 1;
			max-width: 450px;
			margin: 0 auto;
		"
		>
			{#each snakeMap.flat() as cell}
				<div
					style="
					background-color: {cell.isOccupied ? '#333' : cell.isFood ? '#f00' : '#fff'};
					border: 1px solid #ccc;
				"
				></div>
			{/each}
		</div>

		{#if gameState !== 'playing'}
			<div
				style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: rgba(255, 255, 255, 0.7);"
			>
				{#if gameState === 'start'}
					<div class="earlyweb-container" style="padding: 20px;">
						<h4>{m.choose_difficulty()}</h4>
						<div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
							<button
								class="earlyweb-button"
								style="padding: 5px"
								onclick={() => setGameDifficulty(300)}>{m.easy()}</button
							>
							<button
								class="earlyweb-button"
								style="padding: 5px"
								onclick={() => setGameDifficulty(200)}>{m.medium()}</button
							>
							<button
								class="earlyweb-button"
								style="padding: 5px"
								onclick={() => setGameDifficulty(100)}>{m.hard()}</button
							>
						</div>
					</div>
				{:else if gameState === 'lost'}
					<div class="earlyweb-container" style="padding: 20px; text-align: center;">
						<h4>{m.you_lost()}</h4>
						<h5>{m.ask_try_again()}</h5>
						<button
							class="earlyweb-button"
							onclick={() => setGameState('start')}
							style="margin-top: 15px; padding: 5px;">{m.try_again()}</button
						>
					</div>
				{:else if gameState === 'paused'}
					<div class="earlyweb-container" style="padding: 20px;  text-align: center;">
						<h4>paused</h4>
						<button
							class="earlyweb-button"
							onclick={() => setGameState('playing')}
							style="margin-top: 15px; padding: 5px;">{m.resume()}</button
						>
					</div>
				{:else if gameState === 'won'}
					<div class="earlyweb-container" style="padding: 20px; text-align: center;">
						<h4>{m.you_won()}</h4>
						<h5>{m.ask_try_again()}</h5>
						<button
							class="earlyweb-button"
							onclick={() => setGameState('playing')}
							style="margin-top: 15px; padding: 5px;">{m.try_again()}</button
						>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if isMobile}
		<div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px;">
			<button
				class="earlyweb-button"
				style="width: 60px; height: 60px;"
				onclick={moveUp}
				disabled={gameState !== 'playing'}
			>
				<ArrowUp />
			</button>
			<div style="display: flex; gap: 10px; margin: 5px 0;">
				<button
					class="earlyweb-button"
					style="width: 60px; height: 60px;"
					onclick={moveLeft}
					disabled={gameState !== 'playing'}
				>
					<ArrowLeft />
				</button>
				<button
					class="earlyweb-button"
					style="width: 60px; height: 60px;"
					onclick={() => pauseOrUnpauseGame()}
					disabled={gameState !== 'playing'}
				>
					{#if gameState === 'playing'}
						<Pause />
					{:else}
						<Play />
					{/if}
				</button>
				<button
					class="earlyweb-button"
					style="width: 60px; height: 60px;"
					onclick={moveRight}
					disabled={gameState !== 'playing'}
				>
					<ArrowRight />
				</button>
			</div>
			<button
				class="earlyweb-button"
				style="width: 60px; height: 60px;"
				onclick={moveDown}
				disabled={gameState !== 'playing'}
			>
				<ArrowDown />
			</button>
		</div>
	{/if}
</div>
