const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 600;
canvas.height = 800;

// Load images
const playerImage = new Image();
playerImage.src = "player.png"; // Path to the bike image

const carImage = new Image();
carImage.src = "car.png"; // Path to the car image

// Bike properties
const bike = {
	x: canvas.width / 2 - 25, // Centered horizontally
	y: canvas.height - 100, // Positioned near the bottom
	width: 50, // Adjusted width for better sizing
	height: 90, // Adjusted height for better sizing
	speed: 5,
};

// Obstacle properties
const obstacles = [];
const obstacleWidth = 60; // Adjusted width for better sizing
const obstacleHeight = 120; // Adjusted height for better sizing
const obstacleSpeed = 3;
let obstacleSpawnRate = 200; // Frames between obstacles
let frameCount = 0;

// Keyboard input
const keys = {
	ArrowLeft: false,
	ArrowRight: false,
};

document.addEventListener("keydown", (e) => {
	if (e.key in keys) {
		keys[e.key] = true;
	}
});

document.addEventListener("keyup", (e) => {
	if (e.key in keys) {
		keys[e.key] = false;
	}
});

// Update game state
function update() {
	// Move bike left and right
	if (keys.ArrowLeft && bike.x > 0) {
		bike.x -= bike.speed;
	}
	if (keys.ArrowRight && bike.x + bike.width < canvas.width) {
		bike.x += bike.speed;
	}

	// Spawn obstacles
	if (frameCount % obstacleSpawnRate === 0) {
		const obstacle = {
			x: Math.random() * (canvas.width - obstacleWidth), // Random horizontal position
			y: -obstacleHeight, // Start above the canvas
			width: obstacleWidth,
			height: obstacleHeight,
		};
		obstacles.push(obstacle);
	}

	// Move obstacles
	for (let i = obstacles.length - 1; i >= 0; i--) {
		obstacles[i].y += obstacleSpeed;

		// Remove obstacles that are off-screen
		if (obstacles[i].y > canvas.height) {
			obstacles.splice(i, 1);
		}

		// Check for collisions
		if (
			bike.x < obstacles[i].x + obstacles[i].width &&
			bike.x + bike.width > obstacles[i].x &&
			bike.y < obstacles[i].y + obstacles[i].height &&
			bike.y + bike.height > obstacles[i].y
		) {
			alert("Game Over!");
			document.location.reload();
		}
	}

	frameCount++;
}

// Render game
function render() {
	// Clear canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Draw bike
	ctx.drawImage(playerImage, bike.x, bike.y, bike.width, bike.height);

	// Draw obstacles
	for (const obstacle of obstacles) {
		ctx.drawImage(
			carImage,
			obstacle.x,
			obstacle.y,
			obstacle.width,
			obstacle.height
		);
	}
}

// Game loop
function gameLoop() {
	update();
	render();
	requestAnimationFrame(gameLoop);
}

// Start the game after images are loaded
Promise.all([
	new Promise((resolve) => {
		playerImage.onload = resolve;
	}),
	new Promise((resolve) => {
		carImage.onload = resolve;
	}),
]).then(() => {
	gameLoop();
});
