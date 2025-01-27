const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set initial canvas dimensions
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
let lineOffset = 0; // Controls the vertical position of the dashed line

// Adjust canvas dimensions to fit the screen while maintaining aspect ratio
if (canvasWidth > 700) {
	const aspectRatio = 600 / 800; // Original aspect ratio of the game
	if (canvasWidth / canvasHeight > aspectRatio) {
		canvasWidth = canvasHeight * aspectRatio;
	} else {
		canvasHeight = canvasWidth / aspectRatio;
	}
}

canvas.width = canvasWidth;
canvas.height = canvasHeight;

// Load images
const playerImage = new Image();
playerImage.src = "player.png";

const carImages = [new Image(), new Image(), new Image()];
carImages[0].src = "car1.png";
carImages[1].src = "car2.png";
carImages[2].src = "car3.png";

const policeImage = new Image();
policeImage.src = "police.png";

// Bike properties
const bike = {
	x: canvas.width / 2 - 25,
	y: canvas.height - 100,
	width: 50 * (canvasWidth / 600),
	height: 90 * (canvasWidth / 600),
	speed: 5,
	velocityX: 0,
	velocityY: 0,
};

// Obstacle properties
const obstacles = [];
const obstacleWidth = 60 * (canvasWidth / 600);
const obstacleHeight = 120 * (canvasWidth / 600);
let obstacleSpeed = 3;
let obstacleSpawnRate = 200;
let frameCount = 0;
let gameOver = false;

// Score variables
let score = 0;
let bestScore = localStorage.getItem("bestScore") || 0;

const dashLength = 20; // Length of each dash
const gapLength = 30; // Length of the gap between dashes
const totalSegmentLength = dashLength + gapLength; // Total length of one dash + gap

// Police properties
const police = [
	{
		x: canvas.width / 2 - 25,
		y: canvas.height,
		width: 50 * (canvasWidth / 600),
		height: 90 * (canvasWidth / 600),
		speed: 1,
		isActive: false,
		isKicked: false,
		kickVelocityX: 0,
		kickVelocityY: 0,
		attachedToCar: false,
		attachedCarIndex: -1,
	},
	{
		x: canvas.width / 2 - 25,
		y: canvas.height,
		width: 50 * (canvasWidth / 600),
		height: 90 * (canvasWidth / 600),
		speed: 1,
		isActive: false,
		isKicked: false,
		kickVelocityX: 0,
		kickVelocityY: 0,
		attachedToCar: false,
		attachedCarIndex: -1,
	},
];

// Joystick properties
const joystick = {
	x: canvas.width - 150 * (canvasWidth / 600),
	y: canvas.height - 150 * (canvasWidth / 600),
	radius: 80 * (canvasWidth / 600),
	knob: {
		x: canvas.width - 150 * (canvasWidth / 600),
		y: canvas.height - 150 * (canvasWidth / 600),
		radius: 30 * (canvasWidth / 600),
	},
	isDragging: false,
};

// Track joystick direction
let joystickDirection = { x: 0, y: 0 };

// Function to get canvas position
function getCanvasPosition() {
	const rect = canvas.getBoundingClientRect();
	return {
		left: rect.left,
		top: rect.top,
	};
}

// Handle touch events for the joystick
canvas.addEventListener("touchstart", (e) => {
	const touch = e.touches[0];
	const canvasPos = getCanvasPosition();
	const touchX = touch.clientX - canvasPos.left;
	const touchY = touch.clientY - canvasPos.top;

	const dx = touchX - joystick.x;
	const dy = touchY - joystick.y;
	if (Math.sqrt(dx * dx + dy * dy) < joystick.radius) {
		joystick.isDragging = true;
	}
});

canvas.addEventListener("touchmove", (e) => {
	if (!joystick.isDragging) return;

	const touch = e.touches[0];
	const canvasPos = getCanvasPosition();
	const touchX = touch.clientX - canvasPos.left;
	const touchY = touch.clientY - canvasPos.top;

	const dx = touchX - joystick.x;
	const dy = touchY - joystick.y;
	const distance = Math.sqrt(dx * dx + dy * dy);
	const maxDistance = joystick.radius;

	if (distance > maxDistance) {
		const angle = Math.atan2(dy, dx);
		joystick.knob.x = joystick.x + maxDistance * Math.cos(angle);
		joystick.knob.y = joystick.y + maxDistance * Math.sin(angle);
	} else {
		joystick.knob.x = touchX;
		joystick.knob.y = touchY;
	}

	joystickDirection.x = (joystick.knob.x - joystick.x) / maxDistance;
	joystickDirection.y = (joystick.knob.y - joystick.y) / maxDistance;
});

