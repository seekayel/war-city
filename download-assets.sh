#!/bin/bash

# Create assets directory if it doesn't exist
mkdir -p public/assets

# Download assets
curl -o public/assets/phaser-dude.png https://labs.phaser.io/assets/sprites/phaser-dude.png
curl -o public/assets/dungeon-16-16.png https://labs.phaser.io/assets/tilemaps/tiles/dungeon-16-16.png 