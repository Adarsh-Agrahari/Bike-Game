const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Audio Manager
const AudioManager = {
	// Background Music
	bgMusic: new Audio("audio/background.mp3"),

	// Sound Effects
	kickSound: new Audio("audio/kick.mp3"),
	collisionSound: new Audio("audio/collision.mp3"),
	scoreSound: new Audio("audio/score.mp3"),

	// Initialize audio settings
	init() {
		// Set background music to loop
		this.bgMusic.loop = true;

		// Set volumes
		this.bgMusic.volume = 0.3;
		this.kickSound.volume = 0.6;
		this.collisionSound.volume = 0.6;
		this.scoreSound.volume = 0.5;

		// Add mute button functionality
		const muteButton = document.createElement("button");
		muteButton.id = "muteButton";
		muteButton.className = "game-button mute-button";
		muteButton.innerHTML = "🔊";
		muteButton.style.position = "absolute";
		muteButton.style.top = "20px";
		muteButton.style.left = "20px";
		document.getElementById("gameContainer").appendChild(muteButton);

		let isMuted = false;
		muteButton.addEventListener("click", () => {
			isMuted = !isMuted;
			muteButton.innerHTML = isMuted ? "🔇" : "🔊";
			this.setMute(isMuted);
		});
	},

	playBgMusic() {
		this.bgMusic.play().catch((error) => {
			console.log(
				"Audio autoplay was prevented. Click to start the game first."
			);
		});
	},

	playKickSound() {
		this.kickSound.currentTime = 0;
		this.kickSound.play().catch((error) => {
			console.log("Couldn't play kick sound:", error);
		});
	},

	playCollisionSound() {
		this.collisionSound.currentTime = 0;
		this.collisionSound.play().catch((error) => {
			console.log("Couldn't play collision sound:", error);
		});
	},

	playScoreSound() {
		this.scoreSound.currentTime = 0;
		this.scoreSound.play().catch((error) => {
			console.log("Couldn't play score sound:", error);
		});
	},

	setMute(isMuted) {
		this.bgMusic.muted = isMuted;
		this.kickSound.muted = isMuted;
		this.collisionSound.muted = isMuted;
		this.scoreSound.muted = isMuted;
	},

	stopAll() {
		this.bgMusic.pause();
		this.bgMusic.currentTime = 0;
		this.kickSound.pause();
		this.kickSound.currentTime = 0;
		this.collisionSound.pause();
		this.collisionSound.currentTime = 0;
		this.scoreSound.pause();
		this.scoreSound.currentTime = 0;
	},
};

// Initialize audio
AudioManager.init();

// Initial game settings
const INITIAL_OBSTACLE_SPEED = 3;
const INITIAL_SPAWN_RATE = 200;

// Set initial canvas dimensions
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
let lineOffset = 0;

// Adjust canvas dimensions to fit the screen while maintaining aspect ratio
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

// Load images
const playerImage = new Image();
playerImage.src = "player.png";
let playerAspectRatio = 1;

const playerKicking1Image = new Image();
playerKicking1Image.src = "playerkicking1.png";
let playerKicking1AspectRatio = 1;

const playerKicking2Image = new Image();
playerKicking2Image.src = "playerkicking2.png";
let playerKicking2AspectRatio = 1;

// Center offset variables
let playerCenterOffsetX = 0;
let playerKicking1CenterOffsetX = 0;
let playerKicking2CenterOffsetX = 0;

const carImages = [new Image(), new Image(), new Image()];
carImages[0].src = "car1.png";
carImages[1].src = "car2.png";
carImages[2].src = "car3.png";

const policeImage = new Image();
policeImage.src = "police.png";

// Bike properties
const bike = {
	x: canvas.width / 2,
	y: canvas.height - 100,
	width: 50 * (canvasWidth / 600),
	height: 90 * (canvasWidth / 600),
	speed: 5,
	velocityX: 0,
	velocityY: 0,
	currentImage: playerImage,
	currentAspectRatio: 1,
	currentCenterOffsetX: 0,
};

// Game state variables
const obstacles = [];
const obstacleWidth = 60 * (canvasWidth / 600);
const obstacleHeight = 120 * (canvasWidth / 600);
let obstacleSpeed = INITIAL_OBSTACLE_SPEED;
let obstacleSpawnRate = INITIAL_SPAWN_RATE;
let frameCount = 0;
let gameOver = false;

// Score variables
let score = 0;
let bestScore = localStorage.getItem("bestScore") || 0;

