const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set initial canvas dimensions
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

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
playerImage.src = "player.png"; // Path to the bike image

const carImage = new Image();
carImage.src = "car.png"; // Path to the car image

// Bike properties
const bike = {
  x: canvas.width / 2 - 25, // Centered horizontally
  y: canvas.height - 100, // Positioned near the bottom
  width: 50 * (canvasWidth / 600), // Scale width based on canvas size
  height: 90 * (canvasWidth / 600), // Scale height based on width to maintain aspect ratio
  speed: 5,
  velocityX: 0,
  velocityY: 0,
};

// Obstacle properties
const obstacles = [];
const obstacleWidth = 60 * (canvasWidth / 600); // Scale width based on canvas size
const obstacleHeight = 120 * (canvasWidth / 600); // Scale height based on width to maintain aspect ratio
let obstacleSpeed = 3;
let obstacleSpawnRate = 200; // Frames between obstacles
let frameCount = 0;
let gameOver = false;

// Joystick properties
const joystick = {
  x: canvas.width - 150 * (canvasWidth / 600), // Scale position based on canvas size
  y: canvas.height - 150 * (canvasWidth / 600), // Scale position based on canvas size
  radius: 50 * (canvasWidth / 600), // Scale radius based on canvas size
  knob: {
    x: canvas.width - 150 * (canvasWidth / 600), // Scale position based on canvas size
    y: canvas.height - 150 * (canvasWidth / 600), // Scale position based on canvas size
    radius: 20 * (canvasWidth / 600), // Scale radius based on canvas size
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

// Update game state
function update() {
  if (gameOver) return;

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
      continue; // Skip collision check for removed obstacles
    }

    // Check for collisions
    if (
      bike.x < obstacles[i].x + obstacles[i].width &&
      bike.x + bike.width > obstacles[i].x &&
      bike.y < obstacles[i].y + obstacles[i].height &&
      bike.y + bike.height > obstacles[i].y
    ) {
      gameOver = true;
      document.getElementById("restartButton").style.display = "block";
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

  // Draw bike
  ctx.drawImage(playerImage, bike.x, bike.y, bike.width, bike.height);

  // Draw obstacles
  for (const obstacle of obstacles) {
    ctx.drawImage(carImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  }

  // Draw joystick
  ctx.beginPath();
  ctx.arc(joystick.x, joystick.y, joystick.radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.arc(joystick.knob.x, joystick.knob.y, joystick.knob.radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fill();
  ctx.closePath();
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
    carImage.onload = resolve;
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
    const aspectRatio = 600 / 800; // Original aspect ratio of the game
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
  bike.height = 90 * (canvasWidth / 600); // Maintain aspect ratio based on width
  bike.x = canvas.width / 2 - 25;
  bike.y = canvas.height - 100;

  obstacleWidth = 60 * (canvasWidth / 600);
  obstacleHeight = 120 * (canvasWidth / 600); // Maintain aspect ratio based on width

  joystick.x = canvas.width - 100 * (canvasWidth / 600);
  joystick.y = canvas.height - 100 * (canvasWidth / 600);
  joystick.radius = 50 * (canvasWidth / 600);
  joystick.knob.x = joystick.x;
  joystick.knob.y = joystick.y;
  joystick.knob.radius = 20 * (canvasWidth / 600);
});

// Event listeners for buttons
document.getElementById("playButton").addEventListener("click", () => {
  document.getElementById("playButton").style.display = "none";
  document.getElementById("restartButton").style.display = "none"; // Hide restart button if visible
  gameOver = false; // Reset game over state
  obstacles.length = 0; // Clear obstacles
  frameCount = 0; // Reset frame count
  bike.x = canvas.width / 2 - 25; // Reset bike position
  bike.y = canvas.height - 100;
  gameLoop(); // Start the game loop
});

document.getElementById("restartButton").addEventListener("click", () => {
  document.location.reload();
});