canvas.addEventListener("touchend", () => {
	joystick.isDragging = false;
	joystick.knob.x = joystick.x;
	joystick.knob.y = joystick.y;
	joystickDirection = { x: 0, y: 0 };
});

// Keyboard controls
const keys = {
	ArrowLeft: false,
	ArrowRight: false,
	ArrowUp: false,
	ArrowDown: false,
};

window.addEventListener("keydown", (e) => {
	if (keys.hasOwnProperty(e.key)) {
		keys[e.key] = true;
	}
});

window.addEventListener("keyup", (e) => {
	if (keys.hasOwnProperty(e.key)) {
		keys[e.key] = false;
	}
});

// Function to check collision between two objects
function checkCollision(obj1, obj2) {
	return (
		obj1.x + 10 < obj2.x + obj2.width &&
		obj1.x + obj1.width > 10 + obj2.x &&
		obj1.y + 10 < obj2.y + obj2.height &&
		obj1.y + obj1.height > 10 + obj2.y
	);
}

// Add kick functionality with cooldown
let kickButtonCooldown = false;

document.getElementById("kickButton").addEventListener("click", () => {
	if (gameOver || kickButtonCooldown) return;

	// Disable the button and start cooldown
	kickButtonCooldown = true;
	const kickButton = document.getElementById("kickButton");
	kickButton.classList.add("disabled");

	// Perform the kick functionality
	for (let i = 0; i < police.length; i++) {
		if (police[i].isActive) {
			const dx = bike.x - police[i].x;
			const dy = bike.y - police[i].y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < 100) {
				// Detach from car if attached
				police[i].attachedToCar = false;
				police[i].attachedCarIndex = -1;
				police[i].isKicked = true;
				const oppositeDirectionX = -dx / distance;
				const oppositeDirectionY = -dy / distance;
				const kickSpeed = 15;
				police[i].kickVelocityX = oppositeDirectionX * kickSpeed;
				police[i].kickVelocityY = oppositeDirectionY * kickSpeed;
				score += 50;
			}
		}
	}

	// Re-enable the button after 1 second
	setTimeout(() => {
		kickButtonCooldown = false;
		kickButton.classList.remove("disabled");
	}, 1000);
});

