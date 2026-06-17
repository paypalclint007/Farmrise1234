import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  UserProfile, Deposit, InvestmentPlan, ActiveInvestment, 
  FarmUpdate, Withdrawal, Notification, Referral 
} from "../types";
import { 
  client, account, databases, APPWRITE_CONFIG, isMockAppwrite, handleAppwriteError, OperationType 
} from "../appwrite";
import { ID, Query } from "appwrite";

interface FarmContextType {
  currentUser: UserProfile | null;
  plans: InvestmentPlan[];
  deposits: Deposit[];
  investments: ActiveInvestment[];
  withdrawals: Withdrawal[];
  notifications: Notification[];
  farmUpdates: FarmUpdate[];
  users: UserProfile[]; // Admin access
  referrals: Referral[];
  currentPage: string;
  selectedPlan: InvestmentPlan | null;
  loading: boolean;
  isAdminMode: boolean;
  
  // Auth actions
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, phoneNumber: string, referredCode?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Navigation
  navigate: (page: string, state?: any) => void;
  
  // User operations
  createDeposit: (amount: number, txRef: string, proofImg?: string) => Promise<void>;
  createInvestment: (planId: string, amount: number) => Promise<void>;
  withdrawMaturedInvestment: (id: string) => Promise<void>;
  createWithdrawal: (amount: number, accountDetails: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  
  // Admin operations
  approveDeposit: (id: string) => Promise<void>;
  rejectDeposit: (id: string) => Promise<void>;
  approveWithdrawal: (id: string) => Promise<void>;
  rejectWithdrawal: (id: string) => Promise<void>;
  createOrUpdatePlan: (plan: InvestmentPlan) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  createFarmUpdate: (title: string, content: string, category: "Chicken" | "Pig" | "General", imageUrl: string, videoUrl?: string) => Promise<void>;
  editFarmUpdate: (id: string, title: string, content: string, category: "Chicken" | "Pig" | "General", imageUrl: string, videoUrl?: string) => Promise<void>;
  deleteFarmUpdate: (id: string) => Promise<void>;
  banUser: (userId: string, isBanned: boolean) => Promise<void>;
  sendBroadcastNotification: (title: string, message: string, targetUserId: string) => Promise<void>;
  toggleAdminMode: () => void;
  quickAddFunds: (amount: number) => Promise<void>;
  triggerMaturityCheck: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

// Bidirectional Appwrite mapper functions to support both original and newly requested attributes
const mapUserFromDoc = (doc: any): UserProfile => ({
  id: doc.$id || doc.id,
  email: doc.email || "",
  name: doc.fullname || doc.name || "",
  phoneNumber: doc.phone || doc.phoneNumber || "",
  balance: doc.walletBalance !== undefined ? doc.walletBalance : (doc.balance || 0),
  totalInvested: doc.totalInvested || 0,
  totalEarnings: doc.totalEarnings || 0,
  referralBonus: doc.referralBonus || 0,
  totalProfit: doc.totalProfit || 0,
  referralCode: doc.referralCode || "",
  referredBy: doc.referredBy || "",
  isAdmin: doc.isAdmin || false,
  registeredAt: doc.createdAt || doc.registeredAt || "",
  isBanned: doc.isBanned || false
});

const mapUserToDoc = (user: UserProfile) => ({
  email: user.email,
  name: user.name,
  fullname: user.name,
  phoneNumber: user.phoneNumber,
  phone: user.phoneNumber,
  balance: user.balance,
  walletBalance: user.balance,
  totalInvested: user.totalInvested,
  totalEarnings: user.totalEarnings,
  referralBonus: user.referralBonus,
  totalProfit: user.totalProfit,
  referralCode: user.referralCode,
  referredBy: user.referredBy,
  isAdmin: user.isAdmin,
  registeredAt: user.registeredAt,
  createdAt: user.registeredAt,
  isBanned: user.isBanned || false
});

const mapPlanFromDoc = (doc: any): InvestmentPlan => ({
  id: doc.$id || doc.id,
  name: doc.title || doc.name || "",
  type: doc.category || doc.type || "Chicken",
  minAmount: doc.amount !== undefined ? doc.amount : (doc.minAmount || 0),
  maxAmount: doc.maxAmount || doc.amount || 0,
  profitPercent: doc.profitPercent || 0,
  durationDays: doc.duration !== undefined ? doc.duration : (doc.durationDays || 0),
  imageUrl: doc.image || doc.imageUrl || "",
  description: doc.description || "",
  status: doc.status || "active",
  dailyProfit: doc.dailyProfit,
  totalReturn: doc.totalReturn
});

const mapPlanToDoc = (plan: InvestmentPlan) => {
  const minAmt = plan.minAmount;
  const duration = plan.durationDays;
  const profPct = plan.profitPercent;
  const computedDailyProfit = (minAmt * (profPct / 100)) / (duration || 1);
  const computedTotalReturn = minAmt * (1 + profPct / 100);

  return {
    name: plan.name,
    title: plan.name,
    type: plan.type,
    category: plan.type,
    minAmount: plan.minAmount,
    maxAmount: plan.maxAmount,
    amount: plan.minAmount,
    profitPercent: plan.profitPercent,
    durationDays: plan.durationDays,
    duration: plan.durationDays,
    dailyProfit: plan.dailyProfit !== undefined ? plan.dailyProfit : computedDailyProfit,
    totalReturn: plan.totalReturn !== undefined ? plan.totalReturn : computedTotalReturn,
    imageUrl: plan.imageUrl,
    image: plan.imageUrl,
    description: plan.description,
    status: plan.status || "active"
  };
};

const mapInvestmentFromDoc = (doc: any): ActiveInvestment => ({
  id: doc.$id || doc.id,
  userId: doc.userId,
  planId: doc.planId,
  planName: doc.planName || "",
  type: doc.type || "Chicken",
  amount: doc.amount,
  profitRate: doc.profitRate || 0,
  expectedReturn: doc.expectedReturn,
  durationDays: doc.durationDays || 0,
  status: doc.status,
  createdAt: doc.startDate || doc.createdAt,
  maturesAt: doc.endDate || doc.maturesAt
});

const mapInvestmentToDoc = (inv: ActiveInvestment) => {
  const dailyProf = (inv.amount * (inv.profitRate / 100)) / (inv.durationDays || 1);
  return {
    userId: inv.userId,
    planId: inv.planId,
    planName: inv.planName,
    type: inv.type,
    amount: inv.amount,
    profitRate: inv.profitRate,
    expectedReturn: inv.expectedReturn,
    dailyProfit: dailyProf,
    durationDays: inv.durationDays,
    startDate: inv.createdAt,
    createdAt: inv.createdAt,
    endDate: inv.maturesAt,
    maturesAt: inv.maturesAt,
    status: inv.status
  };
};

const mapDepositFromDoc = (doc: any): Deposit => ({
  id: doc.$id || doc.id,
  userId: doc.userId,
  amount: doc.amount,
  status: doc.status,
  txRef: doc.txRef || "",
  proofImg: doc.receiptImage || doc.proofImg || "",
  receiptImage: doc.receiptImage || doc.proofImg || "",
  createdAt: doc.createdAt
});

const mapDepositToDoc = (dep: Deposit) => ({
  userId: dep.userId,
  amount: dep.amount,
  status: dep.status,
  txRef: dep.txRef || "",
  proofImg: dep.receiptImage || dep.proofImg || "",
  receiptImage: dep.receiptImage || dep.proofImg || "",
  createdAt: dep.createdAt
});

const mapFarmUpdateFromDoc = (doc: any): FarmUpdate => ({
  id: doc.$id || doc.id,
  title: doc.title,
  content: doc.description || doc.content || "",
  imageUrl: doc.image || doc.imageUrl || "",
  videoUrl: doc.video || doc.videoUrl || "",
  type: doc.type || "General",
  createdAt: doc.createdAt
});

const mapFarmUpdateToDoc = (fu: FarmUpdate) => ({
  title: fu.title,
  content: fu.content,
  description: fu.content,
  imageUrl: fu.imageUrl,
  image: fu.imageUrl,
  videoUrl: fu.videoUrl || "",
  video: fu.videoUrl || "",
  type: fu.type,
  createdAt: fu.createdAt
});

const mapWithdrawalFromDoc = (doc: any): Withdrawal => ({
  id: doc.$id || doc.id,
  userId: doc.userId,
  amount: doc.amount,
  status: doc.status,
  accountDetails: doc.accountDetails,
  createdAt: doc.createdAt
});

const mapWithdrawalToDoc = (w: Withdrawal) => ({
  userId: w.userId,
  amount: w.amount,
  status: w.status,
  accountDetails: w.accountDetails,
  createdAt: w.createdAt
});

// Initial mock plans to seed
const DEFAULT_PLANS: InvestmentPlan[] = [
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

const DEFAULT_UPDATES: FarmUpdate[] = [
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

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<InvestmentPlan[]>(DEFAULT_PLANS);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [investments, setInvestments] = useState<ActiveInvestment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [farmUpdates, setFarmUpdates] = useState<FarmUpdate[]>(DEFAULT_UPDATES);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  
  const [currentPage, setCurrentPage] = useState<string>("splash");
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);

  // Sync state to local storage in mock mode
  const syncLocal = (key: string, data: any) => {
    if (isMockAppwrite) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // 1. Initial configuration check & Local state loading
  useEffect(() => {
    if (isMockAppwrite) {
      const storedUser = localStorage.getItem("fr_current_user");
      const storedPlans = localStorage.getItem("fr_plans");
      const storedDeposits = localStorage.getItem("fr_deposits");
      const storedInvestments = localStorage.getItem("fr_investments");
      const storedWithdrawals = localStorage.getItem("fr_withdrawals");
      const storedUpdates = localStorage.getItem("fr_updates");
      const storedNotifications = localStorage.getItem("fr_notifications");
      const storedUsers = localStorage.getItem("fr_users");
      const storedReferrals = localStorage.getItem("fr_referrals");

      if (storedUser) setCurrentUser(JSON.parse(storedUser));
      if (storedPlans) setPlans(JSON.parse(storedPlans));
      else localStorage.setItem("fr_plans", JSON.stringify(DEFAULT_PLANS));

      if (storedDeposits) setDeposits(JSON.parse(storedDeposits));
      if (storedInvestments) setInvestments(JSON.parse(storedInvestments));
      if (storedWithdrawals) setWithdrawals(JSON.parse(storedWithdrawals));
      if (storedUpdates) setFarmUpdates(JSON.parse(storedUpdates));
      else localStorage.setItem("fr_updates", JSON.stringify(DEFAULT_UPDATES));

      if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
      if (storedUsers) setUsers(JSON.parse(storedUsers));
      
      if (storedReferrals) {
        setReferrals(JSON.parse(storedReferrals));
      } else {
        const dummyReferrals: Referral[] = [];
        setReferrals(dummyReferrals);
        localStorage.setItem("fr_referrals", JSON.stringify(dummyReferrals));
      }
      
      setLoading(false);
      setTimeout(() => {
        if (storedUser) {
          setCurrentPage("dashboard");
        } else {
          setCurrentPage("login");
        }
      }, 1500);
    } else {
      // Real Appwrite Auth session recovery loop
      const checkSession = async () => {
        try {
          const userSession = await account.get();
          if (userSession) {
            let userProfile: UserProfile;
            try {
              const doc = await databases.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                userSession.$id
              );
              userProfile = mapUserFromDoc(doc);
              // Securely enforce that only paypalclint007@gmail.com can be an administrator
              userProfile.isAdmin = (userProfile.email || "").toLowerCase() === "paypalclint007@gmail.com";
            } catch (err) {
              // Create user profile document if missing or permissions are blocked
              console.warn("Could not retrieve user document from database. Using local/fallback profile:", err);
              const nameValue = userSession.name || "Agriculture Investor";
              userProfile = {
                id: userSession.$id,
                email: userSession.email,
                name: nameValue,
                phoneNumber: userSession.phone || "",
                balance: userSession.email.toLowerCase() === "paypalclint007@gmail.com" ? 25000 : 0,
                totalInvested: 0,
                totalEarnings: 0,
                referralBonus: 0,
                totalProfit: 0,
                referralCode: "RISE" + Math.floor(Math.random() * 9000 + 1000),
                referredBy: "",
                isAdmin: userSession.email.toLowerCase() === "paypalclint007@gmail.com",
                registeredAt: new Date().toISOString()
              };
              
              // Try to write it in the database in the background, ignore any errors
              try {
                await databases.createDocument(
                  APPWRITE_CONFIG.databaseId,
                  APPWRITE_CONFIG.collections.users,
                  userSession.$id,
                  mapUserToDoc(userProfile)
                );
              } catch (createErr) {
                console.warn("Failed to create profile in Appwrite database during session fallback:", createErr);
              }
            }
            setCurrentUser(userProfile);
            syncLocal("fr_current_user", userProfile);
            setCurrentPage("dashboard");
          } else {
            setCurrentUser(null);
            setCurrentPage("login");
          }
        } catch (err) {
          setCurrentUser(null);
          setCurrentPage("login");
        } finally {
          setLoading(false);
        }
      };
      
      checkSession();
    }
  }, []);

  // Fetch real Appwrite Database lists during active sessions
  const fetchAllData = async (userProfile: UserProfile) => {
    if (isMockAppwrite) return;
    try {
      // Fetch investment plans
      const plansDoc = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.plans
      );
      const fetchedPlans = plansDoc.documents.map(mapPlanFromDoc);
      if (fetchedPlans.length > 0) setPlans(fetchedPlans);

      // Fetch farm updates
      const updatesDoc = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.farmUpdates
      );
      const fetchedUpdates = updatesDoc.documents.map(mapFarmUpdateFromDoc);
      if (fetchedUpdates.length > 0) {
        setFarmUpdates(fetchedUpdates.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }

      // Fetch user specific deposits
      const depDoc = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.deposits,
        userProfile.isAdmin ? [] : [Query.equal("userId", userProfile.id)]
      );
      setDeposits(depDoc.documents.map(mapDepositFromDoc));

      // Fetch user active investments
      const invDoc = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.investments,
        userProfile.isAdmin ? [] : [Query.equal("userId", userProfile.id)]
      );
      setInvestments(invDoc.documents.map(mapInvestmentFromDoc));

      // Fetch user withdrawals
      const withDoc = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.withdrawals,
        userProfile.isAdmin ? [] : [Query.equal("userId", userProfile.id)]
      );
      setWithdrawals(withDoc.documents.map(mapWithdrawalFromDoc));

