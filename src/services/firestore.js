const { db, admin } = require('./firebase');

const CAROUSELS = 'carousels';
const CONTENT_INPUTS = 'content_inputs';
const PUBLISH_QUEUE = 'publish_queue';

async function createCarousel(data) {
  const ref = db().collection(CAROUSELS).doc();
  const payload = {
    ...data,
    status: data.status || 'draft',
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(payload);
  return { id: ref.id, ...payload };
}

async function updateCarousel(id, patch) {
  const ref = db().collection(CAROUSELS).doc(id);
  await ref.update({
    ...patch,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return { id, ...doc.data() };
}

async function getCarousel(id) {
  const doc = await db().collection(CAROUSELS).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function listCarousels({ status, limit = 50 } = {}) {
  let q = db().collection(CAROUSELS).orderBy('created_at', 'desc').limit(limit);
  if (status) q = q.where('status', '==', status);
  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveContentInput(data) {
  const ref = db().collection(CONTENT_INPUTS).doc();
  const payload = {
    ...data,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(payload);
  return { id: ref.id, ...payload };
}

async function addToQueue(carouselId, scheduledAt) {
  const ref = db().collection(PUBLISH_QUEUE).doc();
  const payload = {
    carousel_id: carouselId,
    scheduled_at: admin.firestore.Timestamp.fromDate(new Date(scheduledAt)),
    status: 'pending',
    attempts: 0,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(payload);
  return { id: ref.id, ...payload };
}

module.exports = {
  createCarousel,
  updateCarousel,
  getCarousel,
  listCarousels,
  saveContentInput,
  addToQueue,
};