// Line properties
const dashLength = 20;
const gapLength = 30;
const totalSegmentLength = dashLength + gapLength;

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

	kickButtonCooldown = true;
	const kickButton = document.getElementById("kickButton");
	kickButton.classList.add("disabled");

	// Play kick sound
	AudioManager.playKickSound();

	// Start kick animation with center-point adjustments
	bike.currentImage = playerKicking1Image;
	bike.currentAspectRatio = playerKicking1AspectRatio;
	bike.currentCenterOffsetX = playerKicking1CenterOffsetX;
	bike.width = bike.height * playerKicking1AspectRatio;

	setTimeout(() => {
		bike.currentImage = playerKicking2Image;
		bike.currentAspectRatio = playerKicking2AspectRatio;
		bike.currentCenterOffsetX = playerKicking2CenterOffsetX;
		bike.width = bike.height * playerKicking2AspectRatio;
	}, 300);

	setTimeout(() => {
		bike.currentImage = playerImage;
		bike.currentAspectRatio = playerAspectRatio;
		bike.currentCenterOffsetX = playerCenterOffsetX;
		bike.width = bike.height * playerAspectRatio;
	}, 600);

	for (let i = 0; i < police.length; i++) {
		if (police[i].isActive) {
			const dx = bike.x - police[i].x;
			const dy = bike.y - police[i].y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < 100) {
				police[i].attachedToCar = false;
				police[i].attachedCarIndex = -1;
				police[i].isKicked = true;
				const oppositeDirectionX = -dx / distance;
				const oppositeDirectionY = -dy / distance;
				const kickSpeed = 15;
				police[i].kickVelocityX = oppositeDirectionX * kickSpeed;
				police[i].kickVelocityY = oppositeDirectionY * kickSpeed;
				score += 50;
				AudioManager.playScoreSound();
			}
		}
	}

	setTimeout(() => {
		kickButtonCooldown = false;
		kickButton.classList.remove("disabled");
	}, 1200);
});

