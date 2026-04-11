const { bucket } = require('./firebase');

async function uploadSlide(carouselId, slideIndex, buffer, contentType = 'image/png') {
  const b = bucket();
  const filename = `slides/${carouselId}/${String(slideIndex).padStart(2, '0')}.png`;
  const file = b.file(filename);

  await file.save(buffer, {
    metadata: { contentType, cacheControl: 'public, max-age=31536000' },
    resumable: false,
  });

  await file.makePublic();

  return `https://storage.googleapis.com/${b.name}/${filename}`;
}

async function uploadCarouselSlides(carouselId, renderedSlides) {
  const urls = [];
  for (const { index, buffer } of renderedSlides) {
    const url = await uploadSlide(carouselId, index, buffer);
    urls.push({ index, url });
  }
  return urls.sort((a, b) => a.index - b.index);
}

module.exports = { uploadSlide, uploadCarouselSlides };
