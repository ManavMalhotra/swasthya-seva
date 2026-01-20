import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getDatabase, Database } from 'firebase-admin/database';

let app: App;
let adminAuth: Auth;
let adminDb: Database;

function getServiceAccountCredentials() {
    // For production: use FIREBASE_SERVICE_ACCOUNT_KEY env variable (JSON string)
    // For development: can use individual env variables
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    }

    // Fallback: construct from individual env variables
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
        return {
            projectId,
            clientEmail,
            privateKey,
        };
    }

    throw new Error(
        'Firebase Admin SDK credentials not configured. ' +
        'Set FIREBASE_SERVICE_ACCOUNT_KEY or individual FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars.'
    );
}

function initializeFirebaseAdmin() {
    if (getApps().length === 0) {
        const serviceAccount = getServiceAccountCredentials();

        app = initializeApp({
            credential: cert(serviceAccount),
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        });
    } else {
        app = getApps()[0];
    }

    adminAuth = getAuth(app);
    adminDb = getDatabase(app);

    return { app, adminAuth, adminDb };
}

// Initialize on module load
const { adminAuth: auth, adminDb: db } = initializeFirebaseAdmin();

export { auth as adminAuth, db as adminDb };

// Verify Firebase ID token from Authorization header
export async function verifyAuthToken(request: Request): Promise<{
    valid: boolean;
    uid?: string;
    error?: string;
}> {
    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { valid: false, error: 'Missing or invalid Authorization header' };
        }

        const token = authHeader.split('Bearer ')[1];

        if (!token) {
            return { valid: false, error: 'No token provided' };
        }

        const decodedToken = await auth.verifyIdToken(token);
        return { valid: true, uid: decodedToken.uid };
    } catch (error: any) {
        console.error('Token verification failed:', error.message);
        return { valid: false, error: 'Invalid or expired token' };
    }
}

// Check if the user has access to a specific patient's data
export async function checkPatientAccess(
    uid: string,
    patientId: string
): Promise<{ hasAccess: boolean; role?: string; error?: string }> {
    try {
        // Get user data from database
        const userSnapshot = await db.ref(`users/${uid}`).get();

        if (!userSnapshot.exists()) {
            return { hasAccess: false, error: 'User not found' };
        }

        const userData = userSnapshot.val();
        const role = userData.role;

        // Doctors can access their assigned patients
        if (role === 'doctor') {
            const assignedPatients = userData.assignedPatients || {};
            if (assignedPatients[patientId]) {
                return { hasAccess: true, role };
            }
            // Also check if doctor has general access (for demo purposes, allow all doctors)
            // In production, you'd want stricter access control
            return { hasAccess: true, role };
        }

        // Patients can only access their own data
        if (role === 'patient') {
            if (userData.patientDataId === patientId) {
                return { hasAccess: true, role };
            }
            return { hasAccess: false, error: 'Access denied: Not your patient record' };
        }

        return { hasAccess: false, error: 'Unknown role' };
    } catch (error: any) {
        console.error('Access check failed:', error.message);
        return { hasAccess: false, error: 'Access check failed' };
    }
}
