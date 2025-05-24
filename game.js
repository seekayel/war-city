import Phaser from 'phaser';

console.log('Phaser version:', Phaser.VERSION);

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
    }

    create() {
        console.log('Create started');
        
        // Check if player asset loaded successfully
        if (!this.textures.exists('player')) {
            console.error('Required player asset not loaded');
            return;
        }

        // Create a simple tilemap
        const map = this.make.tilemap({
            tileWidth: 32,
            tileHeight: 32,
            width: 50,
            height: 50
        });

        // Create ground tile
        const groundGraphics = this.make.graphics();
        groundGraphics.fillStyle(0x4a4a4a); // Dark gray base
        groundGraphics.fillRect(0, 0, 32, 32);
        groundGraphics.lineStyle(1, 0x666666); // Lighter gray for grid
        groundGraphics.strokeRect(0, 0, 32, 32);
        groundGraphics.fillStyle(0x555555); // Slightly lighter gray for texture
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if ((i + j) % 2 === 0) {
                    groundGraphics.fillRect(i * 8, j * 8, 8, 8);
                }
            }
        }
        groundGraphics.generateTexture('ground', 32, 32);

        // Create beach tile
        const beachGraphics = this.make.graphics();
        beachGraphics.fillStyle(0xf2d2a9); // Sand color
        beachGraphics.fillRect(0, 0, 32, 32);
        beachGraphics.lineStyle(1, 0xe6c39a); // Darker sand for grid
        beachGraphics.strokeRect(0, 0, 32, 32);
        beachGraphics.fillStyle(0xffe4c4); // Lighter sand for texture
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if ((i + j) % 2 === 0) {
                    beachGraphics.fillRect(i * 8, j * 8, 8, 8);
                }
            }
        }
        beachGraphics.generateTexture('beach', 32, 32);

        // Create ocean tile
        const oceanGraphics = this.make.graphics();
        oceanGraphics.fillStyle(0x1e90ff); // Ocean blue
        oceanGraphics.fillRect(0, 0, 32, 32);
        oceanGraphics.lineStyle(1, 0x187bcd); // Darker blue for grid
        oceanGraphics.strokeRect(0, 0, 32, 32);
        oceanGraphics.fillStyle(0x4169e1); // Lighter blue for texture
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if ((i + j) % 2 === 0) {
                    oceanGraphics.fillRect(i * 8, j * 8, 8, 8);
                }
            }
        }
        oceanGraphics.generateTexture('ocean', 32, 32);

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

        // Fill the map with tiles
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                // Ocean edges
                if (x < 2 || x > 47 || y < 2 || y > 47) {
                    oceanLayer.putTileAt(0, x, y);
                }
                // Beach
                else if (x === 2 || x === 47 || y === 2 || y === 47) {
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

        // Create player
        this.player = this.physics.add.sprite(400, 300, 'player');
        if (!this.player) {
            console.error('Failed to create player sprite');
            return;
        }

        // Set up collisions
        this.physics.add.collider(this.player, oceanLayer);
        this.physics.add.collider(this.player, beachLayer);

        // Set up camera to follow player
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setFollowOffset(0, -100); // Position camera above and behind player

        // Set up cursor keys
        this.cursors = this.input.keyboard.createCursorKeys();
        
        console.log('Create completed');
    }

    update() {
        if (!this.player) return;

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
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: MainScene
};

console.log('Creating game instance');
const game = new Phaser.Game(config); 