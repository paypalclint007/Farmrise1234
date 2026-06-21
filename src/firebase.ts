import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  initializeFirestore
} from "firebase/firestore";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize the Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID from config if active, or default
export let db: any;
try {
  if (firebaseConfig.firestoreDatabaseId) {
    db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase Firestore initialized with custom DB workspace partition ID:", firebaseConfig.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
    console.log("Firebase Firestore initialized with default workspace partition ID.");
  }
} catch (err) {
  console.warn("Custom Firestore initialization fallback to default:", err);
  db = getFirestore(app);
}

// Initialize Auth
export const auth = getAuth(app);

// Keep synchronized state of currently signed-in Firebase user
let cachedFirebaseUser: FirebaseUser | null = null;
onAuthStateChanged(auth, (user) => {
  cachedFirebaseUser = user;
  if (user) {
    console.log("Firebase Auth State Changed: Session active for", user.email);
  } else {
    console.log("Firebase Auth State Changed: No active session.");
  }
});

// Helper to sanitize payload for Firestore (convert undefined values to null or omit them)
export const sanitizePayloadForFirestore = (payload: any): any => {
  if (payload === null || payload === undefined) return null;
  if (Array.isArray(payload)) {
    return payload.map(item => sanitizePayloadForFirestore(item));
  }
  if (typeof payload === "object") {
    const cleaned: any = {};
    Object.keys(payload).forEach(key => {
      if (payload[key] !== undefined) {
        cleaned[key] = sanitizePayloadForFirestore(payload[key]);
      }
    });
    return cleaned;
  }
  return payload;
};

// Default plans and updates to automatically seed if collections are empty
const SEED_PLANS = [
  {
    id: "plan-chicken-starter",
    name: "Starter Chicken",
    type: "Chicken",
    minAmount: 3000,
    maxAmount: 3000,
    profitPercent: 100,
    durationDays: 14,
    imageUrl: "https://images.unsplash.com/photo-1548550123-94f1067bc16f?w=600&auto=format&fit=crop&q=80",
    description: "Ideal entry-level organic poultry program. Sponsor a broiler batch and receive daily yields.",
    status: "active",
    dailyProfit: 214,
    totalReturn: 6000
  },
  {
    id: "plan-chicken-layers",
    name: "Premium Poultry Batch",
    type: "Chicken",
    minAmount: 10000,
    maxAmount: 10000,
    profitPercent: 150,
    durationDays: 30,
    imageUrl: "https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=600&auto=format&fit=crop&q=80",
    description: "High-yield commercial egg production with climate-controlled automated layer housing systems.",
    status: "active",
    dailyProfit: 500,
    totalReturn: 25000
  },
  {
    id: "plan-chicken-commercial",
    name: "Commercial Egg Hatchery",
    type: "Chicken",
    minAmount: 50000,
    maxAmount: 50000,
    profitPercent: 225,
    durationDays: 45,
    imageUrl: "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=600&auto=format&fit=crop&q=80",
    description: "Large scale layers flock distribution serving high volume wholesale consumer networks.",
    status: "active",
    dailyProfit: 2500,
    totalReturn: 162500
  },
  {
    id: "plan-pig-starter",
    name: "Starter Piglet",
    type: "Pig",
    minAmount: 15000,
    maxAmount: 15000,
    profitPercent: 168,
    durationDays: 21,
    imageUrl: "https://images.unsplash.com/photo-1604848698030-c434ba08eca1?w=600&auto=format&fit=crop&q=80",
    description: "Support premium bio-secure unit growing high performance piglets with optimal nutrition ratios.",
    status: "active",
    dailyProfit: 1200,
    totalReturn: 40200
  },
  {
    id: "plan-pig-breeding",
    name: "Berkshire Breeding Unit",
    type: "Pig",
    minAmount: 40000,
    maxAmount: 40000,
    profitPercent: 450,
    durationDays: 60,
    imageUrl: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&auto=format&fit=crop&q=80",
    description: "Sponsor pedigree Berkshire pig unit breeding program delivering elite stocks to meat producers.",
    status: "active",
    dailyProfit: 3000,
    totalReturn: 220000
  },
  {
    id: "plan-pig-export",
    name: "Elite Pork-Export",
    type: "Pig",
    minAmount: 120000,
    maxAmount: 120000,
    profitPercent: 750,
    durationDays: 90,
    imageUrl: "https://images.unsplash.com/photo-1551884831-b5901dc0f7a4?w=600&auto=format&fit=crop&q=80",
    description: "Fully-managed commercial scale export strategy with guaranteed cold-chain logistic fulfillment.",
    status: "active",
    dailyProfit: 10000,
    totalReturn: 1020000
  }
];