// Update game state
function update() {
	if (gameOver) return;

	// Move the dashed line downward
	lineOffset += obstacleSpeed + 2; // Move the line upward at the same speed as the obstacles
	if (lineOffset >= totalSegmentLength) {
		// Reset the offset to create a seamless loop
		lineOffset = 0;
	}

	// Rest of the update function remains the same...
	// Move bike based on joystick direction or keyboard input
	if (joystickDirection.x !== 0 || joystickDirection.y !== 0) {
		bike.velocityX = joystickDirection.x * bike.speed;
		bike.velocityY = joystickDirection.y * bike.speed;
	} else {
		bike.velocityX = 0;
		bike.velocityY = 0;
		if (keys.ArrowLeft) bike.velocityX = -bike.speed;
		if (keys.ArrowRight) bike.velocityX = bike.speed;
		if (keys.ArrowUp) bike.velocityY = -bike.speed;
		if (keys.ArrowDown) bike.velocityY = bike.speed;
	}

	bike.x += bike.velocityX;
	bike.y += bike.velocityY;

	// Constrain bike to canvas boundaries
	bike.x = Math.max(0, Math.min(bike.x, canvas.width - bike.width));
	bike.y = Math.max(0, Math.min(bike.y, canvas.height - bike.height));

	// Spawn obstacles
	if (frameCount % obstacleSpawnRate === 0) {
		const obstacle = {
			x: Math.random() * (canvas.width - obstacleWidth),
			y: -obstacleHeight,
			width: obstacleWidth,
			height: obstacleHeight,
			image: carImages[Math.floor(Math.random() * carImages.length)],
		};
		obstacles.push(obstacle);
	}

	// Move obstacles
	for (let i = obstacles.length - 1; i >= 0; i--) {
		obstacles[i].y += obstacleSpeed;

		// Remove obstacles that are off-screen and increment score
		if (obstacles[i].y > canvas.height) {
			// Update police attachedCarIndex before removing the obstacle
			for (let p = 0; p < police.length; p++) {
				if (police[p].attachedCarIndex === i) {
					police[p].isActive = false;
					police[p].attachedToCar = false;
					police[p].attachedCarIndex = -1;
					score += 25; // Bonus points for police going off screen
				} else if (police[p].attachedCarIndex > i) {
					police[p].attachedCarIndex--; // Adjust indices
				}
			}
			obstacles.splice(i, 1);
			score += 10;
			continue;
		}

		// Check for collisions between bike and obstacles
		if (checkCollision(bike, obstacles[i])) {
			gameOver = true;
			document.getElementById("restartButton").style.display = "block";
			if (score > bestScore) {
				bestScore = score;
				localStorage.setItem("bestScore", bestScore);
			}
		}
	}

	// Spawn first police when score reaches 20
	if (score >= 20 && !police[0].isActive) {
		police[0].isActive = true;
		police[0].x = Math.random() * (canvas.width - police[0].width);
		police[0].y = canvas.height;
	}

	// Increase speed of first police when score reaches 50
	if (score >= 50) {
		police[0].speed = 2;
	}

	// Spawn second police when score reaches 100
	if (score >= 100 && !police[1].isActive) {
		police[1].isActive = true;
		police[1].x = Math.random() * (canvas.width - police[1].width);
		police[1].y = canvas.height;
	}

	// Move police if active
	for (let i = 0; i < police.length; i++) {
		if (police[i].isActive) {
			if (police[i].isKicked) {
				// If the police is kicked, move them in the opposite direction
				police[i].x += police[i].kickVelocityX;
				police[i].y += police[i].kickVelocityY;

				// Deactivate the police if they go off-screen
				if (
					police[i].x < -police[i].width ||
					police[i].x > canvas.width ||
					police[i].y < -police[i].height ||
					police[i].y > canvas.height
				) {
					police[i].isActive = false;
					police[i].isKicked = false;
					police[i].attachedToCar = false;
					police[i].attachedCarIndex = -1;
				}
			} else if (police[i].attachedToCar) {
				// If police is attached to a car, move with it
				if (
					police[i].attachedCarIndex >= 0 &&
					police[i].attachedCarIndex < obstacles.length
				) {
					const attachedCar = obstacles[police[i].attachedCarIndex];
					police[i].y = attachedCar.y;
					police[i].x = attachedCar.x;
				}
			} else {
				// Normal police movement towards the player
				const dx = bike.x - police[i].x;
				const dy = bike.y - police[i].y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance > 0) {
					police[i].x += (dx / distance) * police[i].speed;
					police[i].y += (dy / distance) * police[i].speed;
				}

				// Check for collision with cars
				for (let j = 0; j < obstacles.length; j++) {
					if (checkCollision(police[i], obstacles[j])) {
						police[i].attachedToCar = true;
						police[i].attachedCarIndex = j;
						police[i].x = obstacles[j].x;
						police[i].y = obstacles[j].y;
						break;
					}
				}

				// Only check for collision with player if police is not attached to a car
				if (
					!police[i].attachedToCar &&
					checkCollision(bike, police[i])
				) {
					gameOver = true;
					document.getElementById("restartButton").style.display =
						"block";
					if (score > bestScore) {
						bestScore = score;
						localStorage.setItem("bestScore", bestScore);
					}
				}
			}
		}
	}

	// Increase difficulty over time
	if (frameCount % 1000 === 0) {
		obstacleSpeed += 0.5;
		obstacleSpawnRate = Math.max(50, obstacleSpawnRate - 10);
	}

	frameCount++;
}

