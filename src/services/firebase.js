const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let initialized = false;

function init() {
  if (initialized) return admin;

  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_SERVICE_ACCOUNT.trim().length > 10) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(parsed);
    } catch (err) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not valid JSON');
    }
  } else {
    const localPath = path.join(process.cwd(), 'serviceAccount.json');
    if (!fs.existsSync(localPath)) {
      throw new Error(
        'Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT env or place serviceAccount.json in project root.'
      );
    }
    credential = admin.credential.cert(require(localPath));
  }

  admin.initializeApp({
    credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  initialized = true;
  return admin;
}

function db() {
  return init().firestore();
}

function bucket() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('FIREBASE_STORAGE_BUCKET env var is required for Storage operations');
  }
  return init().storage().bucket();
}

module.exports = { init, db, bucket, admin };
