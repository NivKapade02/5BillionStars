// Public Firebase web configuration. Authorization is enforced by firestore.rules.
export const ADMIN_UID = 'paQi4R2liKhkGCch2RbDNCDSXuA3';
export const firebaseConfig = {
  apiKey: 'AIzaSyCVrFffvSZe1Y9nlBb37p5SK3pQi_Xa2gw',
  authDomain: 'billionstars-5077e.firebaseapp.com',
  projectId: 'billionstars-5077e',
  storageBucket: 'billionstars-5077e.firebasestorage.app',
  messagingSenderId: '726885378642',
  appId: '1:726885378642:web:8637164c6d9bc19fd2cd8b',
  measurementId: 'G-WKW01PSR3Z'
};

async function initialize() {
  const [appSdk, authSdk, firestoreSdk] = await Promise.all([
    import('firebase/app'), import('firebase/auth'), import('firebase/firestore')
  ]);
  const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(firebaseConfig);
  return { auth: authSdk.getAuth(app), db: firestoreSdk.getFirestore(app), authSdk, firestoreSdk };
}
let client: ReturnType<typeof initialize> | undefined;
export function getFirebase() {
  return client ??= initialize().catch(error => { client = undefined; throw error; });
}