// Render game
function render() {
	// Clear canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Draw the moving dashed vertical line in the middle of the canvas
	ctx.beginPath();
	ctx.setLineDash([dashLength, gapLength]); // Set the dash pattern (dashLength, gapLength)
	ctx.strokeStyle = "white"; // Set the line color
	ctx.lineWidth = 4; // Set the line width

	// Draw multiple segments of the dashed line to cover the entire canvas height
	for (let y = lineOffset; y < canvas.height; y += totalSegmentLength) {
		ctx.moveTo(canvas.width / 2, y); // Start at the middle of the canvas
		ctx.lineTo(canvas.width / 2, y + dashLength); // Draw a dash of the specified length
	}

	ctx.stroke(); // Render the line
	ctx.setLineDash([]); // Reset the dash pattern for other drawings

	// Draw bike
	ctx.drawImage(playerImage, bike.x, bike.y, bike.width, bike.height);

	// Draw obstacles
	for (const obstacle of obstacles) {
		ctx.drawImage(
			obstacle.image,
			obstacle.x,
			obstacle.y,
			obstacle.width,
			obstacle.height
		);
	}

	// Draw police if active
	for (let i = 0; i < police.length; i++) {
		if (police[i].isActive) {
			ctx.save();

			if (police[i].attachedToCar) {
				// Rotate the police when attached to car
				ctx.translate(
					police[i].x + police[i].width / 2,
					police[i].y + police[i].height / 2
				);
				// ctx.rotate(Math.PI / 2); // Rotate 90 degrees
				ctx.drawImage(
					policeImage,
					-police[i].width / 2,
					-police[i].height / 2,
					police[i].width,
					police[i].height
				);
			} else {
				// Draw normally if not attached
				ctx.drawImage(
					policeImage,
					police[i].x,
					police[i].y,
					police[i].width,
					police[i].height
				);
			}

			ctx.restore();
		}
	}

	// Draw joystick
	ctx.beginPath();
	ctx.arc(joystick.x, joystick.y, joystick.radius, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
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
	ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
	ctx.fill();
	ctx.closePath();

	// Draw score and best score
	ctx.fillStyle = "white";
	ctx.font = "18px Arial";
	ctx.fillText(`Score : ${score}`, 10, 30);
	ctx.fillText(`Best Score : ${bestScore}`, 10, 60);
}
// Game loop
function gameLoop() {
	update();
	render();
	if (!gameOver) requestAnimationFrame(gameLoop);
}

// Start the game after images are loaded
Promise.all([
	new Promise((resolve) => {
		playerImage.onload = resolve;
	}),
	new Promise((resolve) => {
		carImages[0].onload = resolve;
	}),
	new Promise((resolve) => {
		carImages[1].onload = resolve;
	}),
	new Promise((resolve) => {
		carImages[2].onload = resolve;
	}),
	new Promise((resolve) => {
		policeImage.onload = resolve;
	}),
]).then(() => {
	document.getElementById("playButton").style.display = "block";
});

// Handle window resize
window.addEventListener("resize", () => {
	// Recalculate canvas dimensions
	canvasWidth = window.innerWidth;
	canvasHeight = window.innerHeight;

	if (canvasWidth > 700) {
		const aspectRatio = 600 / 800;
		if (canvasWidth / canvasHeight > aspectRatio) {
			canvasWidth = canvasHeight * aspectRatio;
		} else {
			canvasHeight = canvasWidth / aspectRatio;
		}
	}

	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	// Adjust game elements to new canvas size
	bike.width = 50 * (canvasWidth / 600);
	bike.height = 90 * (canvasWidth / 600);
	bike.x = canvas.width / 2 - 25;
	bike.y = canvas.height - 100;

	// Update joystick position
	joystick.x = canvas.width - 150 * (canvasWidth / 600);
	joystick.y = canvas.height - 150 * (canvasWidth / 600);
	joystick.radius = 80 * (canvasWidth / 600);
	joystick.knob.x = joystick.x;
	joystick.knob.y = joystick.y;
	joystick.knob.radius = 30 * (canvasWidth / 600);

	// Update police dimensions
	for (let i = 0; i < police.length; i++) {
		police[i].width = 50 * (canvasWidth / 600);
		police[i].height = 90 * (canvasWidth / 600);
	}
});

// Event listeners for buttons
document.getElementById("playButton").addEventListener("click", () => {
	document.getElementById("playButton").style.display = "none";
	document.getElementById("restartButton").style.display = "none";
	gameOver = false;
	obstacles.length = 0;
	frameCount = 0;
	score = 0;
	police[0].isActive = false;
	police[1].isActive = false;
	bike.x = canvas.width / 2 - 25;
	bike.y = canvas.height - 100;
	gameLoop();
});

document.getElementById("restartButton").addEventListener("click", () => {
	document.getElementById("restartButton").style.display = "none";
	gameOver = false;
	obstacles.length = 0;
	frameCount = 0;
	score = 0;
	police[0].isActive = false;
	police[1].isActive = false;
	bike.x = canvas.width / 2 - 25;
	bike.y = canvas.height - 100;
	gameLoop();
});

// Full-screen button functionality
const gameContainer = document.getElementById("gameContainer");

document.getElementById("fullScreenButton").addEventListener("click", () => {
	if (!document.fullscreenElement) {
		gameContainer.requestFullscreen().catch((err) => {
			alert(`Error entering full-screen: ${err.message}`);
		});
	} else {
		document.exitFullscreen();
	}
});

// Handle full-screen change events
document.addEventListener("fullscreenchange", () => {
	if (document.fullscreenElement) {
		setTimeout(() => {
			canvas.width = canvasWidth;
			canvas.height = canvasHeight;
			bike.x = canvas.width / 2 - 25;
			bike.y = canvas.height - 100;
		}, 100);
	}
});
