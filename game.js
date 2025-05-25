import Phaser from 'phaser';

console.log('Phaser version:', Phaser.VERSION);

class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create() {
        // Add title text
        const title = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            'ZOMBIE SURVIVAL',
            {
                fontSize: '64px',
                fill: '#ff0000',
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5);

        // Add start text
        const startText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 50,
            'Click or Press ENTER/SPACE to Start',
            {
                fontSize: '32px',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);

        // Add pulsing effect to start text
        this.tweens.add({
            targets: startText,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Add click/tap handler
        this.input.on('pointerdown', () => {
            this.startGame();
        });

        // Add keyboard handlers
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.enterKey) || 
            Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.startGame();
        }
    }

    startGame() {
        this.scene.start('CountdownScene');
    }
}

class CountdownScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CountdownScene' });
    }

    create() {
        // Create countdown text
        this.countdownText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            '3',
            {
                fontSize: '128px',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            }
        ).setOrigin(0.5);

        // Start countdown
        this.countdown = 3;
        this.time.addEvent({
            delay: 1000,
            callback: this.updateCountdown,
            callbackScope: this,
            repeat: 2
        });
    }

    updateCountdown() {
        this.countdown--;
        if (this.countdown > 0) {
            this.countdownText.setText(this.countdown.toString());
        } else {
            this.countdownText.setText('GO!');
            this.time.delayedCall(1000, () => {
                this.scene.start('MainScene');
            });
        }
    }
}

class Zombie extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'zombie');
        this.scene = scene;
        this.speed = 50; // Base speed
        this.attractionRange = 320; // 10 tiles * 32 pixels
    }

    update() {
        if (!this.active) return;

        const player = this.scene.player;
        const distance = Phaser.Math.Distance.Between(
            this.x, this.y,
            player.x, player.y
        );

        // Calculate attraction strength based on distance
        let attractionStrength = 1;
        if (distance > this.attractionRange) {
            // Beyond 10 tiles, attraction decreases with distance
            attractionStrength = this.attractionRange / distance;
        }

        // Calculate direction to player
        const angle = Phaser.Math.Angle.Between(
            this.x, this.y,
            player.x, player.y
        );

        // Set velocity based on attraction strength
        this.scene.physics.velocityFromRotation(
            angle,
            this.speed * attractionStrength,
            this.body.velocity
        );
    }
}