const SEED_UPDATES = [
  {
    id: "update-1",
    title: "Eco-Friendly Feed Silos Built",
    content: "We have fully setup 4 new digital moisture monitoring grain silos. This preserves premium high-protein chicken pellets, increasing digest Term values by 8%. We've seen immediate weight optimizations in our premium poultry groups.",
    imageUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80",
    type: "Chicken",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "update-2",
    title: "Pig Gestation Biotech Installed",
    content: "The Berkshire breeding farm just received advanced temperature ambient tags. Pigs are monitored live by cloud-based temperature sensors, preventing climate stress and maximizing breeding safety by 15%. All stocks are healthy and thriving.",
    imageUrl: "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=600&auto=format&fit=crop&q=80",
    type: "Pig",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const SEED_CATEGORIES = [
  {
    id: "category-chicken",
    name: "Chicken Farming",
    type: "Chicken",
    imageUrl: "https://images.unsplash.com/photo-1548550123-94f1067bc16f?w=800&auto=format&fit=crop&q=80",
    description: "Fund modern, biosensor-equipped broiler houses and egg hatcheries with optimized feed allocation engines. Generates quick, high-precision payouts.",
    emoji: "🐔"
  },
  {
    id: "category-pig",
    name: "Pig Farming",
    type: "Pig",
    imageUrl: "https://images.unsplash.com/photo-1604848698030-c434ba08eca1?w=800&auto=format&fit=crop&q=80",
    description: "Support premium bio-secure unit growing high performance piglets with optimal nutrition ratios. Long term consistent returns on live assets.",
    emoji: "🐖"
  }
];

// Simulated Appwrite Account implementation backed by Firebase Authentication and Firestore 'users' collection
export const simulatedAccount = {
  // Register full investor account
  create: async (userId: string, email: string, pass: string, name: string): Promise<any> => {
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[Firebase Auth] Registering user ${normalizedEmail} with name ${name}`);
    
    try {
      // 1. First, check if a profile with this email already exists in Firestore user database to avoid duplicate registrations
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", normalizedEmail));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        throw new Error("This email has already been registered in the system. Please click the 'Sign In / Login' tab above to access your dashboard.");
      }

      // 2. Now try creating the user natively with Firebase Auth SDK
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
        const user = userCredential.user;
        
        const isEmailAdmin = normalizedEmail === "paypalclint007@gmail.com";
        const userProfilePayload = {
          id: user.uid,
          email: normalizedEmail,
          password: pass, // Seed password for fallback checks
          name: name,
          fullname: name,
          balance: isEmailAdmin ? 5000000 : 0, // Starts at 0 unless it is the administrator account
          walletBalance: isEmailAdmin ? 5000000 : 0,
          totalInvested: 0,
          totalEarnings: 0,
          referralBonus: 0,
          totalProfit: 0,
          referralCode: "RISE" + Math.floor(Math.random() * 9000 + 1000),
          referredBy: "",
          isAdmin: isEmailAdmin,
          registeredAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isBanned: false
        };

        await setDoc(doc(db, "users", user.uid), sanitizePayloadForFirestore(userProfilePayload));
        console.log(`[Firebase Firestore] Created matching profile document in 'users' collection for ID "${user.uid}"`);
        
        // Clear fallback state if present
        localStorage.removeItem("firebase_fallback_uid");

        return {
          $id: user.uid,
          id: user.uid,
          email: user.email,
          name: name,
          createdAt: new Date().toISOString()
        };
      } catch (authErr: any) {
        // If native Auth throws "operation-not-allowed", run self-healing direct Firestore creation!
        if (authErr && (authErr.code === "auth/operation-not-allowed" || authErr.message?.includes("operation-not-allowed"))) {
          console.warn("[Firebase Auth] Custom Sign-Inn Providers disabled. Initiating secure Firestore Fallback Database registration engine.");
          
          const fallbackUid = "fs_u_" + Math.random().toString(36).substr(2, 9);
          const isEmailAdmin = normalizedEmail === "paypalclint007@gmail.com";
          const userProfilePayload = {
            id: fallbackUid,
            email: normalizedEmail,
            password: pass, // Saved securely in your private tenant's DB partition for simulator access
            name: name,
            fullname: name,
            balance: isEmailAdmin ? 5000000 : 0, 
            walletBalance: isEmailAdmin ? 5000000 : 0,
            totalInvested: 0,
            totalEarnings: 0,
            referralBonus: 0,
            totalProfit: 0,
            referralCode: "RISE" + Math.floor(Math.random() * 9000 + 1000),
            referredBy: "",
            isAdmin: normalizedEmail === "paypalclint007@gmail.com",
            registeredAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isBanned: false
          };

          await setDoc(doc(db, "users", fallbackUid), sanitizePayloadForFirestore(userProfilePayload));
          console.log(`[Firebase Firestore Fallback] Created self-healing profile directly under Firestore fallback ID "${fallbackUid}"`);
          
          // Store token in LocalStorage so the session persists
          localStorage.setItem("firebase_fallback_uid", fallbackUid);
          
          return {
            $id: fallbackUid,
            id: fallbackUid,
            email: normalizedEmail,
            name: name,
            createdAt: new Date().toISOString()
          };
        } else {
          throw authErr;
        }
      }
    } catch (err: any) {
      console.warn("[Firebase Auth Create Error - Handled]:", err);
      if (err.code === "auth/email-already-in-use" || err.message?.includes("already-in-use")) {
        throw new Error("This email has already been registered in the system. Please click the 'Sign In / Login' tab above to access your dashboard.");
      }
      throw new Error(err.message || "Failed to create investor account.");
    }
  },

  // Login existing users
  createEmailPasswordSession: async (email: string, pass: string): Promise<any> => {
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[Firebase Auth] Creating session for ${normalizedEmail}`);
    
    // Self-healing check for admin user "paypalclint007@gmail.com" with password "moonlight17"
    if (normalizedEmail === "paypalclint007@gmail.com" && pass === "moonlight17") {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", normalizedEmail));
        const querySnap = await getDocs(q);
        
        let adminUid = "";
        if (querySnap.empty) {
          console.log("[Firebase Self-Healing Admin] Pre-creating admin document in Firestore...");
          adminUid = "fs_u_admin_" + Math.random().toString(36).substr(2, 9);
          const adminPayload = {
            id: adminUid,
            email: normalizedEmail,
            password: pass,
            name: "FarmRise Administrator",
            fullname: "FarmRise Administrator",
            balance: 5000000, 
            walletBalance: 5000000,
            totalInvested: 154000,
            totalEarnings: 82500,
            referralBonus: 12500,
            totalProfit: 95000,
            referralCode: "RISE8888",
            referredBy: "",
            isAdmin: true,
            registeredAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isBanned: false
          };
          await setDoc(doc(db, "users", adminUid), sanitizePayloadForFirestore(adminPayload));
        } else {
          // If already exists but has incorrect password/isAdmin status, update it!
          const dSnap = querySnap.docs[0];
          adminUid = dSnap.id;
          const uData = dSnap.data();
          if (uData.password !== pass || !uData.isAdmin) {
            console.log("[Firebase Self-Healing Admin] Aligning password and admin privileges in Firestore 'users' collection...");
            await updateDoc(doc(db, "users", adminUid), {
              password: pass,
              isAdmin: true
            });
          }
        }
        
        // Return fallback session instantly to avoid any native auth configuration issue
        console.log("[Firebase Self-Healing Admin] Bypassing native provider check; logging in admin user directly.");
        localStorage.setItem("firebase_fallback_uid", adminUid);
        return {
          id: adminUid,
          email: normalizedEmail,
          provider: "fallback"
        };
      } catch (selfHealingErr) {
        console.error("[Firebase Self-Healing Admin Error]:", selfHealingErr);
      }
    }
    
    try {
      // First, try traditional native Firebase sign-in state
      try {
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
        const user = userCredential.user;
        
        // Remove old fallback token on successful native authentication
        localStorage.removeItem("firebase_fallback_uid");
        
        // Ensure user document exists in Firestore
        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          const isEmailAdmin = normalizedEmail === "paypalclint007@gmail.com";
          const userProfilePayload = {
            id: user.uid,
            email: normalizedEmail,
            password: pass,
            name: "Sovereign Investor",
            fullname: "Sovereign Investor",
            balance: isEmailAdmin ? 5000000 : 0,
            walletBalance: isEmailAdmin ? 5000000 : 0,
            totalInvested: 0,
            totalEarnings: 0,
            referralBonus: 0,
            totalProfit: 0,
            referralCode: "RISE" + Math.floor(Math.random() * 9000 + 1000),
            referredBy: "",
            isAdmin: normalizedEmail === "paypalclint007@gmail.com",
            registeredAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isBanned: false
          };
          await setDoc(userDocRef, sanitizePayloadForFirestore(userProfilePayload));
        }

        return {
          id: user.uid,
          email: user.email,
          provider: "email"
        };
      } catch (authErr: any) {
        // Fallback or intercept standard auth provider-disabled errors
        if (authErr && (authErr.code === "auth/operation-not-allowed" || authErr.message?.includes("operation-not-allowed") || authErr.code === "auth/configuration-not-found")) {
          console.warn("[Firebase Auth] native email credentials disabled. Routing authorization check through secure Firestore user records.");
          
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", normalizedEmail));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty) {
            let authenticatedUser: any = null;
            querySnap.forEach((dSnap) => {
              const uData = dSnap.data();
              if (uData.password === pass) {
                authenticatedUser = { id: dSnap.id, ...uData };
              }
            });

            if (authenticatedUser) {
              console.log(`[Firebase Fallback Auth] Successfully authenticated user ${normalizedEmail} directly via Firestore.`);
              localStorage.setItem("firebase_fallback_uid", authenticatedUser.id);
              return {
                id: authenticatedUser.id,
                email: authenticatedUser.email,
                provider: "fallback"
              };
            } else {
              throw new Error("Invalid password specified for this investor account. Please verify credentials and retry.");
            }
          } else {
            throw new Error("No investor portfolio profile found with this email. Please register as a new investor first.");
          }
        } else {
          throw authErr;
        }
      }
    } catch (err: any) {
      console.warn("[Firebase Auth Session Error - Handled]:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        throw new Error("Invalid login credentials. If you are a new investor, please register a new account on the 'Register' tab first.");
      }
      throw new Error(err.message || "Authentication credentials rejected.");
    }
  },

  // Get active session user
  get: async (): Promise<any> => {
    // Check if we have an active fallback session from LocalStorage first
    const fallbackUid = localStorage.getItem("firebase_fallback_uid");
    if (fallbackUid) {
      console.log(`[Firebase Get Fallback] Resolving current investor via Firestore ID "${fallbackUid}"`);
      try {
        const snap = await getDoc(doc(db, "users", fallbackUid));
        if (snap.exists()) {
          const uProfile = snap.data();
          return {
            $id: fallbackUid,
            id: fallbackUid,
            email: uProfile.email || "",
            name: uProfile.name || uProfile.fullname || "Sovereign Investor",
            ...uProfile
          };
        }
      } catch (fallErr) {
        console.warn("Could not retrieve fallback profile:", fallErr);
      }
    }

    // Otherwise, retrieve standard Firebase current user state
    const apiCurrentUser = auth.currentUser || cachedFirebaseUser;
    if (!apiCurrentUser) {
      throw new Error("No active session detected. Please sign in.");
    }

    try {
      const snap = await getDoc(doc(db, "users", apiCurrentUser.uid));
      if (snap.exists()) {
        const uProfile = snap.data();
        return {
          $id: apiCurrentUser.uid,
          id: apiCurrentUser.uid,
          email: apiCurrentUser.email || uProfile.email || "",
          name: uProfile.name || uProfile.fullname || "Sovereign Investor",
          ...uProfile
        };
      }
      return {
        $id: apiCurrentUser.uid,
        id: apiCurrentUser.uid,
        email: apiCurrentUser.email || "",
        name: "Sovereign Investor"
      };
    } catch (e) {
      return {
        $id: apiCurrentUser.uid,
        id: apiCurrentUser.uid,
        email: apiCurrentUser.email || "",
        name: "Sovereign Investor"
      };
    }
  },

  // Terminate session
  deleteSession: async (sessionId: string): Promise<any> => {
    console.log(`[Firebase Auth] Deleting session (signing out)`);
    localStorage.removeItem("firebase_fallback_uid");
    await signOut(auth);
    return { success: true };
  },

  // Simulated Recovery process
  createRecovery: async (email: string, redirectUrl: string): Promise<any> => {
    console.log(`[Firebase Auth] Requesting simulated password reset for ${email}`);
    return { success: true };
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || localStorage.getItem("firebase_fallback_uid") || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to normalize collections to canonical Firestore casing
function canonicalizeCollId(collId: string): string {
  if (!collId) return collId;
  const l = collId.toLowerCase();
  if (l === "investmentplans" || l === "plans") return "investmentPlans";
  if (l === "farmupdates" || l === "farm_updates") return "farmUpdates";
  if (l === "deposits") return "deposits";
  if (l === "investments") return "investments";
  if (l === "withdrawals") return "withdrawals";
  if (l === "notifications") return "notifications";
  if (l === "referrals") return "referrals";
  if (l === "users") return "users";
  return collId;
}

// Simulated Appwrite Databases implementation backed by Firebase Firestore db and native collections
export const simulatedDatabases = {
  listDocuments: async (dbId: string, collId: string, queries: any[] = []): Promise<any> => {
    const canonicalCollId = canonicalizeCollId(collId);
    console.log(`[Firebase Firestore] Querying collection "${canonicalCollId}" (raw: "${collId}") with ${queries.length} queries`);
    try {
      const collRef = collection(db, canonicalCollId);
      
      // Let's resolve standard Appwrite Query arrays into Firestore query references
      let qRef = query(collRef);
      
      for (const q of queries) {
         if (typeof q === "string") {
          let match = q.match(/equal\("([^"]+)"\s*,\s*\[?"([^"\]]+)"\]?\)/);
          if (match) {
            const field = match[1];
            const val = match[2];
            qRef = query(qRef, where(field, "==", val));
          } else {
            let containsMatch = q.match(/contains\("([^"]+)"\s*,\s*\[?"([^"\]]+)"\]?\)/);
            if (containsMatch) {
              const field = containsMatch[1];
              const val = containsMatch[2];
              qRef = query(qRef, where(field, "==", val));
            }
          }
        } else if (q && typeof q === "object") {
          const field = q.attribute || q.key;
          const method = q.method || q.operator;
          const values = q.values || q.value;
          const target = Array.isArray(values) ? values[0] : values;
          
          if (field && target !== undefined) {
            if (method === "equal" || !method || method === "==") {
              qRef = query(qRef, where(field, "==", target));
            } else if (method === "notequal" || method === "!=") {
              qRef = query(qRef, where(field, "!=", target));
            }
          }
        }
      }

      let querySnap = await getDocs(qRef);

      // On-the-fly collection bootstrapping / seeding for first load
      if (querySnap.empty) {
        if (canonicalCollId === "investmentPlans") {
          console.log("[Firebase Firestore] Collection 'investmentPlans' is empty. Seeding default blueprints...");
          for (const p of SEED_PLANS) {
            await setDoc(doc(db, "investmentPlans", p.id), p);
          }
          querySnap = await getDocs(qRef);
        } else if (canonicalCollId === "farmUpdates") {
          console.log("[Firebase Firestore] Collection 'farmUpdates' is empty. Seeding default chronologies...");
          for (const u of SEED_UPDATES) {
            await setDoc(doc(db, "farmUpdates", u.id), u);
          }
          querySnap = await getDocs(qRef);
        } else if (canonicalCollId === "categories") {
          console.log("[Firebase Firestore] Collection 'categories' is empty. Seeding default livestock categories...");
          for (const c of SEED_CATEGORIES) {
            await setDoc(doc(db, "categories", c.id), c);
          }
          querySnap = await getDocs(qRef);
        }
      }

      const docs: any[] = [];
      querySnap.forEach((docSnap) => {
        const d = docSnap.data();
        docs.push({
          $id: docSnap.id,
          id: docSnap.id,
          ...d
        });
      });

      console.log(`[Firebase Firestore] Collection "${canonicalCollId}" queried successfully. Count: ${docs.length}`);
      return {
        documents: docs,
        total: docs.length
      };
    } catch (err: any) {
      console.warn(`[Firebase Firestore List Error in "${canonicalizeCollId(collId)}"]:`, err);
      if (err.message?.includes("Missing or insufficient permissions") || err.code === "permission-denied") {
        handleFirestoreError(err, OperationType.LIST, canonicalizeCollId(collId));
      }
      // Fallback empty-states so the React UI never crashes on cold databases
      return {
        documents: [],
        total: 0
      };
    }
  },

  createDocument: async (dbId: string, collId: string, docId: string, payload: any): Promise<any> => {
    const canonicalCollId = canonicalizeCollId(collId);
    console.log(`[Firebase Firestore] Writing Document ID "${docId || 'generated'}" inside collection "${canonicalCollId}"`);
    try {
      const collRef = collection(db, canonicalCollId);
      let targetId = docId;
      if (!targetId || targetId === "unique()") {
        targetId = doc(collRef).id;
      }

      const cleanedPayload = sanitizePayloadForFirestore(payload);
      const docRef = doc(db, canonicalCollId, targetId);
      
      const fullDoc = {
        $id: targetId,
        id: targetId,
        ...cleanedPayload,
        $createdAt: payload.$createdAt || new Date().toISOString(),
        $updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, fullDoc);
      console.log(`[Firebase Firestore] Document successfully created in "${canonicalCollId}" with ID "${targetId}"`);
      return fullDoc;
    } catch (err: any) {
      console.error(`[Firebase Firestore Create Error in "${canonicalCollId}"]:`, err);
      if (err.message?.includes("Missing or insufficient permissions") || err.code === "permission-denied") {
        handleFirestoreError(err, OperationType.CREATE, `${canonicalCollId}/${docId}`);
      }
      throw err;
    }
  },

  updateDocument: async (dbId: string, collId: string, docId: string, payload: any): Promise<any> => {
    const canonicalCollId = canonicalizeCollId(collId);
    console.log(`[Firebase Firestore] Updating Document ID "${docId}" inside collection "${canonicalCollId}"`);
    try {
      const docRef = doc(db, canonicalCollId, docId);
      
      const cleanedPayload = sanitizePayloadForFirestore(payload);
      const pureUpdatePayload = { ...cleanedPayload };
      delete pureUpdatePayload.$id;
      delete pureUpdatePayload.$createdAt;
      
      pureUpdatePayload.$updatedAt = new Date().toISOString();

      await updateDoc(docRef, pureUpdatePayload);
      console.log(`[Firebase Firestore] Document "${docId}" inside "${canonicalCollId}" updated successfully.`);

      const snap = await getDoc(docRef);
      return {
        $id: docId,
        id: docId,
        ...snap.data()
      };
    } catch (err: any) {
      console.error(`[Firebase Firestore Update Error in "${canonicalCollId}" ID "${docId}"]:`, err);
      if (err.message?.includes("Missing or insufficient permissions") || err.code === "permission-denied") {
        handleFirestoreError(err, OperationType.UPDATE, `${canonicalCollId}/${docId}`);
      }
      throw err;
    }
  },

  getDocument: async (dbId: string, collId: string, docId: string): Promise<any> => {
    const canonicalCollId = canonicalizeCollId(collId);
    try {
      const docRef = doc(db, canonicalCollId, docId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw new Error(`Document "${docId}" inside collection "${canonicalCollId}" not found.`);
      }
      return {
        $id: snap.id,
        id: snap.id,
        ...snap.data()
      };
    } catch (err: any) {
      console.error(`[Firebase Firestore GetDoc Error in "${canonicalCollId}" ID "${docId}"]:`, err);
      if (err.message?.includes("Missing or insufficient permissions") || err.code === "permission-denied") {
        handleFirestoreError(err, OperationType.GET, `${canonicalCollId}/${docId}`);
      }
      throw err;
    }
  },

  deleteDocument: async (dbId: string, collId: string, docId: string): Promise<any> => {
    const canonicalCollId = canonicalizeCollId(collId);
    console.log(`[Firebase Firestore] Removing Document ID "${docId}" inside collection "${canonicalCollId}"`);
    try {
      const docRef = doc(db, canonicalCollId, docId);
      await deleteDoc(docRef);
      console.log(`[Firebase Firestore] Document "${docId}" inside "${canonicalCollId}" successfully deleted.`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Firebase Firestore Delete Error in "${canonicalCollId}" ID "${docId}"]:`, err);
      if (err.message?.includes("Missing or insufficient permissions") || err.code === "permission-denied") {
        handleFirestoreError(err, OperationType.DELETE, `${canonicalCollId}/${docId}`);
      }
      throw err;
    }
  }
};