// Update game state
function update() {
	if (gameOver) return;

	// Move the dashed line downward
	lineOffset += obstacleSpeed + 2;
	if (lineOffset >= totalSegmentLength) {
		lineOffset = 0;
	}

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

	// Move and check obstacles
	for (let i = obstacles.length - 1; i >= 0; i--) {
		obstacles[i].y += obstacleSpeed;

		if (obstacles[i].y > canvas.height) {
			for (let p = 0; p < police.length; p++) {
				if (police[p].attachedCarIndex === i) {
					police[p].isActive = false;
					police[p].attachedToCar = false;
					police[p].attachedCarIndex = -1;
					score += 25;
					AudioManager.playScoreSound();
				} else if (police[p].attachedCarIndex > i) {
					police[p].attachedCarIndex--;
				}
			}
			obstacles.splice(i, 1);
			score += 10;
			AudioManager.playScoreSound();
			continue;
		}

		if (checkCollision(bike, obstacles[i])) {
			gameOver = true;
			AudioManager.playCollisionSound();
			AudioManager.bgMusic.pause();
			document.getElementById("restartButton").style.display = "block";
			if (score > bestScore) {
				bestScore = score;
				localStorage.setItem("bestScore", bestScore);
			}
		}
	}

	// Handle police spawning and movement
	if (score >= 20 && !police[0].isActive) {
		police[0].isActive = true;
		police[0].x = Math.random() * (canvas.width - police[0].width);
		police[0].y = canvas.height;
	}

	if (score >= 50) {
		police[0].speed = 2;
	}

	if (score >= 100 && !police[1].isActive) {
		police[1].isActive = true;
		police[1].x = Math.random() * (canvas.width - police[1].width);
		police[1].y = canvas.height;
	}

	// Update police positions
	for (let i = 0; i < police.length; i++) {
		if (police[i].isActive) {
			if (police[i].isKicked) {
				police[i].x += police[i].kickVelocityX;
				police[i].y += police[i].kickVelocityY;

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
				if (
					police[i].attachedCarIndex >= 0 &&
					police[i].attachedCarIndex < obstacles.length
				) {
					const attachedCar = obstacles[police[i].attachedCarIndex];
					police[i].y = attachedCar.y;
					police[i].x = attachedCar.x;
				}
			} else {
				const dx = bike.x - police[i].x;
				const dy = bike.y - police[i].y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance > 0) {
					police[i].x += (dx / distance) * police[i].speed;
					police[i].y += (dy / distance) * police[i].speed;
				}

				for (let j = 0; j < obstacles.length; j++) {
					if (checkCollision(police[i], obstacles[j])) {
						AudioManager.playCollisionSound();
						police[i].attachedToCar = true;
						police[i].attachedCarIndex = j;
						police[i].x = obstacles[j].x;
						police[i].y = obstacles[j].y;
						break;
					}
				}

				if (
					!police[i].attachedToCar &&
					checkCollision(bike, police[i])
				) {
					gameOver = true;
					AudioManager.playCollisionSound();
					AudioManager.bgMusic.pause();
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

// Render game with centered images
function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Draw dashed line
	ctx.beginPath();
	ctx.setLineDash([dashLength, gapLength]);
	ctx.strokeStyle = "white";
	ctx.lineWidth = 4;

	for (let y = lineOffset; y < canvas.height; y += totalSegmentLength) {
		ctx.moveTo(canvas.width / 2, y);
		ctx.lineTo(canvas.width / 2, y + dashLength);
	}

	ctx.stroke();
	ctx.setLineDash([]);

	// Draw bike with center point adjustment
	const drawX = bike.x + (playerCenterOffsetX - bike.currentCenterOffsetX);
	ctx.drawImage(bike.currentImage, drawX, bike.y, bike.width, bike.height);

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

	// Draw police
	for (let i = 0; i < police.length; i++) {
		if (police[i].isActive) {
			ctx.save();
			if (police[i].attachedToCar) {
				ctx.translate(
					police[i].x + police[i].width / 2,
					police[i].y + police[i].height / 2
				);
				ctx.drawImage(
					policeImage,
					-police[i].width / 2,
					-police[i].height / 2,
					police[i].width,
					police[i].height
				);
			} else {
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
	ctx.fillText(`Score: ${score}`, 10, 30);
	ctx.fillText(`Best Score: ${bestScore}`, 10, 60);
}

// Function to reset game state
function resetGame() {
	gameOver = false;
	obstacles.length = 0;
	frameCount = 0;
	score = 0;
	obstacleSpeed = INITIAL_OBSTACLE_SPEED;
	obstacleSpawnRate = INITIAL_SPAWN_RATE;

	// Reset police
	for (let i = 0; i < police.length; i++) {
		police[i].isActive = false;
		police[i].speed = 1;
	}

	// Reset bike with centered position
	bike.x = canvas.width / 2 - playerCenterOffsetX;
	bike.y = canvas.height - 100;
	bike.currentImage = playerImage;
	bike.currentAspectRatio = playerAspectRatio;
	bike.currentCenterOffsetX = playerCenterOffsetX;
	bike.width = bike.height * playerAspectRatio;

	// Reset audio
	AudioManager.stopAll();
	AudioManager.playBgMusic();
}

// Start the game after images are loaded
Promise.all([
	new Promise((resolve) => {
		playerImage.onload = () => {
			playerAspectRatio = playerImage.width / playerImage.height;
			const baseWidth = 90 * (canvasWidth / 600) * playerAspectRatio;
			playerCenterOffsetX = baseWidth / 2;
			bike.currentCenterOffsetX = playerCenterOffsetX;
			resolve();
		};
	}),
	new Promise((resolve) => {
		playerKicking1Image.onload = () => {
			playerKicking1AspectRatio =
				playerKicking1Image.width / playerKicking1Image.height;
			const kickWidth =
				90 * (canvasWidth / 600) * playerKicking1AspectRatio;
			playerKicking1CenterOffsetX = kickWidth / 2;
			resolve();
		};
	}),
	new Promise((resolve) => {
		playerKicking2Image.onload = () => {
			playerKicking2AspectRatio =
				playerKicking2Image.width / playerKicking2Image.height;
			const kick2Width =
				90 * (canvasWidth / 600) * playerKicking2AspectRatio;
			playerKicking2CenterOffsetX = kick2Width / 2;
			resolve();
		};
	}),
	...carImages.map(
		(img) =>
			new Promise((resolve) => {
				img.onload = resolve;
			})
	),
	new Promise((resolve) => {
		policeImage.onload = resolve;
	}),
]).then(() => {
	// Initialize bike position using the center offset
	bike.x = canvas.width / 2 - playerCenterOffsetX;
	document.getElementById("playButton").style.display = "block";
});

// Event listeners for buttons
document.getElementById("playButton").addEventListener("click", () => {
	document.getElementById("playButton").style.display = "none";
	document.getElementById("restartButton").style.display = "none";
	resetGame();
	AudioManager.playBgMusic();
	gameLoop();
});

document.getElementById("restartButton").addEventListener("click", () => {
	document.getElementById("restartButton").style.display = "none";
	resetGame();
	gameLoop();
});

// Handle window resize
window.addEventListener("resize", () => {
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

	// Adjust game elements
	bike.height = 90 * (canvasWidth / 600);
	bike.width = bike.height * bike.currentAspectRatio;

	// Update center offsets based on new canvas size
	playerCenterOffsetX = (bike.height * playerAspectRatio) / 2;
	playerKicking1CenterOffsetX = (bike.height * playerKicking1AspectRatio) / 2;
	playerKicking2CenterOffsetX = (bike.height * playerKicking2AspectRatio) / 2;
	bike.currentCenterOffsetX =
		bike.currentImage === playerImage
			? playerCenterOffsetX
			: bike.currentImage === playerKicking1Image
			? playerKicking1CenterOffsetX
			: playerKicking2CenterOffsetX;

	// Update bike position
	bike.x = canvas.width / 2 - bike.currentCenterOffsetX;
	bike.y = canvas.height - 100;

	// Update joystick
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

// Full-screen functionality
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
			bike.x = canvas.width / 2 - bike.currentCenterOffsetX;
			bike.y = canvas.height - 100;
		}, 100);
	}
});

// Game loop
function gameLoop() {
	update();
	render();
	if (!gameOver) requestAnimationFrame(gameLoop);
}