      // Fetch referrals
      const refDoc = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.referrals,
        userProfile.isAdmin ? [] : [Query.equal("referrerId", userProfile.id)]
      );
      setReferrals(refDoc.documents as any as Referral[]);

      // Fetch public/private notifications
      const notifDoc = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications
      );
      const allNotifs = notifDoc.documents as any as Notification[];
      const filtered = allNotifs.filter(n => n.userId === "all" || n.userId === userProfile.id);
      setNotifications(filtered.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      // Fetch all users list if Admin
      if (userProfile.isAdmin) {
        const usersDoc = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.users
        );
        setUsers(usersDoc.documents.map(mapUserFromDoc));
      }
    } catch (err) {
      console.warn("Dynamic data polling error, verifying collections match: ", err);
    }
  };

  // Real-time synchronization loop when user is active
  useEffect(() => {
    if (isMockAppwrite || !currentUser) return;

    fetchAllData(currentUser);

    // Setup polling or subscription for real-time state consistency
    const interval = setInterval(() => {
      fetchAllData(currentUser);
    }, 12000);

    // Check if we are running through the local API proxy or in a secure iframe environment.
    // If so, skip WebSocket subscriptions to avoid connection loop error messages.
    const isUsingProxy = typeof window !== "undefined" && 
      (window.location.host.includes("run.app") || window.location.pathname.includes("/api/appwrite") || true);

    let unsubscribe = () => {};
    if (!isUsingProxy) {
      try {
        const channel = `databases.${APPWRITE_CONFIG.databaseId}.collections`;
        unsubscribe = client.subscribe(
          [
            `${channel}.${APPWRITE_CONFIG.collections.users}.documents`,
            `${channel}.${APPWRITE_CONFIG.collections.plans}.documents`,
            `${channel}.${APPWRITE_CONFIG.collections.deposits}.documents`,
            `${channel}.${APPWRITE_CONFIG.collections.investments}.documents`,
            `${channel}.${APPWRITE_CONFIG.collections.withdrawals}.documents`,
            `${channel}.${APPWRITE_CONFIG.collections.notifications}.documents`,
            `${channel}.${APPWRITE_CONFIG.collections.farmUpdates}.documents`,
            `${channel}.${APPWRITE_CONFIG.collections.referrals}.documents`,
          ],
          () => {
            fetchAllData(currentUser);
          }
        );
      } catch (err) {
        console.warn("Could not establish real-time socket connection, relying on robust polling:", err);
      }
    }

    return () => {
      clearInterval(interval);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  // Auth operations
  const loginWithEmail = async (email: string, pass: string) => {
    if (isMockAppwrite) {
      const isEmailAdmin = email.toLowerCase() === "paypalclint007@gmail.com";
      const mockUid = "user_riser_" + Math.floor(Math.random() * 1000);
      const mockU: UserProfile = {
        id: mockUid,
        email: email,
        name: isEmailAdmin ? "Admin Clint" : "Standard Investor",
        phoneNumber: "+2348000000000",
        balance: isEmailAdmin ? 25000 : 0,
        totalInvested: 0,
        totalEarnings: 0,
        referralBonus: 0,
        totalProfit: 0,
        referralCode: "RISE" + Math.floor(Math.random() * 9000 + 1000),
        referredBy: "",
        isAdmin: isEmailAdmin,
        registeredAt: new Date().toISOString()
      };
      setCurrentUser(mockU);
      syncLocal("fr_current_user", mockU);
      
      const newUsers = [...users.filter(u => u.email !== email), mockU];
      setUsers(newUsers);
      syncLocal("fr_users", newUsers);

      setCurrentPage("dashboard");
      return;
    }

    try {
      // Clear any active session first to prevent 'Creation of a session is prohibited...' error
      try {
        await account.deleteSession("current");
      } catch (e) {
        // Safe to ignore if there is no active session
      }

      await account.createEmailPasswordSession(email, pass);
      const userSession = await account.get();
      
      let userProfile: UserProfile;
      try {
        const doc = await databases.getDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.users,
          userSession.$id
        );
        userProfile = doc as unknown as UserProfile;
        // Securely enforce that only paypalclint007@gmail.com can be an administrator
        userProfile.isAdmin = (userProfile.email || "").toLowerCase() === "paypalclint007@gmail.com";
      } catch (getErr) {
        console.warn("Could not retrieve user profile from DB during login, using resilient local state:", getErr);
        const nameValue = userSession.name || "Sovereign Investor";
        userProfile = {
          id: userSession.$id,
          email: email,
          name: nameValue,
          phoneNumber: userSession.phone || "",
          balance: email.toLowerCase() === "paypalclint007@gmail.com" ? 25000 : 0,
          totalInvested: 0,
          totalEarnings: 0,
          referralBonus: 0,
          totalProfit: 0,
          referralCode: "RISE" + Math.floor(Math.random() * 9000 + 1000),
          referredBy: "",
          isAdmin: email.toLowerCase() === "paypalclint007@gmail.com",
          registeredAt: new Date().toISOString()
        };

        // Try creating Document in background, ignore any perm or structure issues
        try {
          await databases.createDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.users,
            userSession.$id,
            userProfile
          );
        } catch (createErr) {
          console.warn("Failed to create profile in Appwrite database during login fallback:", createErr);
        }
      }

      setCurrentUser(userProfile);
      syncLocal("fr_current_user", userProfile);
      setCurrentPage("dashboard");
    } catch (err: any) {
      throw new Error(err.message || "Failed to sign-in to investor account.");
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, phoneNumber: string, referredCode?: string) => {
    if (isMockAppwrite) {
      const mockUid = "user_riser_" + Math.floor(Math.random() * 1000);
      const mockU: UserProfile = {
        id: mockUid,
        email: email,
        name: name,
        phoneNumber: phoneNumber,
        balance: 0,
        totalInvested: 0,
        totalEarnings: 0,
        referralBonus: 0,
        totalProfit: 0,
        referralCode: "RISE" + Math.floor(Math.random() * 9000 + 1000),
        referredBy: referredCode || "",
        isAdmin: email.toLowerCase() === "paypalclint007@gmail.com",
        registeredAt: new Date().toISOString()
      };
      
      setCurrentUser(mockU);
      syncLocal("fr_current_user", mockU);
      
      const newUsers = [...users, mockU];
      setUsers(newUsers);
      syncLocal("fr_users", newUsers);

      if (referredCode) {
        const referrer = users.find(u => u.referralCode === referredCode);
        if (referrer) {
          const newRefRecord: Referral = {
            id: "ref_" + Date.now(),
            referrerId: referrer.id,
            referrerCode: referredCode,
            referredId: mockUid,
            referredName: name,
            referredEmail: email,
            referredPhone: phoneNumber,
            status: "pending",
            commissionPaid: 0,
            createdAt: new Date().toISOString()
          };
          const updatedRefs = [newRefRecord, ...referrals];
          setReferrals(updatedRefs);
          syncLocal("fr_referrals", updatedRefs);
        }
      }

      setCurrentPage("dashboard");
      return;
    }

    try {
      // Clear any active session first to prevent 'Creation of a session is prohibited...' error
      try {
        await account.deleteSession("current");
      } catch (e) {
        // Safe to ignore if there is no active session
      }

      const userId = ID.unique();
      await account.create(userId, email, pass, name);
      await account.createEmailPasswordSession(email, pass);

      const newProfile: UserProfile = {
        id: userId,
        email: email,
        name: name,
        phoneNumber: phoneNumber,
        balance: 0,
        totalInvested: 0,
        totalEarnings: 0,
        referralBonus: 0,
        totalProfit: 0,
        referralCode: "RISE" + Math.floor(Math.random() * 9000 + 1000),
        referredBy: referredCode || "",
        isAdmin: email.toLowerCase() === "paypalclint007@gmail.com",
        registeredAt: new Date().toISOString()
      };

      try {
        await databases.createDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.users,
          userId,
          newProfile
        );
      } catch (createErr) {
        console.warn("Failed to write profile document to Appwrite DB during registration, using local fallback:", createErr);
      }

      if (referredCode) {
        try {
          const referrerQuery = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.users,
            [Query.equal("referralCode", referredCode)]
          ).catch(() => ({ documents: [] }));
          
          if (referrerQuery.documents.length > 0) {
            const referrerDoc = referrerQuery.documents[0] as any as UserProfile;
            const refId = `${referrerDoc.id}_${userId}`;
            const referralRec: Referral = {
              id: refId,
              referrerId: referrerDoc.id,
              referrerCode: referredCode,
              referredId: userId,
              referredName: name,
              referredEmail: email,
              referredPhone: phoneNumber,
              status: "pending",
              commissionPaid: 0,
              createdAt: new Date().toISOString()
            };
            await databases.createDocument(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.collections.referrals,
              refId,
              referralRec
            ).catch((e) => console.warn("Referral document creation failed:", e));
          }
        } catch (err) {
          console.error("Error creating referral document:", err);
        }
      }

      setCurrentUser(newProfile);
      syncLocal("fr_current_user", newProfile);
      
      const localUsers = JSON.parse(localStorage.getItem("fr_users") || "[]");
      if (!localUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
        localUsers.push(newProfile);
        syncLocal("fr_users", localUsers);
      }

      setCurrentPage("dashboard");
    } catch (err: any) {
      throw new Error(err.message || "Failed to register new investor profile.");
    }
  };

  const forgotPassword = async (email: string) => {
    if (isMockAppwrite) {
      console.log(`[Mock] Send password reset email to ${email}`);
      return;
    }
    try {
      await account.createRecovery(email, window.location.origin + "/reset-password");
    } catch (err: any) {
      throw new Error(err.message || "Failed to dispatch password recovery mail.");
    }
  };

  const logout = async () => {
    if (isMockAppwrite) {
      setCurrentUser(null);
      localStorage.removeItem("fr_current_user");
      setIsAdminMode(false);
      setCurrentPage("login");
      return;
    }
    try {
      await account.deleteSession("current");
    } catch (err) {
      console.warn("Session logout warning: ", err);
    }
    setCurrentUser(null);
    setIsAdminMode(false);
    setCurrentPage("login");
  };

  const navigate = (page: string, params?: any) => {
    if (page === "investment-details" && params) {
      setSelectedPlan(params);
    }
    setCurrentPage(page);
  };

  // User database actions
  const createDeposit = async (amount: number, txRef: string, proofImg?: string) => {
    if (!currentUser) return;
    const finalProof = proofImg || "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80";
    const newDeposit: Deposit = {
      id: "dep_" + Date.now(),
      userId: currentUser.id,
      amount,
      status: "pending",
      txRef: txRef || "DEP-TX-" + Math.floor(Math.random() * 900000 + 100000),
      proofImg: finalProof,
      receiptImage: finalProof,
      createdAt: new Date().toISOString()
    };

    if (isMockAppwrite) {
      const updated = [newDeposit, ...deposits];
      setDeposits(updated);
      syncLocal("fr_deposits", updated);

      const newNotif: Notification = {
        id: "not_" + Date.now(),
        userId: currentUser.id,
        title: "Deposit Submitted",
        message: `Your deposit request of ₦${amount} is pending admin approval (TXREF: ${txRef}).`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      const updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);
      syncLocal("fr_notifications", updatedNotifs);
      return;
    }

    try {
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.deposits,
        newDeposit.id,
        newDeposit
      );

      const notifId = "not_" + Date.now();
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications,
        notifId,
        {
          id: notifId,
          userId: currentUser.id,
          title: "Deposit Submitted",
          message: `Your deposit request of ₦${amount} is pending admin approval.`,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      );
    } catch (err) {
      handleAppwriteError(err, OperationType.CREATE, `deposits/${newDeposit.id}`);
    }
  };

  const createInvestment = async (planId: string, amount: number) => {
    if (!currentUser || currentUser.balance < amount) {
      throw new Error("Insufficient farming funds. Please make a deposit first.");
    }
    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan) throw new Error("Farming Plan not found.");

    if (amount < targetPlan.minAmount || amount > targetPlan.maxAmount) {
      throw new Error(`Investment amount must be between ₦${targetPlan.minAmount.toLocaleString()} and ₦${targetPlan.maxAmount.toLocaleString()}.`);
    }

    const calculatedReturn = Number((amount * (1 + targetPlan.profitPercent / 100)).toFixed(2));
    const matures = new Date();
    matures.setDate(matures.getDate() + targetPlan.durationDays);

    const newInv: ActiveInvestment = {
      id: "inv_" + Date.now(),
      userId: currentUser.id,
      planId,
      planName: targetPlan.name,
      type: targetPlan.type,
      amount,
      profitRate: targetPlan.profitPercent,
      expectedReturn: calculatedReturn,
      durationDays: targetPlan.durationDays,
      status: "active",
      createdAt: new Date().toISOString(),
      maturesAt: matures.toISOString()
    };

    if (isMockAppwrite) {
      const updatedUser: UserProfile = {
        ...currentUser,
        balance: Number((currentUser.balance - amount).toFixed(2)),
        totalInvested: Number((currentUser.totalInvested + amount).toFixed(2))
      };

      let newRefs = [...referrals];
      if (currentUser.referredBy) {
        const activeRefIndex = newRefs.findIndex(r => r.referredId === currentUser.id && r.status === "pending");
        if (activeRefIndex !== -1) {
          const activeRef = { ...newRefs[activeRefIndex] };
          const commission = Number((amount * 0.05).toFixed(2));
          activeRef.status = "active";
          activeRef.commissionPaid = commission;
          newRefs[activeRefIndex] = activeRef;
          
          setReferrals(newRefs);
          syncLocal("fr_referrals", newRefs);

          const updatedUserList = users.map(u => {
            if (u.referralCode === currentUser.referredBy) {
              return {
                ...u,
                referralBonus: Number((u.referralBonus + commission).toFixed(2)),
                balance: Number((u.balance + commission).toFixed(2))
              };
            }
            return u;
          });
          setUsers(updatedUserList);
          syncLocal("fr_users", updatedUserList);

          const refUser = updatedUserList.find(u => u.referralCode === currentUser.referredBy);
          if (refUser) {
            const rNotif: Notification = {
              id: "not_" + Date.now() + "_ref",
              userId: refUser.id,
              title: "Referral Commission Received! 🎁",
              message: `You earned +₦${commission} (5% direct commission) as ${currentUser.name} activated an investment contract!`,
              isRead: false,
              createdAt: new Date().toISOString()
            };
            notifications.unshift(rNotif);
          }
        }
      }

      setCurrentUser(updatedUser);
      syncLocal("fr_current_user", updatedUser);

      const updatedInv = [newInv, ...investments];
      setInvestments(updatedInv);
      syncLocal("fr_investments", updatedInv);

      const newNotif: Notification = {
        id: "not_" + Date.now(),
        userId: currentUser.id,
        title: "Pig/Chicken Investment Activated",
        message: `Successfully locked ₦${amount} into the ${targetPlan.name} program. Maturity yield: ₦${calculatedReturn}.`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      const updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);
      syncLocal("fr_notifications", updatedNotifs);

      const updatedUserList = users.map(u => u.id === currentUser.id ? updatedUser : u);
      setUsers(updatedUserList);
      syncLocal("fr_users", updatedUserList);
      return;
    }

    try {
      const updatedUserBalance = Number((currentUser.balance - amount).toFixed(2));
      const updatedUserInvested = Number((currentUser.totalInvested + amount).toFixed(2));
      
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        currentUser.id,
        {
          balance: updatedUserBalance,
          totalInvested: updatedUserInvested
        }
      );

      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.investments,
        newInv.id,
        newInv
      );

      const notifId = "not_" + Date.now();
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications,
        notifId,
        {
          id: notifId,
          userId: currentUser.id,
          title: "Investment Contract Activated",
          message: `Successfully locked ₦${amount} into the ${targetPlan.name} program. Maturity yield: ₦${calculatedReturn}.`,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      );

      if (currentUser.referredBy) {
        try {
          const referrerQuery = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.users,
            [Query.equal("referralCode", currentUser.referredBy)]
          );
          if (referrerQuery.documents.length > 0) {
            const rDoc = referrerQuery.documents[0] as any as UserProfile;
            const refId = `${rDoc.id}_${currentUser.id}`;
            
            try {
              const refDoc = await databases.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.referrals,
                refId
              );
              const refData = refDoc as any as Referral;
              if (refData.status === "pending") {
                const commission = Number((amount * 0.05).toFixed(2));
                
                await databases.updateDocument(
                  APPWRITE_CONFIG.databaseId,
                  APPWRITE_CONFIG.collections.referrals,
                  refId,
                  {
                    status: "active",
                    commissionPaid: commission
                  }
                );
                
                await databases.updateDocument(
                  APPWRITE_CONFIG.databaseId,
                  APPWRITE_CONFIG.collections.users,
                  rDoc.id,
                  {
                    referralBonus: Number((rDoc.referralBonus + commission).toFixed(2)),
                    balance: Number((rDoc.balance + commission).toFixed(2))
                  }
                );

                const rNotifId = "not_" + Date.now() + "_ref";
                await databases.createDocument(
                  APPWRITE_CONFIG.databaseId,
                  APPWRITE_CONFIG.collections.notifications,
                  rNotifId,
                  {
                    id: rNotifId,
                    userId: rDoc.id,
                    title: "Referral Commission Received! 🎁",
                    message: `You earned +₦${commission} (5% direct commission) as ${currentUser.name} activated an investment contract!`,
                    isRead: false,
                    createdAt: new Date().toISOString()
                  }
                );
              }
            } catch (err) {
              console.error("Referral payout document adjustment error:", err);
            }
          }
        } catch (err) {
          console.error("Referral query lookup error:", err);
        }
      }
    } catch (err) {
      handleAppwriteError(err, OperationType.WRITE, `investments/${newInv.id}`);
    }
  };

  const createWithdrawal = async (amount: number, accountDetails: string) => {
    if (!currentUser || currentUser.balance < amount) {
      throw new Error("Insufficient portfolio funds to process payout request.");
    }

    const newWth: Withdrawal = {
      id: "wth_" + Date.now(),
      userId: currentUser.id,
      amount,
      accountDetails,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    if (isMockAppwrite) {
      const updatedWth = [newWth, ...withdrawals];
      setWithdrawals(updatedWth);
      syncLocal("fr_withdrawals", updatedWth);

      const newNotif: Notification = {
        id: "not_" + Date.now(),
        userId: currentUser.id,
        title: "Withdrawal Requested",
        message: `Your withdrawal request of ₦${amount} has been submitted with status 'Pending'. Awaiting admin approval.`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      const updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);
      syncLocal("fr_notifications", updatedNotifs);
      return;
    }

    try {
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.withdrawals,
        newWth.id,
        newWth
      );

      const notifId = "not_" + Date.now();
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications,
        notifId,
        {
          id: notifId,
          userId: currentUser.id,
          title: "Withdrawal Requested",
          message: `Your withdrawal request of ₦${amount} has been saved with 'Pending' status.`,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      );
      
      await fetchAllData(currentUser);
    } catch (err) {
      handleAppwriteError(err, OperationType.WRITE, `withdrawals/${newWth.id}`);
    }
  };

  const markNotificationRead = async (id: string) => {
    if (isMockAppwrite) {
      const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
      setNotifications(updated);
      syncLocal("fr_notifications", updated);
      return;
    }
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications,
        id,
        { isRead: true }
      );
    } catch (err) {
      handleAppwriteError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  // Admin database actions
  const approveDeposit = async (id: string) => {
    const target = deposits.find(d => d.id === id);
    if (!target || target.status !== "pending") return;

    if (isMockAppwrite) {
      const updatedDeps = deposits.map(d => d.id === id ? { ...d, status: "approved" as const } : d);
      setDeposits(updatedDeps);
      syncLocal("fr_deposits", updatedDeps);

      const targetUser = users.find(u => u.id === target.userId) || (currentUser?.id === target.userId ? currentUser : null);
      if (targetUser) {
        const updatedTargetUser: UserProfile = {
          ...targetUser,
          balance: Number((targetUser.balance + target.amount).toFixed(2))
        };
        
        if (currentUser && currentUser.id === target.userId) {
          setCurrentUser(updatedTargetUser);
          syncLocal("fr_current_user", updatedTargetUser);
        }
        
        const updatedUserList = users.map(u => u.id === target.userId ? updatedTargetUser : u);
        setUsers(updatedUserList);
        syncLocal("fr_users", updatedUserList);

        const newNotif: Notification = {
          id: "not_" + Date.now(),
          userId: target.userId,
          title: "Deposit Cleared! 💳",
          message: `Your deposit of $${target.amount} is fully approved and credited. Ready to cultivate returns!`,
          isRead: false,
          createdAt: new Date().toISOString()
        };
        const updatedNotifs = [newNotif, ...notifications];
        setNotifications(updatedNotifs);
        syncLocal("fr_notifications", updatedNotifs);
      }
      return;
    }

    try {
      const userDoc = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        target.userId
      );
      const u = userDoc as any as UserProfile;
      const newBalance = Number((u.balance + target.amount).toFixed(2));
      
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.deposits,
        id,
        { status: "approved" }
      );

      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        target.userId,
        { balance: newBalance }
      );

      const notifId = "not_" + Date.now();
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications,
        notifId,
        {
          id: notifId,
          userId: target.userId,
          title: "Deposit Appreciated! 💳",
          message: `Your deposit of $${target.amount} has been cleared. Capital is available in your digital bank roll.`,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      );

      // Force immediate local state synchronization
      if (currentUser) {
        if (target.userId === currentUser.id) {
          const updatedUser = {
            ...currentUser,
            balance: newBalance
          };
          setCurrentUser(updatedUser);
          syncLocal("fr_current_user", updatedUser);
        }
        await fetchAllData(currentUser);
      }
    } catch (err) {
      handleAppwriteError(err, OperationType.UPDATE, `deposits/${id}`);
    }
  };

  const rejectDeposit = async (id: string) => {
    const target = deposits.find(d => d.id === id);
    if (!target || target.status !== "pending") return;

    if (isMockAppwrite) {
      const updatedDeps = deposits.map(d => d.id === id ? { ...d, status: "rejected" as const } : d);
      setDeposits(updatedDeps);
      syncLocal("fr_deposits", updatedDeps);

      const newNotif: Notification = {
        id: "not_" + Date.now(),
        userId: target.userId,
        title: "Deposit Cancelled / Rejected",
        message: `Your deposit submission of ₦${target.amount} was cancelled. Check with admin support.`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      const updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);
      syncLocal("fr_notifications", updatedNotifs);
      return;
    }

    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.deposits,
        id,
        { status: "rejected" }
      );

      const notifId = "not_" + Date.now();
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications,
        notifId,
        {
          id: notifId,
          userId: target.userId,
          title: "Deposit Rejected",
          message: `Your deposit transaction of ₦${target.amount} has been rejected by administration.`,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      );

      // Force immediate local state synchronization
      if (currentUser) {
        await fetchAllData(currentUser);
      }
    } catch (err) {
      handleAppwriteError(err, OperationType.UPDATE, `deposits/${id}`);
    }
  };

  const approveWithdrawal = async (id: string) => {
    const target = withdrawals.find(w => w.id === id);
    if (!target || target.status !== "pending") return;

    if (isMockAppwrite) {
      const targetUser = users.find(u => u.id === target.userId) || (currentUser?.id === target.userId ? currentUser : null);
      if (!targetUser) {
        alert("Owner of this payout ticket was not found.");
        return;
      }
      if (targetUser.balance < target.amount) {
        alert(`Insufficient balance: Target user has ₦${targetUser.balance}, requested ₦${target.amount}.`);
        return;
      }

      const updatedUser: UserProfile = {
        ...targetUser,
        balance: Number((targetUser.balance - target.amount).toFixed(2))
      };

      if (currentUser && currentUser.id === target.userId) {
        setCurrentUser(updatedUser);
        syncLocal("fr_current_user", updatedUser);
      }

      const updatedUserList = users.map(u => u.id === target.userId ? updatedUser : u);
      setUsers(updatedUserList);
      syncLocal("fr_users", updatedUserList);

      const updatedWths = withdrawals.map(w => w.id === id ? { ...w, status: "approved" as const } : w);
      setWithdrawals(updatedWths);
      syncLocal("fr_withdrawals", updatedWths);

      const newNotif: Notification = {
        id: "not_" + Date.now(),
        userId: target.userId,
        title: "Withdrawal Approved! 🏦",
        message: `Your cash payout of ₦${target.amount} has been approved and successfully dispatched to: ${target.accountDetails}. Wallet balance reduced.`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      const updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);
      syncLocal("fr_notifications", updatedNotifs);
      return;
    }

    try {
      const userDoc = await databases.getDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        target.userId
      );
      const u = userDoc as any as UserProfile;
      if (u.balance < target.amount) {
        throw new Error(`Insufficient wallet balance on user profile to discharge withdrawal.`);
      }

      const updatedBalance = Number((u.balance - target.amount).toFixed(2));

      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        target.userId,
        {
          balance: updatedBalance
        }
      );

      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.withdrawals,
        id,
        { status: "approved" }
      );

      const notifId = "not_" + Date.now();
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications,
        notifId,
        {
          id: notifId,
          userId: target.userId,
          title: "Withdrawal Sent! 🏦",
          message: `Our payout department approved and processed your cash withdrawal of ₦${target.amount}.`,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      );

      // Force immediate local state synchronization
      if (currentUser) {
        await fetchAllData(currentUser);
      }
    } catch (err: any) {
      handleAppwriteError(err, OperationType.UPDATE, `withdrawals/${id}`);
      alert(`Approval error: ${err.message || String(err)}`);
    }
  };

  const rejectWithdrawal = async (id: string) => {
    const target = withdrawals.find(w => w.id === id);
    if (!target || target.status !== "pending") return;

    if (isMockAppwrite) {
      const updatedWths = withdrawals.map(w => w.id === id ? { ...w, status: "rejected" as const } : w);
      setWithdrawals(updatedWths);
      syncLocal("fr_withdrawals", updatedWths);

      const newNotif: Notification = {
        id: "not_" + Date.now(),
        userId: target.userId,
        title: "Withdrawal Request Rejected",
        message: `Your withdrawal of ₦${target.amount} was rejected by administration. No funds were debited from your profile.`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      const updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);
      syncLocal("fr_notifications", updatedNotifs);
      return;
    }

    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.withdrawals,
        id,
        { status: "rejected" }
      );

      const notifId = "not_" + Date.now();
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications,
        notifId,
        {
          id: notifId,
          userId: target.userId,
          title: "Withdrawal Rejected",
          message: `Your withdrawal of ₦${target.amount} was rejected by administration. No funds were debited from your profile.`,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      );

      // Force immediate local state synchronization
      if (currentUser) {
        await fetchAllData(currentUser);
      }
    } catch (err) {
      handleAppwriteError(err, OperationType.UPDATE, `withdrawals/${id}`);
    }
  };

  const createOrUpdatePlan = async (plan: InvestmentPlan) => {
    if (isMockAppwrite) {
      const existing = plans.some(p => p.id === plan.id);
      let updated;
      if (existing) {
        updated = plans.map(p => p.id === plan.id ? plan : p);
      } else {
        updated = [...plans, plan];
      }
      setPlans(updated);
      syncLocal("fr_plans", updated);
      return;
    }
    try {
      try {
        await databases.getDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.plans, plan.id);
        await databases.updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.plans, plan.id, plan);
      } catch {
        await databases.createDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.collections.plans, plan.id, plan);
      }
    } catch (err) {
      handleAppwriteError(err, OperationType.WRITE, `plans/${plan.id}`);
    }
  };

  const deletePlan = async (id: string) => {
    if (isMockAppwrite) {
      const updated = plans.filter(p => p.id !== id);
      setPlans(updated);
      syncLocal("fr_plans", updated);
      return;
    }
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.plans,
        id,
        { status: "inactive" }
      );
    } catch (err) {
      handleAppwriteError(err, OperationType.DELETE, `plans/${id}`);
    }
  };

  const createFarmUpdate = async (title: string, content: string, type: "Chicken" | "Pig" | "General", imageUrl: string, videoUrl?: string) => {
    const newUpdate: FarmUpdate = {
      id: "upd_" + Date.now(),
      title,
      content,
      type,
      imageUrl,
      videoUrl,
      createdAt: new Date().toISOString()
    };

    if (isMockAppwrite) {
      const updated = [newUpdate, ...farmUpdates];
      setFarmUpdates(updated);
      syncLocal("fr_updates", updated);
      return;
    }

    try {
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.farmUpdates,
        newUpdate.id,
        newUpdate
      );
      const updated = [newUpdate, ...farmUpdates];
      setFarmUpdates(updated);
    } catch (err) {
      if (newUpdate.videoUrl) {
        try {
          const fallbackDoc = { ...newUpdate };
          delete fallbackDoc.videoUrl;
          await databases.createDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.farmUpdates,
            newUpdate.id,
            fallbackDoc
          );
          const updated = [newUpdate, ...farmUpdates];
          setFarmUpdates(updated);
          return;
        } catch (innerErr) {
          handleAppwriteError(innerErr, OperationType.CREATE, `farmUpdates/${newUpdate.id}`);
          throw innerErr;
        }
      }
      handleAppwriteError(err, OperationType.CREATE, `farmUpdates/${newUpdate.id}`);
      throw err;
    }
  };

  const editFarmUpdate = async (id: string, title: string, content: string, type: "Chicken" | "Pig" | "General", imageUrl: string, videoUrl?: string) => {
    if (isMockAppwrite) {
      const updated = farmUpdates.map(u => u.id === id ? { ...u, title, content, type, imageUrl, videoUrl } : u);
      setFarmUpdates(updated);
      syncLocal("fr_updates", updated);
      return;
    }
    try {
      const payload: any = { title, content, type, imageUrl };
      if (videoUrl !== undefined) {
        payload.videoUrl = videoUrl;
      }
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.farmUpdates,
        id,
        payload
      );
      const updated = farmUpdates.map(u => u.id === id ? { ...u, title, content, type, imageUrl, videoUrl } : u);
      setFarmUpdates(updated);
    } catch (err) {
      handleAppwriteError(err, OperationType.UPDATE, `farmUpdates/${id}`);
      throw err;
    }
  };

  const deleteFarmUpdate = async (id: string) => {
    if (isMockAppwrite) {
      const updated = farmUpdates.filter(u => u.id !== id);
      setFarmUpdates(updated);
      syncLocal("fr_updates", updated);
      return;
    }
    try {
      await databases.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.farmUpdates,
        id
      );
      const updated = farmUpdates.filter(u => u.id !== id);
      setFarmUpdates(updated);
    } catch (err) {
      handleAppwriteError(err, OperationType.DELETE, `farmUpdates/${id}`);
      throw err;
    }
  };

  const banUser = async (userId: string, isBanned: boolean) => {
    if (isMockAppwrite) {
      const updated = users.map(u => u.id === userId ? { ...u, isBanned } : u);
      setUsers(updated);
      syncLocal("fr_users", updated);
      if (currentUser?.id === userId) {
        const updatedCurrentUser = { ...currentUser, isBanned };
        setCurrentUser(updatedCurrentUser);
        syncLocal("fr_current_user", updatedCurrentUser);
      }
      return;
    }
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        userId,
        { isBanned }
      );
      const updatedUsers = users.map(u => u.id === userId ? { ...u, isBanned } : u);
      setUsers(updatedUsers);
      
      if (currentUser?.id === userId) {
        const updatedCurrentUser = { ...currentUser, isBanned };
        setCurrentUser(updatedCurrentUser);
        syncLocal("fr_current_user", updatedCurrentUser);
      }
    } catch (err) {
      handleAppwriteError(err, OperationType.UPDATE, `users/${userId}`);
      throw err;
    }
  };

  const sendBroadcastNotification = async (title: string, message: string, targetUserId: string) => {
    const newNotif: Notification = {
      id: "not_" + Date.now(),
      userId: targetUserId,
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    if (isMockAppwrite) {
      const updated = [newNotif, ...notifications];
      setNotifications(updated);
      syncLocal("fr_notifications", updated);
      return;
    }

    try {
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications,
        newNotif.id,
        newNotif
      );
    } catch (err) {
      handleAppwriteError(err, OperationType.CREATE, `notifications/${newNotif.id}`);
    }
  };

  const toggleAdminMode = () => {
    setIsAdminMode(prev => !prev);
  };

  const quickAddFunds = async (amount: number) => {
    if (!currentUser) return;
    const updatedUser: UserProfile = {
      ...currentUser,
      balance: Number((currentUser.balance + amount).toFixed(2))
    };
    setCurrentUser(updatedUser);
    syncLocal("fr_current_user", updatedUser);

    const updatedUserList = users.map(u => u.id === currentUser.id ? updatedUser : u);
    setUsers(updatedUserList);
    syncLocal("fr_users", updatedUserList);

    if (!isMockAppwrite) {
      try {
        await databases.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.users,
          currentUser.id,
          {
            balance: Number((currentUser.balance + amount).toFixed(2))
          }
        );
      } catch (err) {
        handleAppwriteError(err, OperationType.UPDATE, `users/${currentUser.id}`);
      }
    }
  };

  const withdrawMaturedInvestment = async (id: string) => {
    if (!currentUser) return;
    const target = investments.find(i => i.id === id);
    if (!target) {
      throw new Error("Active investment plan not found.");
    }
    
    const now = new Date();
    const maturesDate = new Date(target.maturesAt);
    if (now < maturesDate) {
      throw new Error("This organic investment plan has not matured yet.");
    }
    if (target.status !== "active") {
      throw new Error("This investment harvest has already been withdrawn.");
    }

    const updatedReturn = target.expectedReturn;
    const netEarnings = target.expectedReturn - target.amount;

    const newUserVal: UserProfile = {
      ...currentUser,
      balance: Number((currentUser.balance + updatedReturn).toFixed(2)),
      totalInvested: Number((currentUser.totalInvested - target.amount).toFixed(2)),
      totalEarnings: Number((currentUser.totalEarnings + netEarnings).toFixed(2))
    };

    const updatedInvs = investments.map(i => i.id === id ? { ...i, status: "matured" as const } : i);

    if (isMockAppwrite) {
      setCurrentUser(newUserVal);
      syncLocal("fr_current_user", newUserVal);

      setInvestments(updatedInvs);
      syncLocal("fr_investments", updatedInvs);

      const updatedUserList = users.map(u => u.id === currentUser.id ? newUserVal : u);
      setUsers(updatedUserList);
      syncLocal("fr_users", updatedUserList);

      const mNotif: Notification = {
        id: "not_" + Date.now(),
        userId: currentUser.id,
        title: "Contract Harvest Disbursed! 🌾",
        message: `Successfully completed withdrawal of ₦${updatedReturn.toLocaleString()} from ${target.planName} contract to your wallet balance.`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      const updatedNotifs = [mNotif, ...notifications];
      setNotifications(updatedNotifs);
      syncLocal("fr_notifications", updatedNotifs);
      return;
    }

    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.investments,
        id,
        { status: "matured" }
      );

      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        currentUser.id,
        {
          balance: newUserVal.balance,
          totalInvested: newUserVal.totalInvested,
          totalEarnings: newUserVal.totalEarnings
        }
      );

      const notId = "not_" + Date.now();
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications,
        notId,
        {
          id: notId,
          userId: currentUser.id,
          title: "Contract Harvest Disbursed! 🌾",
          message: `Successfully completed withdrawal of ₦${updatedReturn.toLocaleString()} from ${target.planName} contract to your wallet balance.`,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      );

      await fetchAllData(currentUser);
    } catch (err) {
      handleAppwriteError(err, OperationType.UPDATE, `investments/${id}`);
      throw err;
    }
  };

  const triggerMaturityCheck = async () => {
    if (!currentUser) return;
    const now = new Date();
    let updatedNeeded = false;

    const processedInvestments = investments.map(inv => {
      const maturesDate = new Date(inv.maturesAt);
      if (inv.status === "active" && now >= maturesDate) {
        updatedNeeded = true;
        return { ...inv, status: "matured" as const };
      }
      return inv;
    });

    if (!updatedNeeded) {
      alert("All investment records are already synchronized and checked for maturity constraints.");
      return;
    }

    let addedBalance = 0;
    let addedEarnings = 0;
    let deductedInvested = 0;

    investments.forEach(inv => {
      const maturesDate = new Date(inv.maturesAt);
      if (inv.status === "active" && now >= maturesDate) {
        addedBalance += inv.expectedReturn;
        addedEarnings += (inv.expectedReturn - inv.amount);
        deductedInvested += inv.amount;
      }
    });

    const updatedUser: UserProfile = {
      ...currentUser,
      balance: Number((currentUser.balance + addedBalance).toFixed(2)),
      totalInvested: Number((currentUser.totalInvested - deductedInvested).toFixed(2)),
      totalEarnings: Number((currentUser.totalEarnings + addedEarnings).toFixed(2))
    };

    if (isMockAppwrite) {
      setCurrentUser(updatedUser);
      syncLocal("fr_current_user", updatedUser);

      setInvestments(processedInvestments);
      syncLocal("fr_investments", processedInvestments);

      const updatedUserList = users.map(u => u.id === currentUser.id ? updatedUser : u);
      setUsers(updatedUserList);
      syncLocal("fr_users", updatedUserList);

      const premiumNotif: Notification = {
        id: "not_" + Date.now(),
        userId: currentUser.id,
        title: "Investment Cycle Complete! 🎉",
        message: `Your agricultural sponsorship matured! Spawning +₦${addedBalance} back into your live balance ledger.`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      const updatedNotifs = [premiumNotif, ...notifications];
      setNotifications(updatedNotifs);
      syncLocal("fr_notifications", updatedNotifs);
      
      alert(`Maturity trigger processed. Sponsored crops matured! Credited +₦${addedBalance.toFixed(2)} back.`);
      return;
    }

    try {
      // Process sequential updates
      for (const inv of investments) {
        const maturesDate = new Date(inv.maturesAt);
        if (inv.status === "active" && now >= maturesDate) {
          await databases.updateDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.investments,
            inv.id,
            { status: "matured" }
          );
        }
      }

      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        currentUser.id,
        {
          balance: updatedUser.balance,
          totalInvested: updatedUser.totalInvested,
          totalEarnings: updatedUser.totalEarnings
        }
      );

      const notId = "not_" + Date.now();
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.notifications,
        notId,
        {
          id: notId,
          userId: currentUser.id,
          title: "Investment Cycle Complete! 🎉",
          message: `Your agricultural sponsorship has matured! Credited +₦${addedBalance} back into your balance ledger.`,
          isRead: false,
          createdAt: new Date().toISOString()
        }
      );

      alert(`Appwrite records processed successfully. Credited +₦${addedBalance} total return.`);
    } catch (err) {
      handleAppwriteError(err, OperationType.WRITE, `investments_maturity_payout`);
    }
  };

  return (
    <FarmProviderValue {...{
      currentUser, plans, deposits, investments, withdrawals, notifications, 
      farmUpdates, users, referrals, currentPage, selectedPlan, loading, isAdminMode,
      loginWithEmail, registerWithEmail, logout, navigate, forgotPassword,
      createDeposit, createInvestment, withdrawMaturedInvestment, createWithdrawal, markNotificationRead,
      approveDeposit, rejectDeposit, approveWithdrawal, rejectWithdrawal,
      createOrUpdatePlan, deletePlan, createFarmUpdate, editFarmUpdate, deleteFarmUpdate, banUser, sendBroadcastNotification,
      toggleAdminMode, quickAddFunds, triggerMaturityCheck, children
    }} />
  );
};

// Value binder helper
const FarmProviderValue: React.FC<any> = ({ children, ...value }) => {
  return (
    <FarmContext.Provider value={value}>
      {children}
    </FarmContext.Provider>
  );
};

export const useFarm = () => {
  const context = useContext(FarmContext);
  if (context === undefined) {
    throw new Error("useFarm must be evaluated within a FarmProvider layout wrapper.");
  }
  return context;
};
