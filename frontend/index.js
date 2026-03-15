const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
canvas.width = 1024;
canvas.height = 576;

console.log(collisions);
const collisionsMap = [];
for (let i = 0; i < collisions.length; i+= 120){
    collisionsMap.push(collisions.slice(i, i + 120));
}

const offset = {
    x: -2370,
    y: -2600,
}

const mapWidth = 5760;  // 120 cells * 48 pixels
const mapHeight = 5760; // 120 cells * 48 pixels

class Boundary {
    static width = 48;
    static height = 48;
    constructor({position}){
        this.position = position;
        this.width = 48;
        this.height = 48;
    }
    draw(){
        context.fillStyle = "red";
        context.fillRect(this.position.x + background.position.x, this.position.y + background.position.y, this.width, this.height);
    }
}

const boundaries = [];
const paddingTiles = 10; // How many tiles of padding were added
const offsetX = 10; // Additional offset for x (move right)
const offsetY = 10; // Additional offset for y (move down, negative because of inverted y)
collisionsMap.forEach((row, i) => {
    row.forEach((symbol, j) => {
        if (symbol === 1479 || symbol === 1475){
            boundaries.push(new Boundary({
                position: {
                    x: (j - paddingTiles + offsetX) * Boundary.width, 
                    y: (i - paddingTiles + offsetY) * Boundary.height
                }
            }));
        }
    }); 
});

const image = new Image();
image.src = "./img/kajukatli-map.png";

const foregroundImage = new Image();
foregroundImage.src = "./img/kajukatli-map-foreground.png";

const playerImage = new Image();
playerImage.src = "./img/ninja.png";

class Sprite {
    constructor({position, image, crop, frames}){
        this.position = position;
        this.image = image;
        this.crop = crop;
        this.frames = {...frames, val: 0, elapsed: 0};
        this.moving = false;
    }
    
    draw(){
        if (this.crop && this.crop.width) {
            // Draw sprite from sprite sheet
            const spriteWidth = this.crop.width;
            const spriteHeight = this.crop.height;
            
            // Scale up the player
            const scale = 4;
            const drawWidth = spriteWidth * scale;
            const drawHeight = spriteHeight * scale;
            
            context.drawImage(
                this.image,
                this.crop.x + (this.frames.val * spriteWidth),  // Source X with animation offset
                this.crop.y,                                    // Source Y (row)
                spriteWidth,                                    // Source Width
                spriteHeight,                                   // Source Height
                this.position.x,                                // Destination X
                this.position.y,                                // Destination Y
                drawWidth,                                      // Destination Width (scaled up)
                drawHeight                                      // Destination Height (scaled up)
            );
            
            // Animation logic
            if (this.frames.max > 1 && this.moving) {
                this.frames.elapsed++;
                
                if (this.frames.elapsed % 10 === 0) {
                    if (this.frames.val < this.frames.max - 1) {
                        this.frames.val++;
                    } else {
                        this.frames.val = 0;
                    }
                }
            }
        } else {
            // Draw full image
            context.drawImage(this.image, this.position.x, this.position.y);
        }
    }
}


const background = new Sprite({
    position: {
        x: offset.x,
        y: offset.y
    },
    image: image,
});

const foreground = new Sprite({ 
    position: {
        x: offset.x,
        y: offset.y
    },
    image: foregroundImage,
});

const playerSprite = new Sprite({
    position: {
        x: (canvas.width - 128) / 2,
        y: (canvas.height - 128) / 2
    },
    image: playerImage,
    crop: {x: 0, y: 0, width: 32, height: 32},
    frames: {max: 4}
});

const player = {
    position: {
        x: (canvas.width - 128) / 2 + 48,
        y: (canvas.height - 128) / 2 + 48
    },
    width: 32,
    height: 64
};

const moveables = [background, foreground];
const keys = {
    w: {
        pressed: false,
    },
    a: {
        pressed: false,
    },
    s: {
        pressed: false,
    },
    d: {
        pressed: false,
    },
};

function rectangularCollision({rectangle1, rectangle2}){
    return (
        rectangle1.position.x + rectangle1.width >= rectangle2.position.x &&
        rectangle1.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.position.y + rectangle1.height >= rectangle2.position.y &&
        rectangle1.position.y <= rectangle2.position.y + rectangle2.height
    );
}

