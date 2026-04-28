import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { config } from '../config';

let initialized = false;

export function initFirebase(): admin.app.App {
  if (initialized) return admin.app();

  let credential: admin.credential.Credential;

  if (fs.existsSync(config.serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(config.serviceAccountPath, 'utf8'));
    credential = admin.credential.cert(serviceAccount);
    console.log('[firebase] Initialized with service account');
  } else {
    console.warn('[firebase] service-account.json not found, using Application Default Credentials');
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({
    credential,
    projectId: config.firebaseProjectId,
  });

  initialized = true;
  return admin.app();
}

export function getDb(): admin.firestore.Firestore {
  return admin.firestore();
}

export function getTimestamp(ms?: number): admin.firestore.Timestamp {
  return ms
    ? admin.firestore.Timestamp.fromMillis(ms)
    : admin.firestore.Timestamp.now();
}

export { admin };