class Ally extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'ally');
        this.scene = scene;
        this.speed = 150; // Slightly slower than player
        this.lastShot = 0;
        this.shotCooldown = 1000; // Shoot every second
    }

    update() {
        if (!this.active) return;

        const player = this.scene.player;
        
        // Follow player at a distance
        const distance = Phaser.Math.Distance.Between(
            this.x, this.y,
            player.x, player.y
        );

        // Keep a minimum distance from player
        const minDistance = 64; // 2 tiles
        if (distance > minDistance) {
            const angle = Phaser.Math.Angle.Between(
                this.x, this.y,
                player.x, player.y
            );
            
            this.scene.physics.velocityFromRotation(
                angle,
                this.speed,
                this.body.velocity
            );
        } else {
            this.setVelocity(0);
        }

        // Shoot in the same direction as player
        const time = this.scene.time.now;
        if (time > this.lastShot + this.shotCooldown) {
            this.lastShot = time;
            this.shoot();
        }
    }

    shoot() {
        const bolt = this.scene.healingBolts.get();
        if (!bolt) return;

        bolt.setPosition(this.x, this.y);
        bolt.setActive(true);
        bolt.setVisible(true);
        bolt.setAlpha(1);
        bolt.power = 1;

        // Get player's movement direction or default to up
        let angle = -90;
        if (this.scene.player.body.velocity.x !== 0 || this.scene.player.body.velocity.y !== 0) {
            angle = Phaser.Math.RadToDeg(
                Math.atan2(this.scene.player.body.velocity.y, this.scene.player.body.velocity.x)
            );
        }

        const speed = 400;
        this.scene.physics.velocityFromRotation(
            Phaser.Math.DegToRad(angle),
            speed,
            bolt.body.velocity
        );

        bolt.initialX = bolt.x;
        bolt.initialY = bolt.y;
        bolt.updateCallback = this.scene.updateBoltPower.bind(this.scene, bolt);
        this.scene.events.on('update', bolt.updateCallback);
    }
}

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        console.log('Preload started');
        
        // Add loading error handler
        this.load.on('loaderror', (file) => {
            console.error('Error loading file:', file.src);
        });

        // Add file complete handler
        this.load.on('filecomplete', (key) => {
            console.log('Successfully loaded:', key);
        });

        // Load player asset
        this.load.image('player', './assets/phaser-dude.png');
        
        // Load death sound
        this.load.audio('death', './assets/sad-trombone.wav');
    }

    create() {
        console.log('Create started');
        
        // Check if player asset loaded successfully
        if (!this.textures.exists('player')) {
            console.error('Required player asset not loaded');
            return;
        }

        // Create zombie texture
        const zombieGraphics = this.make.graphics();
        zombieGraphics.fillStyle(0x00ff00); // Green color for zombie
        zombieGraphics.fillCircle(8, 8, 8); // Circle for zombie body
        zombieGraphics.lineStyle(2, 0x008800); // Darker green outline
        zombieGraphics.strokeCircle(8, 8, 8);
        zombieGraphics.generateTexture('zombie', 16, 16);

        // Create healing bolt texture
        const boltGraphics = this.make.graphics();
        boltGraphics.fillStyle(0x00ff00); // Green color for healing
        boltGraphics.fillCircle(4, 4, 4); // Small circle
        boltGraphics.lineStyle(1, 0x00cc00); // Darker green outline
        boltGraphics.strokeCircle(4, 4, 4);
        boltGraphics.generateTexture('healing-bolt', 8, 8);

        // Create healing bolt group
        this.healingBolts = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            defaultKey: 'healing-bolt',
            maxSize: 10
        });

        // Create zombie group
        this.zombies = this.physics.add.group({
            classType: Zombie,
            maxSize: 10
        });

        // Create ally texture
        const allyGraphics = this.make.graphics();
        allyGraphics.fillStyle(0x4169e1); // Blue color for ally
        allyGraphics.fillCircle(8, 8, 8); // Circle for ally body
        allyGraphics.lineStyle(2, 0x1e90ff); // Darker blue outline
        allyGraphics.strokeCircle(8, 8, 8);
        allyGraphics.generateTexture('ally', 16, 16);

        // Create ally group
        this.allies = this.physics.add.group({
            classType: Ally,
            maxSize: 20 // Allow for more allies than initial zombies
        });

        // Calculate map size based on screen size with extra padding
        const tileSize = 32;
        const padding = 50; // Increased padding for larger world
        const minMapWidth = 200; // Minimum map width in tiles
        const minMapHeight = 200; // Minimum map height in tiles
        const mapWidth = Math.max(minMapWidth, Math.ceil(this.cameras.main.width / tileSize) + (padding * 2));
        const mapHeight = Math.max(minMapHeight, Math.ceil(this.cameras.main.height / tileSize) + (padding * 2));

        // Create a simple tilemap
        const map = this.make.tilemap({
            tileWidth: tileSize,
            tileHeight: tileSize,
            width: mapWidth,
            height: mapHeight
        });

        // Create ground tile
        const groundGraphics = this.make.graphics();
        groundGraphics.fillStyle(0x4a4a4a); // Dark gray base
        groundGraphics.fillRect(0, 0, tileSize, tileSize);
        groundGraphics.lineStyle(1, 0x666666); // Lighter gray for grid
        groundGraphics.strokeRect(0, 0, tileSize, tileSize);
        groundGraphics.fillStyle(0x555555); // Slightly lighter gray for texture
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if ((i + j) % 2 === 0) {
                    groundGraphics.fillRect(i * 8, j * 8, 8, 8);
                }
            }
        }
        groundGraphics.generateTexture('ground', tileSize, tileSize);

        // Create beach tile
        const beachGraphics = this.make.graphics();
        beachGraphics.fillStyle(0xf2d2a9); // Sand color
        beachGraphics.fillRect(0, 0, tileSize, tileSize);
        beachGraphics.lineStyle(1, 0xe6c39a); // Darker sand for grid
        beachGraphics.strokeRect(0, 0, tileSize, tileSize);
        beachGraphics.fillStyle(0xffe4c4); // Lighter sand for texture
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if ((i + j) % 2 === 0) {
                    beachGraphics.fillRect(i * 8, j * 8, 8, 8);
                }
            }
        }
        beachGraphics.generateTexture('beach', tileSize, tileSize);

        // Create ocean tile
        const oceanGraphics = this.make.graphics();
        oceanGraphics.fillStyle(0x1e90ff); // Ocean blue
        oceanGraphics.fillRect(0, 0, tileSize, tileSize);
        oceanGraphics.lineStyle(1, 0x187bcd); // Darker blue for grid
        oceanGraphics.strokeRect(0, 0, tileSize, tileSize);
        oceanGraphics.fillStyle(0x4169e1); // Lighter blue for texture
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if ((i + j) % 2 === 0) {
                    oceanGraphics.fillRect(i * 8, j * 8, 8, 8);
                }
            }
        }
        oceanGraphics.generateTexture('ocean', tileSize, tileSize);

        // Add tilesets
        const groundTileset = map.addTilesetImage('ground');
        const beachTileset = map.addTilesetImage('beach');
        const oceanTileset = map.addTilesetImage('ocean');

        if (!groundTileset || !beachTileset || !oceanTileset) {
            console.error('Failed to create tilesets');
            return;
        }

        // Create layers
        const oceanLayer = map.createBlankLayer('ocean', oceanTileset);
        const beachLayer = map.createBlankLayer('beach', beachTileset);
        const groundLayer = map.createBlankLayer('ground', groundTileset);

        if (!oceanLayer || !beachLayer || !groundLayer) {
            console.error('Failed to create layers');
            return;
        }

        // Calculate the playable area boundaries
        const playableStartX = padding;
        const playableEndX = mapWidth - padding;
        const playableStartY = padding;
        const playableEndY = mapHeight - padding;

        // Fill the map with tiles
        for (let x = 0; x < mapWidth; x++) {
            for (let y = 0; y < mapHeight; y++) {
                // Ocean edges
                if (x < playableStartX + 2 || x > playableEndX - 3 || 
                    y < playableStartY + 2 || y > playableEndY - 3) {
                    oceanLayer.putTileAt(0, x, y);
                }
                // Beach
                else if (x === playableStartX + 2 || x === playableEndX - 3 || 
                         y === playableStartY + 2 || y === playableEndY - 3) {
                    beachLayer.putTileAt(0, x, y);
                }
                // Ground
                else {
                    groundLayer.putTileAt(0, x, y);
                }
            }
        }

        // Set collision on ocean and beach tiles
        oceanLayer.setCollisionByExclusion([-1]);
        beachLayer.setCollisionByExclusion([-1]);

        // Create player at the center of the playable area
        const centerX = Math.floor((playableStartX + playableEndX) / 2) * tileSize;
        const centerY = Math.floor((playableStartY + playableEndY) / 2) * tileSize;
        this.player = this.physics.add.sprite(centerX, centerY, 'player');
        if (!this.player) {
            console.error('Failed to create player sprite');
            return;
        }

        // Spawn zombies
        for (let i = 0; i < 10; i++) {
            // Find a random position on the ground
            let x, y;
            do {
                x = Phaser.Math.Between(playableStartX + 3, playableEndX - 4) * tileSize;
                y = Phaser.Math.Between(playableStartY + 3, playableEndY - 4) * tileSize;
            } while (Phaser.Math.Distance.Between(x, y, centerX, centerY) < 200); // Keep zombies away from player spawn

            const zombie = this.zombies.get(x, y, 'zombie');
            if (zombie) {
                zombie.setActive(true);
                zombie.setVisible(true);
            }
        }

        // Set up collisions
        this.physics.add.collider(this.player, oceanLayer);
        this.physics.add.collider(this.player, beachLayer);
        this.physics.add.collider(this.healingBolts, oceanLayer, this.destroyBolt, null, this);
        this.physics.add.collider(this.healingBolts, beachLayer, this.destroyBolt, null, this);
        this.physics.add.collider(this.zombies, oceanLayer);
        this.physics.add.collider(this.zombies, beachLayer);
        this.physics.add.collider(this.zombies, this.zombies);
        this.physics.add.collider(this.allies, oceanLayer);
        this.physics.add.collider(this.allies, beachLayer);
        this.physics.add.collider(this.allies, this.allies);
        this.physics.add.overlap(this.player, this.zombies, this.playerDeath, null, this);
        this.physics.add.overlap(this.healingBolts, this.zombies, this.healZombie, null, this);
        this.physics.add.collider(this.player, this.allies, this.handleAllyCollision, null, this);

        // Set up camera to follow player
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setFollowOffset(0, -100); // Position camera above and behind player

        // Set camera bounds to prevent seeing the edge of the map
        this.cameras.main.setBounds(
            padding * tileSize,
            padding * tileSize,
            (mapWidth - padding * 2) * tileSize,
            (mapHeight - padding * 2) * tileSize
        );

        // Set up input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Add shooting cooldown
        this.lastShot = 0;
        this.shotCooldown = 500; // 500ms between shots
        
        // Create death sound
        this.deathSound = this.sound.add('death', {
            volume: 0.5
        });
        
        console.log('Create completed');
    }

    shootBolt() {
        const time = this.time.now;
        if (time < this.lastShot + this.shotCooldown) return;
        
        this.lastShot = time;

        // Get the bolt from the pool
        const bolt = this.healingBolts.get();
        if (!bolt) return;

        // Set bolt position to player position
        bolt.setPosition(this.player.x, this.player.y);
        bolt.setActive(true);
        bolt.setVisible(true);
        bolt.setAlpha(1); // Reset alpha
        bolt.power = 1; // Set initial power

        // Calculate direction based on player's movement or default to up
        let angle = -90; // Default to shooting up
        if (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0) {
            angle = Phaser.Math.RadToDeg(
                Math.atan2(this.player.body.velocity.y, this.player.body.velocity.x)
            );
        }

        // Set bolt velocity
        const speed = 400;
        this.physics.velocityFromRotation(
            Phaser.Math.DegToRad(angle),
            speed,
            bolt.body.velocity
        );

        // Store initial position for distance calculation
        bolt.initialX = bolt.x;
        bolt.initialY = bolt.y;

        // Add update callback for power fade
        bolt.updateCallback = this.updateBoltPower.bind(this, bolt);
        this.events.on('update', bolt.updateCallback);
    }

    updateBoltPower(bolt) {
        if (!bolt.active) return;

        // Calculate distance traveled
        const distance = Phaser.Math.Distance.Between(
            bolt.initialX,
            bolt.initialY,
            bolt.x,
            bolt.y
        );

        // Calculate power based on distance (20 tiles = 640 pixels)
        const maxDistance = 640; // 20 tiles * 32 pixels
        const power = Math.max(0, 1 - (distance / maxDistance));
        
        // Update bolt properties
        bolt.power = power;
        bolt.setAlpha(power);

        // If power is 0, destroy the bolt
        if (power <= 0) {
            this.destroyBolt(bolt);
        }
    }

    destroyBolt(bolt) {
        if (bolt.updateCallback) {
            this.events.off('update', bolt.updateCallback);
            bolt.updateCallback = null;
        }
        bolt.setActive(false);
        bolt.setVisible(false);
    }

    playerDeath(player, zombie) {
        // Play death sound
        this.sound.play('death', {
            volume: 0.5,
            rate: 0.5 // Slow down the sound for a sadder effect
        });
        
        // Disable player movement and physics
        player.setVelocity(0);
        player.body.enable = false;
        
        // Create death effect
        const deathEffect = this.add.graphics();
        deathEffect.fillStyle(0xff0000, 0.5);
        deathEffect.fillCircle(player.x, player.y, 32);
        
        // Fade out the player
        this.tweens.add({
            targets: player,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                // Show game over text
                const gameOverText = this.add.text(
                    this.cameras.main.centerX,
                    this.cameras.main.centerY,
                    'GAME OVER',
                    {
                        fontSize: '64px',
                        fill: '#ff0000',
                        stroke: '#000000',
                        strokeThickness: 6
                    }
                ).setOrigin(0.5);

                // Add restart text
                const restartText = this.add.text(
                    this.cameras.main.centerX,
                    this.cameras.main.centerY + 80,
                    'Press R to Restart',
                    {
                        fontSize: '32px',
                        fill: '#ffffff',
                        stroke: '#000000',
                        strokeThickness: 4
                    }
                ).setOrigin(0.5);

                // Add restart key
                this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
            }
        });

        // Stop all zombies
        this.zombies.getChildren().forEach(zombie => {
            if (zombie.active) {
                zombie.setVelocity(0);
            }
        });

        // Disable shooting
        this.spaceKey.enabled = false;
    }

    healZombie(bolt, zombie) {
        // Convert zombie to ally
        const ally = this.allies.get(zombie.x, zombie.y, 'ally');
        if (ally) {
            ally.setActive(true);
            ally.setVisible(true);
            zombie.setActive(false);
            zombie.setVisible(false);
            zombie.body.enable = false; // Prevent further collision with player
        }
        
        // Destroy the bolt
        this.destroyBolt(bolt);
    }

    handleAllyCollision(player, ally) {
        // Prevent the ally from pushing the player
        ally.setVelocity(0);
    }

    update() {
        if (!this.player) return;

        // Check for restart
        if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
            this.scene.restart();
            return;
        }

        // If player is dead, don't process movement or shooting
        if (!this.player.body.enable) return;

        // Handle player movement
        const speed = 200;
        
        // Reset velocity
        this.player.setVelocity(0);

        // Handle movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
        }

        // Normalize diagonal movement
        if (this.player.body.velocity.x !== 0 && this.player.body.velocity.y !== 0) {
            this.player.body.velocity.normalize().scale(speed);
        }

        // Handle shooting
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.shootBolt();
        }

        // Update zombies
        this.zombies.getChildren().forEach(zombie => {
            if (zombie.active) {
                zombie.update();
            }
        });
    }
}

// Get the window size
const getWindowSize = () => {
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
};

// Create the game configuration
const createConfig = () => {
    const size = getWindowSize();
    return {
        type: Phaser.AUTO,
        width: size.width,
        height: size.height,
        parent: 'game',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        scene: [StartScene, CountdownScene, MainScene]
    };
};

// Create and start the game
console.log('Creating game instance');
const game = new Phaser.Game(createConfig());

// Handle window resize
window.addEventListener('resize', () => {
    const size = getWindowSize();
    game.scale.resize(size.width, size.height);
}); 