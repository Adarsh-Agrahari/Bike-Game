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

// Joystick properties
const joystick = {
	x: 100,
	y: canvas.height - 100,
	radius: 50,
	knob: { x: 100, y: canvas.height - 100, radius: 20 },
	isDragging: false,
};

// Track joystick direction
let joystickDirection = { x: 0, y: 0 };

// Handle touch events for the joystick
canvas.addEventListener("touchstart", (e) => {
	const touch = e.touches[0];
	const dx = touch.clientX - joystick.x;
	const dy = touch.clientY - joystick.y;
	if (Math.sqrt(dx * dx + dy * dy) < joystick.radius) {
		joystick.isDragging = true;
	}
});

canvas.addEventListener("touchmove", (e) => {
	if (!joystick.isDragging) return;

	const touch = e.touches[0];
	const dx = touch.clientX - joystick.x;
	const dy = touch.clientY - joystick.y;
	const distance = Math.sqrt(dx * dx + dy * dy);
	const maxDistance = joystick.radius;

	if (distance > maxDistance) {
		const angle = Math.atan2(dy, dx);
		joystick.knob.x = joystick.x + maxDistance * Math.cos(angle);
		joystick.knob.y = joystick.y + maxDistance * Math.sin(angle);
	} else {
		joystick.knob.x = touch.clientX;
		joystick.knob.y = touch.clientY;
	}

	// Calculate direction
	joystickDirection.x = (joystick.knob.x - joystick.x) / maxDistance;
	joystickDirection.y = (joystick.knob.y - joystick.y) / maxDistance;
});

canvas.addEventListener("touchend", () => {
	joystick.isDragging = false;
	joystick.knob.x = joystick.x;
	joystick.knob.y = joystick.y;
	joystickDirection = { x: 0, y: 0 };
});

// Update game state
function update() {
	// Move bike based on joystick direction
	bike.x += joystickDirection.x * bike.speed;
	bike.y += joystickDirection.y * bike.speed;

	// Constrain bike to canvas boundaries
	bike.x = Math.max(0, Math.min(bike.x, canvas.width - bike.width));
	bike.y = Math.max(0, Math.min(bike.y, canvas.height - bike.height));

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

	// Draw joystick
	ctx.beginPath();
	ctx.arc(joystick.x, joystick.y, joystick.radius, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
	ctx.fill();
	ctx.closePath();

	ctx.beginPath();
	ctx.arc(
		joystick.knob.x,
		joystick.knob.y,
		joystick.knob.radius,
		0,
		Math.PI * 2
	);
	ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
	ctx.fill();
	ctx.closePath();
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