function checkCollisions(){
    let colliding = false;
    
    // Convert player screen position to world position
    const playerWorldPos = {
        x: player.position.x - background.position.x,
        y: player.position.y - background.position.y
    };
    
    boundaries.forEach(boundary => {
        if (
            playerWorldPos.x + player.width >= boundary.position.x &&
            playerWorldPos.x <= boundary.position.x + boundary.width &&
            playerWorldPos.y + player.height >= boundary.position.y &&
            playerWorldPos.y <= boundary.position.y + boundary.height
        ){
            colliding = true;
        }
    });
    
    return colliding;
}

function checkMapBounds(x, y){
    // Constrain background position to keep map visible
    const minX = -(mapWidth - canvas.width);
    const maxX = 0;
    const minY = -(mapHeight - canvas.height);
    const maxY = 0;
    
    const isValid = x >= minX && x <= maxX && y >= minY && y <= maxY;
    
    if (!isValid && !window.boundsLogged) {
        console.log('Bounds check failed:', {x, y, minX, maxX, minY, maxY});
        window.boundsLogged = true;
    }
    
    return isValid;
}

function animate(){
    window.requestAnimationFrame(animate);
    background.draw();

    boundaries.forEach(boundary => {
        boundary.draw();
    });
    
    // Set animation state and direction
    playerSprite.moving = false;
    
    if (keys.w.pressed && lastKey === "w"){
        playerSprite.crop.y = 7 * 32; // Walking up (row 8, index 7)
        playerSprite.moving = true;
    }
    else if (keys.a.pressed && lastKey === "a"){
        playerSprite.crop.y = 5 * 32; // Walking left (row 6, index 5)
        playerSprite.moving = true;
    }
    else if (keys.s.pressed && lastKey === "s"){
        playerSprite.crop.y = 4 * 32; // Walking down (row 5, index 4)
        playerSprite.moving = true;
    }
    else if (keys.d.pressed && lastKey === "d"){
        playerSprite.crop.y = 6 * 32; // Walking right (row 7, index 6)
        playerSprite.moving = true;
    }
    else {
        // Static facing down when not moving
        playerSprite.crop.y = 0;
        playerSprite.frames.val = 0;
    }
    
    playerSprite.draw();
    foreground.draw();
    
    if (keys.w.pressed && lastKey === "w"){
        const tempY = background.position.y;
        const tempForegroundY = foreground.position.y;
        background.position.y += 8;
        foreground.position.y += 8;
        if (!checkCollisions() && checkMapBounds(background.position.x, background.position.y)){
            // Keep the movement
        } else {
            background.position.y = tempY;
            foreground.position.y = tempForegroundY;
        }
    }
    else if (keys.a.pressed && lastKey === "a"){
        const tempX = background.position.x;
        const tempForegroundX = foreground.position.x;
        background.position.x += 8;
        foreground.position.x += 8;
        if (!checkCollisions() && checkMapBounds(background.position.x, background.position.y)){
            // Keep the movement
        } else {
            background.position.x = tempX;
            foreground.position.x = tempForegroundX;
        }
    }
    else if (keys.s.pressed && lastKey === "s"){
        const tempY = background.position.y;
        const tempForegroundY = foreground.position.y;
        background.position.y -= 8;
        foreground.position.y -= 8;
        if (!checkCollisions() && checkMapBounds(background.position.x, background.position.y)){
            // Keep the movement
        } else {
            background.position.y = tempY;
            foreground.position.y = tempForegroundY;
        }
    }
    else if (keys.d.pressed && lastKey === "d"){
        const tempX = background.position.x;
        const tempForegroundX = foreground.position.x;
        background.position.x -= 8;
        foreground.position.x -= 8;
        if (!checkCollisions() && checkMapBounds(background.position.x, background.position.y)){
            // Keep the movement
        } else {
            background.position.x = tempX;
            foreground.position.x = tempForegroundX;
        }
    }
}
animate();

let lastKey = " ";
window.addEventListener("keydown", (e) => {
    console.log(e.key);
    switch (e.key) {
        case "w":
            keys.w.pressed = true;
            lastKey = "w";
            break;
        case "a":
            keys.a.pressed = true;
            lastKey = "a";
            break;
        case "s":
            keys.s.pressed = true;
            lastKey = "s";
            break;  
        case "d":
            keys.d.pressed = true;
            lastKey = "d";
            break;
    }
});

window.addEventListener("keyup", (e) => {
    console.log(e.key);
    switch (e.key) {
        case "w":
            keys.w.pressed = false;
            break;
        case "a":
            keys.a.pressed = false;
            break;
        case "s":
            keys.s.pressed = false;
            break;
        case "d":
            keys.d.pressed = false;
            break;
    }
});
