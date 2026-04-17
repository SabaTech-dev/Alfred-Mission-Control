const sharp = require('sharp');

async function resizeLogo() {
  try {
    await sharp('logo-small.png')
      .resize(64, 64, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFile('logo-small-64.png');

    console.log('Logo resized successfully to 64x64');
  } catch (error) {
    console.error('Error resizing logo:', error);
    process.exit(1);
  }
}

resizeLogo();
