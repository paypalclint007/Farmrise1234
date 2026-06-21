import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  UserProfile, Deposit, InvestmentPlan, ActiveInvestment, 
  FarmUpdate, Withdrawal, Notification, Referral, LivestockCategory 
} from "../types";
import { 
  client, account, databases, realtimeClient, APPWRITE_CONFIG, isMockAppwrite, handleAppwriteError, OperationType 
} from "../appwrite";
import { ID, Query } from "appwrite";

import { onSnapshot, collection, query, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType as FirebaseOperationType } from "../firebase";

import { 
  playNotificationChime, 
  requestBrowserNotificationPermission, 
  sendBrowserPushNotification 
} from "../utils/notifications";

interface FarmContextType {
  currentUser: UserProfile | null;
  plans: InvestmentPlan[];
  categories: LivestockCategory[];
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
  connectionError: string | null;
  reconnectAppwrite: () => Promise<void>;
  
  // Auth actions
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, phoneNumber: string, referredCode?: string, onStatusChange?: (status: string) => void) => Promise<void>;
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
  createOrUpdateCategory: (category: LivestockCategory) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  createFarmUpdate: (title: string, content: string, category: "Chicken" | "Pig" | "General", imageUrl: string, videoUrl?: string) => Promise<void>;
  editFarmUpdate: (id: string, title: string, content: string, category: "Chicken" | "Pig" | "General", imageUrl: string, videoUrl?: string) => Promise<void>;
  deleteFarmUpdate: (id: string) => Promise<void>;
  banUser: (userId: string, isBanned: boolean) => Promise<void>;
  sendBroadcastNotification: (title: string, message: string, targetUserId: string) => Promise<void>;
  toggleAdminMode: () => void;
  quickAddFunds: (amount: number) => Promise<void>;
  triggerMaturityCheck: () => Promise<void>;
  adjustUserWallet: (userId: string, fields: Partial<UserProfile>) => Promise<void>;
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

const mapCategoryFromDoc = (doc: any): LivestockCategory => ({
  id: doc.$id || doc.id,
  name: doc.name || "",
  type: doc.type || "",
  imageUrl: doc.imageUrl || "",
  description: doc.description || "",
  emoji: doc.emoji || ""
});

const mapCategoryToDoc = (cat: LivestockCategory) => ({
  name: cat.name,
  type: cat.type,
  imageUrl: cat.imageUrl,
  description: cat.description,
  emoji: cat.emoji
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

const DEFAULT_CATEGORIES: LivestockCategory[] = [
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

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<InvestmentPlan[]>(DEFAULT_PLANS);
  const [categories, setCategories] = useState<LivestockCategory[]>(DEFAULT_CATEGORIES);
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMockSync, setIsMockSync] = useState<boolean>(isMockAppwrite);

  // System sound alert tracking refs to prevent duplicate triggers on initial pull
  const isFirstLoadRef = useRef(true);
  const mountTimeRef = useRef(Date.now() + 5000); // 5 seconds grace delay backstop on app boot
  const prevNotificationIdsRef = useRef<string[]>([]);
  const prevPendingDepositIdsRef = useRef<string[]>([]);
  const prevPendingWithdrawIdsRef = useRef<string[]>([]);
  const prevReferralIdsRef = useRef<string[]>([]);

  // Automated background sound alarm & push alert monitor for Chrome & PWA
  useEffect(() => {
    if (!currentUser) {
      isFirstLoadRef.current = true;
      return;
    }

    const currentNotifIds = notifications.map(n => n.id);
    const currentPendingDepositIds = deposits.filter(d => d.status === "pending").map(d => d.id);
    const currentPendingWithdrawIds = withdrawals.filter(w => w.status === "pending").map(w => w.id);
    const currentReferralIds = referrals.map(r => r.id);

    // Filter out initial load to avoid alarm blast on session login
    const isAnyActiveData = notifications.length > 0 || deposits.length > 0 || withdrawals.length > 0 || referrals.length > 0;
    if (isFirstLoadRef.current && isAnyActiveData) {
      prevNotificationIdsRef.current = currentNotifIds;
      prevPendingDepositIdsRef.current = currentPendingDepositIds;
      prevPendingWithdrawIdsRef.current = currentPendingWithdrawIds;
      prevReferralIdsRef.current = currentReferralIds;
      isFirstLoadRef.current = false;
      return;
    }

    // A. Monitor newborn notifications (crop maturation, cycle milestones, admin approvals)
    notifications.forEach(notif => {
      if (!prevNotificationIdsRef.current.includes(notif.id)) {
        const timestamp = notif.createdAt ? new Date(notif.createdAt).getTime() : Date.now();
        if (timestamp > mountTimeRef.current - 10000) {
          const textToSearch = (notif.title + " " + notif.message).toLowerCase();
          const isMilestone = /complete|mature|milestone|incubation/i.test(textToSearch);
          const isSuccess = /credit|approve|deposit successful|success/i.test(textToSearch);

          let alertSound: "general" | "success" | "milestone" = "general";
          if (isMilestone) alertSound = "milestone";
          else if (isSuccess) alertSound = "success";

          sendBrowserPushNotification(notif.title, notif.message, alertSound);
        }
      }
    });

    // B. Monitor administrative tasks in real-time
    if (currentUser.isAdmin) {
      // New deposits submitted by users
      deposits.forEach(dep => {
        if (dep.status === "pending" && !prevPendingDepositIdsRef.current.includes(dep.id)) {
          const timestamp = dep.createdAt ? new Date(dep.createdAt).getTime() : Date.now();
          if (timestamp > mountTimeRef.current - 10000) {
            sendBrowserPushNotification(
              "📥 New Audit Deposit Receipt Received!",
              `A sponsor submitted a wire transfer slip of NGN ₦${dep.amount.toLocaleString()} for approval.`,
              "admin"
            );
          }
        }
      });

      // New withdrawals requested by users
      withdrawals.forEach(wth => {
        if (wth.status === "pending" && !prevPendingWithdrawIdsRef.current.includes(wth.id)) {
          const timestamp = wth.createdAt ? new Date(wth.createdAt).getTime() : Date.now();
          if (timestamp > mountTimeRef.current - 10000) {
            sendBrowserPushNotification(
              "📤 New Payout Withdrawal Request Filed!",
              `A sponsor requested payout of NGN ₦${wth.amount.toLocaleString()} to their bank account.`,
              "admin"
            );
          }
        }
      });

      // New partner signup via referral
      referrals.forEach(ref => {
        if (!prevReferralIdsRef.current.includes(ref.id)) {
          const timestamp = ref.createdAt ? new Date(ref.createdAt).getTime() : Date.now();
          if (timestamp > mountTimeRef.current - 10000) {
            sendBrowserPushNotification(
              "🎁 New Referral Partnership Invited!",
              `A new sponsor, ${ref.referredName}, signed up using partner referral code: ${ref.referrerCode}.`,
              "admin"
            );
          }
        }
      });
    }

    // Keep state lists tracked smoothly in memory
    prevNotificationIdsRef.current = currentNotifIds;
    prevPendingDepositIdsRef.current = currentPendingDepositIds;
    prevPendingWithdrawIdsRef.current = currentPendingWithdrawIds;
    prevReferralIdsRef.current = currentReferralIds;
  }, [notifications, deposits, withdrawals, referrals, currentUser]);

  // Sync state to local storage in mock mode
  const syncLocal = (key: string, data: any) => {
    if (isMockAppwrite) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  const checkSession = async () => {
    try {
      setConnectionError(null);
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
        let initialPage = "login";
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const hasRef = params.get("ref") || params.get("referredCode") || params.get("code");
          if (hasRef) {
            initialPage = "register";
          }
        }
        setCurrentPage(initialPage);
      }
    } catch (err: any) {
      const isGuestError = err.code === 401 || 
        err.message?.toLowerCase().includes("guests") || 
        err.message?.toLowerCase().includes("missing scopes") || 
        err.message?.toLowerCase().includes("unauthorized") ||
        err.message?.toLowerCase().includes("please sign in") ||
        err.message?.toLowerCase().includes("no active session");

      if (isGuestError) {
        console.log("No active Appwrite session (user is guest). Re-routing to entry page.");
      } else {
        console.error("Appwrite connection check or authentication failure:", err);
      }
      const isNetworkError = !isGuestError && (
        err.message?.toLowerCase().includes("failed to fetch") || 
        err.name === "TypeError" || 
        err.code === 0 || 
        err.status === 0 || 
        err.message?.toLowerCase().includes("network") ||
        err.message?.toLowerCase().includes("cors")
      );

      if (isNetworkError) {
        setConnectionError(err.message || "Failed to establish secure Appwrite connection.");
      } else {
        setConnectionError(null);
      }
      setCurrentUser(null);
      let initialPage = "login";
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const hasRef = params.get("ref") || params.get("referredCode") || params.get("code");
        if (hasRef) {
          initialPage = "register";
        }
      }
      setCurrentPage(initialPage);
    } finally {
      setLoading(false);
    }
  };

  const reconnectAppwrite = async () => {
    setLoading(true);
    await checkSession();
  };

  // 1. Initial configuration check & Local state loading
  useEffect(() => {
    const initConfig = async () => {
      try {
        const res = await fetch("/api/appwrite/config");
        if (res.ok) {
          const cfg = await res.json();
          if (cfg && cfg.projectId && !cfg.useMock) {
            const { reconfigureAppwrite } = await import("../appwrite");
            reconfigureAppwrite(cfg);
            setIsMockSync(false);
          }
        }
      } catch (err) {
        console.warn("Could not retrieve remote appwrite config, falling back to compiled/local:", err);
      }

      // Re-import isMockAppwrite to get its latest live bound value
      const { isMockAppwrite: currentMockState } = await import("../appwrite");
      if (currentMockState) {
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

        const storedCategories = localStorage.getItem("fr_categories");
        if (storedCategories) setCategories(JSON.parse(storedCategories));
        else localStorage.setItem("fr_categories", JSON.stringify(DEFAULT_CATEGORIES));

        if (storedDeposits) setDeposits(JSON.parse(storedDeposits));
        if (storedInvestments) setInvestments(JSON.parse(storedInvestments));
        if (storedWithdrawals) setWithdrawals(JSON.parse(storedWithdrawals));
        if (storedUpdates) setFarmUpdates(JSON.parse(storedUpdates));
        else localStorage.setItem("fr_updates", JSON.stringify(DEFAULT_UPDATES));

        if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
        
        let uniqueLoadedUsers: UserProfile[] = [];
        if (storedUsers) {
          try {
            const parsedUsers = JSON.parse(storedUsers);
            if (Array.isArray(parsedUsers)) {
              const uMap = new Map<string, UserProfile>();
              parsedUsers.forEach((u: any) => {
                if (u && u.email) {
                  const key = u.email.toLowerCase().trim();
                  if (key !== "") {
                    uMap.set(key, u);
                  }
                }
              });
              uniqueLoadedUsers = Array.from(uMap.values());
            }
          } catch (e) {
            console.warn("Deduplicating initial users parsed error", e);
          }
        }
        setUsers(uniqueLoadedUsers);
        
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
            let initialPage = "login";
            if (typeof window !== "undefined") {
              const params = new URLSearchParams(window.location.search);
              const hasRef = params.get("ref") || params.get("referredCode") || params.get("code");
              if (hasRef) {
                initialPage = "register";
              }
            }
            setCurrentPage(initialPage);
          }
        }, 1500);
      } else {
        await checkSession();
      }
    };

    initConfig();
  }, []);

  // Helper to safely list documents and fallback to client-side filtering on index errors
  const safeFetchCollectionOuter = async (collectionId: string, queries: any[] = [], overrideProfile?: UserProfile): Promise<any[]> => {
    const profile = overrideProfile || currentUser;
    const getCollectionFallback = (collId: string): any[] => {
      try {
        if (typeof window === "undefined") return [];
        if (collId === APPWRITE_CONFIG.collections.plans) {
          return DEFAULT_PLANS;
        }
        if (collId === APPWRITE_CONFIG.collections.farmUpdates) {
          return DEFAULT_UPDATES;
        }
        if (collId === APPWRITE_CONFIG.collections.deposits) {
          const list = JSON.parse(localStorage.getItem("fr_deposits") || "[]");
          return profile?.isAdmin ? list : list.filter((d: any) => d.userId === profile?.id);
        }
        if (collId === APPWRITE_CONFIG.collections.investments) {
          const list = JSON.parse(localStorage.getItem("fr_investments") || "[]");
          return profile?.isAdmin ? list : list.filter((i: any) => i.userId === profile?.id);
        }
        if (collId === APPWRITE_CONFIG.collections.withdrawals) {
          const list = JSON.parse(localStorage.getItem("fr_withdrawals") || "[]");
          return profile?.isAdmin ? list : list.filter((w: any) => w.userId === profile?.id);
        }
        if (collId === APPWRITE_CONFIG.collections.referrals) {
          const list = JSON.parse(localStorage.getItem("fr_referrals") || "[]");
          return profile?.isAdmin ? list : list.filter((r: any) => r.referrerId === profile?.id || r.referrerId === `code_${profile?.referralCode?.toUpperCase()}` || r.referrerCode?.toUpperCase() === profile?.referralCode?.toUpperCase());
        }
        if (collId === APPWRITE_CONFIG.collections.notifications) {
          const list = JSON.parse(localStorage.getItem("fr_notifications") || "[]");
          return list.filter((n: any) => n.userId === "all" || n.userId === profile?.id);
        }
        if (collId === APPWRITE_CONFIG.collections.users) {
          return JSON.parse(localStorage.getItem("fr_users") || "[]");
        }
      } catch (err) {
        console.warn("Error loading fallback list for collection: " + collId, err);
      }
      return [];
    };

    try {
      // Enforce Query.limit(5000) to ensure the client/admin fetches everything, skipping default Appwrite 25 count cap
      const finalQueries = [...queries];
      const hasLimit = queries.some(q => q && typeof q === "string" && q.includes("limit"));
      if (!hasLimit) {
        finalQueries.push(Query.limit(5000));
      }

      const res = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        collectionId,
        finalQueries
      );
      return res.documents;
    } catch (err: any) {
      const errMsg = err.message || "";
      const isAuthError = err.code === 401 || err.code === 403 || errMsg.toLowerCase().includes("unauthorized") || errMsg.toLowerCase().includes("not authorized");
      const isIndexError = errMsg.toLowerCase().includes("index") || 
                           errMsg.toLowerCase().includes("not found") || 
                           err.code === 400;
      
      if (isIndexError && queries.length > 0) {
        console.warn(`Appwrite index error on collection "${collectionId}" with queries:`, queries, ". Falling back to secure client-side filter.");
        try {
          const fallbackRes = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId,
            collectionId,
            [Query.limit(5000)] // no queries - fetch all up to 5000
          );
          let docs = fallbackRes.documents;
          
          for (const q of queries) {
            if (q) {
              let attr: string = "";
              let method: string = "equal";
              let target: any = undefined;

              if (typeof q === "object") {
                attr = q.attribute || q.key || "";
                method = q.method || q.operator || "equal";
                const values = q.values || q.value;
                target = Array.isArray(values) ? values[0] : values;
              } else if (typeof q === "string") {
                try {
                  const methodMatch = q.match(/^(\w+)\(/);
                  if (methodMatch) {
                    method = methodMatch[1];
                  }
                  const partsMatch = q.match(/^\w+\("([^"]+)"\s*,\s*(.+)\)$/);
                  if (partsMatch) {
                    attr = partsMatch[1];
                    let rawVal = partsMatch[2].trim();
                    if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
                      rawVal = rawVal.slice(1, -1).trim();
                    }
                    if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
                      rawVal = rawVal.slice(1, -1);
                    }
                    target = rawVal;
                  }
                } catch (e) {
                  console.warn("Regex parse of query string failed:", q, e);
                }
              }

              if (attr && target !== undefined) {
                const upperMethod = method.toLowerCase();
                if (upperMethod === "equal" || upperMethod === "contains") {
                  docs = docs.filter((d: any) => String(d[attr]).toUpperCase() === String(target).toUpperCase());
                } else if (upperMethod === "notequal") {
                  docs = docs.filter((d: any) => String(d[attr]).toUpperCase() !== String(target).toUpperCase());
                }
              }
            }
          }
          return docs;
        } catch (fallbackErr: any) {
          console.warn(`Total fallback fetch failure for collection "${collectionId}":`, fallbackErr);
          return getCollectionFallback(collectionId);
        }
      }

      if (isAuthError) {
        console.warn(`Access check: Appwrite collection "${collectionId}" query unauthorized or permission restricted. Operating under client sandbox context.`);
        return getCollectionFallback(collectionId);
      }
      
      console.warn(`Warning: Fetch documents failed for collection "${collectionId}" (${err.message || String(err)}). Reverting to local state.`);
      return getCollectionFallback(collectionId);
    }
  };

  // Fetch real Appwrite Database lists during active sessions
  const fetchAllData = async (userProfile: UserProfile) => {
    if (isMockAppwrite) return;

    // Inside fetchAllData we proxy to outer safeFetchCollectionOuter
    const safeFetchCollection = async (collectionId: string, queries: any[] = []): Promise<any[]> => {
      return safeFetchCollectionOuter(collectionId, queries, userProfile);
    };

    // Load Plans
    try {
      const documents = await safeFetchCollection(APPWRITE_CONFIG.collections.plans);
      const fetchedPlans = documents.map(mapPlanFromDoc);
      if (fetchedPlans.length > 0) {
        setPlans(fetchedPlans);
        try {
          localStorage.setItem("fr_plans", JSON.stringify(fetchedPlans));
        } catch (err) {
          console.warn("localStorage push fail for plans", err);
        }
      }
    } catch (e) {
      console.warn("Error processing plans:", e);
    }

    // Load Categories
    try {
      const documents = await safeFetchCollection("categories", [Query.limit(100)]);
      const fetchedCats = documents.map(mapCategoryFromDoc);
      if (fetchedCats.length > 0) {
        setCategories(fetchedCats);
        try {
          localStorage.setItem("fr_categories", JSON.stringify(fetchedCats));
        } catch (err) {
          console.warn("localStorage push fail for categories", err);
        }
      }
    } catch (e) {
      console.warn("Error processing categories loaded:", e);
    }

    // Load Updates
    try {
      const documents = await safeFetchCollection(APPWRITE_CONFIG.collections.farmUpdates);
      const fetchedUpdates = documents.map(mapFarmUpdateFromDoc);
      if (fetchedUpdates.length > 0) {
        const sortedUpdates = fetchedUpdates.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFarmUpdates(sortedUpdates);
        try {
          localStorage.setItem("fr_updates", JSON.stringify(sortedUpdates));
        } catch (err) {
          console.warn("localStorage push fail for Updates", err);
        }
      }
    } catch (e) {
      console.warn("Error processing farm updates:", e);
    }

    // Load Deposits
    try {
      const documents = await safeFetchCollection(
        APPWRITE_CONFIG.collections.deposits,
        userProfile.isAdmin ? [] : [Query.equal("userId", userProfile.id)]
      );
      const mappedDeposits = documents.map(mapDepositFromDoc);
      setDeposits(mappedDeposits);
      
      try {
        if (userProfile.isAdmin) {
          localStorage.setItem("fr_deposits", JSON.stringify(mappedDeposits));
        } else {
          // Merge client-local cache
          const cached = JSON.parse(localStorage.getItem("fr_deposits") || "[]");
          const rest = cached.filter((c: any) => c.userId !== userProfile.id);
          localStorage.setItem("fr_deposits", JSON.stringify([...mappedDeposits, ...rest]));
        }
      } catch (err) {
        console.warn("localStorage push fail for Deposits", err);
      }
    } catch (e) {
      console.warn("Error processing deposits:", e);
    }

    // Load Investments (only if mock, otherwise handled by real-time onSnapshot)
    if (isMockAppwrite) {
      try {
        const documents = await safeFetchCollection(
          APPWRITE_CONFIG.collections.investments,
          userProfile.isAdmin ? [] : [Query.equal("userId", userProfile.id)]
        );
        const mappedInvestments = documents.map(mapInvestmentFromDoc);
        setInvestments(mappedInvestments);
        
        try {
          if (userProfile.isAdmin) {
            localStorage.setItem("fr_investments", JSON.stringify(mappedInvestments));
          } else {
            const cached = JSON.parse(localStorage.getItem("fr_investments") || "[]");
            const rest = cached.filter((c: any) => c.userId !== userProfile.id);
            localStorage.setItem("fr_investments", JSON.stringify([...mappedInvestments, ...rest]));
          }
        } catch (err) {
          console.warn("localStorage push fail for Investments", err);
        }
      } catch (e) {
        console.warn("Error processing investments:", e);
      }
    }

    // Load Withdrawals
    try {
      const documents = await safeFetchCollection(
        APPWRITE_CONFIG.collections.withdrawals,
        userProfile.isAdmin ? [] : [Query.equal("userId", userProfile.id)]
      );
      const mappedWithdrawals = documents.map(mapWithdrawalFromDoc);
      setWithdrawals(mappedWithdrawals);
      
      try {
        if (userProfile.isAdmin) {
          localStorage.setItem("fr_withdrawals", JSON.stringify(mappedWithdrawals));
        } else {
          const cached = JSON.parse(localStorage.getItem("fr_withdrawals") || "[]");
          const rest = cached.filter((c: any) => c.userId !== userProfile.id);
          localStorage.setItem("fr_withdrawals", JSON.stringify([...mappedWithdrawals, ...rest]));
        }
      } catch (err) {
        console.warn("localStorage push fail for Withdrawals", err);
      }
    } catch (e) {
      console.warn("Error processing withdrawals:", e);
    }

    // Load Referrals
    try {
      let documents: any[] = [];
      if (userProfile.isAdmin) {
        documents = await safeFetchCollection(APPWRITE_CONFIG.collections.referrals, []);
      } else {
        const docsById = await safeFetchCollection(
          APPWRITE_CONFIG.collections.referrals,
          [Query.equal("referrerId", userProfile.id)]
        );
        let docsByCode: any[] = [];
        if (userProfile.referralCode) {
          docsByCode = await safeFetchCollection(
            APPWRITE_CONFIG.collections.referrals,
            [Query.equal("referrerId", `code_${userProfile.referralCode.toUpperCase()}`)]
          );
        }
        
        const seenIds = new Set(docsById.map((d: any) => d.$id || d.id));
        documents = [...docsById];
        for (const d of docsByCode) {
          const idVal = d.$id || d.id;
          if (!seenIds.has(idVal)) {
            documents.push(d);
            seenIds.add(idVal);
          }
        }
      }
      const mappedReferrals = documents as any as Referral[];
      setReferrals(mappedReferrals);
      
      try {
        if (userProfile.isAdmin) {
          localStorage.setItem("fr_referrals", JSON.stringify(mappedReferrals));
        } else {
          const cached = JSON.parse(localStorage.getItem("fr_referrals") || "[]");
          const rest = cached.filter((c: any) => c.referrerId !== userProfile.id && c.referrerId !== `code_${userProfile.referralCode?.toUpperCase()}`);
          localStorage.setItem("fr_referrals", JSON.stringify([...mappedReferrals, ...rest]));
        }
      } catch (err) {
        console.warn("localStorage push fail for Referrals", err);
      }
    } catch (e) {
      console.warn("Error processing referrals:", e);
    }

    // Load Notifications (only if mock, otherwise handled by real-time onSnapshot)
    if (isMockAppwrite) {
      try {
        const documents = await safeFetchCollection(APPWRITE_CONFIG.collections.notifications);
        const allNotifs = documents as any as Notification[];
        const sortedNotifs = allNotifs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const filtered = sortedNotifs.filter(n => n.userId === "all" || n.userId === userProfile.id);
        setNotifications(filtered);
        
        try {
          localStorage.setItem("fr_notifications", JSON.stringify(sortedNotifs));
        } catch (err) {
          console.warn("localStorage push fail for Notifications", err);
        }
      } catch (e) {
        console.warn("Error processing notifications:", e);
      }
    }

    // Load Users if Admin
    if (userProfile.isAdmin) {
      try {
        let dbUsers: UserProfile[] = [];
        try {
          const documents = await safeFetchCollection(APPWRITE_CONFIG.collections.users);
          dbUsers = documents.map(mapUserFromDoc);
        } catch (dbErr) {
          console.warn("DB users retrieval failed, relying on sync server:", dbErr);
        }

        let syncUsers: UserProfile[] = [];
        try {
          const res = await fetch("/api/admin/users");
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.users)) {
              syncUsers = data.users;
            }
          }
        } catch (syncErr) {
          console.warn("Sync server users retrieval failed:", syncErr);
        }

        // Merge both lists, preferring dbUsers but adding any missing ones from syncUsers, matching by email or id
        const mergedMap = new Map<string, UserProfile>();
        
        // Load sync users first as baseline
        syncUsers.forEach(u => {
          if (u && u.email) {
            mergedMap.set(u.email.toLowerCase(), u);
          }
        });

        // Overwrite or merge with dbUsers (real cloud data takes priority if present)
        dbUsers.forEach(u => {
          if (u && u.email) {
            const existing = mergedMap.get(u.email.toLowerCase());
            mergedMap.set(u.email.toLowerCase(), { ...existing, ...u });
          }
        });

        const mergedUsers = Array.from(mergedMap.values());
        setUsers(mergedUsers);

        try {
          localStorage.setItem("fr_users", JSON.stringify(mergedUsers));
        } catch (err) {
          console.warn("localStorage push fail for Users", err);
        }
      } catch (e) {
        console.warn("Error processing admin users list:", e);
      }
    }
  };

  const fetchPublicData = async () => {
    if (isMockAppwrite) return;
    
    // Load Plans publicly
    try {
      const res = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.plans,
        [Query.limit(5000)]
      );
      const fetchedPlans = res.documents.map(mapPlanFromDoc);
      if (fetchedPlans.length > 0) {
        setPlans(fetchedPlans);
        try {
          localStorage.setItem("fr_plans", JSON.stringify(fetchedPlans));
        } catch (err) {
          console.warn("localStorage push fail for plans", err);
        }
      }
    } catch (e) {
      console.warn("Error processing plans in public fetch:", e);
    }

    // Load Categories publicly
    try {
      const res = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        "categories",
        [Query.limit(100)]
      );
      const fetchedCats = res.documents.map(mapCategoryFromDoc);
      if (fetchedCats.length > 0) {
        setCategories(fetchedCats);
        try {
          localStorage.setItem("fr_categories", JSON.stringify(fetchedCats));
        } catch (err) {
          console.warn("localStorage push fail for categories", err);
        }
      }
    } catch (e) {
      console.warn("Error fetching categories in public fetch:", e);
    }

    // Load Updates publicly
    try {
      const res = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.farmUpdates,
        [Query.limit(5000)]
      );
      const fetchedUpdates = res.documents.map(mapFarmUpdateFromDoc);
      if (fetchedUpdates.length > 0) {
        const sortedUpdates = fetchedUpdates.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFarmUpdates(sortedUpdates);
        try {
          localStorage.setItem("fr_updates", JSON.stringify(sortedUpdates));
        } catch (err) {
          console.warn("localStorage push fail for Updates", err);
        }
      }
    } catch (e) {
      console.warn("Error processing farm updates in public fetch:", e);
    }
  };

  // Real-time Firestore snapshot listeners for investments and notifications
  useEffect(() => {
    if (isMockAppwrite || !currentUser) {
      return;
    }

    console.log("[FarmContext] Initiating Firestore onSnapshot listeners for investments and notifications...");

    // 1. Investments snapshot listener
    const investmentsColl = collection(db, "investments");
    const qInvestments = currentUser.isAdmin 
      ? query(investmentsColl)
      : query(investmentsColl, where("userId", "==", currentUser.id));

    const unsubscribeInvestments = onSnapshot(
      qInvestments,
      (snapshot) => {
        const docs: any[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...docSnap.data() });
        });
        const mapped = docs.map(mapInvestmentFromDoc);
        setInvestments(mapped);

        try {
          if (currentUser.isAdmin) {
            localStorage.setItem("fr_investments", JSON.stringify(mapped));
          } else {
            const cached = JSON.parse(localStorage.getItem("fr_investments") || "[]");
            const rest = cached.filter((c: any) => c.userId !== currentUser.id);
            localStorage.setItem("fr_investments", JSON.stringify([...mapped, ...rest]));
          }
        } catch (err) {
          console.warn("localStorage push fail for real-time Investments", err);
        }
      },
      (error) => {
        console.error("onSnapshot error on investments:", error);
        handleFirestoreError(error, FirebaseOperationType.GET, "investments");
      }
    );

    // 2. Notifications snapshot listener
    const notificationsColl = collection(db, "notifications");
    const qNotifications = query(notificationsColl, where("userId", "in", ["all", currentUser.id]));

    const unsubscribeNotifications = onSnapshot(
      qNotifications,
      (snapshot) => {
        const docs: any[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...docSnap.data() });
        });
        const sortedNotifs = docs
          .map(docData => ({ id: docData.id, ...docData }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as any as Notification[];
        
        setNotifications(sortedNotifs);

        try {
          localStorage.setItem("fr_notifications", JSON.stringify(sortedNotifs));
        } catch (err) {
          console.warn("localStorage push fail for real-time Notifications", err);
        }
      },
      (error) => {
        console.error("onSnapshot error on notifications:", error);
        handleFirestoreError(error, FirebaseOperationType.GET, "notifications");
      }
    );

    return () => {
      console.log("[FarmContext] Cleaning up Firestore onSnapshot listeners...");
      unsubscribeInvestments();
      unsubscribeNotifications();
    };
  }, [currentUser, isMockAppwrite]);

  // Real-time synchronization loop when user or guest is active
  useEffect(() => {
    if (isMockAppwrite) return;

    // Load first batch immediately
    if (currentUser) {
      fetchAllData(currentUser);
    } else {
      fetchPublicData();
    }

    // Setup polling backstop to ensure data consistency
    const interval = setInterval(() => {
      if (currentUser) {
        fetchAllData(currentUser);
      } else {
        fetchPublicData();
      }
    }, 2000);

    let unsubscribe = () => {};
    const handleRealtimeFail = () => {
      console.log("[FarmContext] Appwrite Realtime disconnected repeatedly. Unsubscribed to preserve stable state.");
      try {
        if (unsubscribe) unsubscribe();
      } catch (e) {}
    };

    if (typeof window !== "undefined" && (window as any).__disableAppwriteRealtime) {
      console.log("[FarmContext] Skipping Realtime subscription as it is disabled. Using highly-available polling pipeline.");
      return () => clearInterval(interval);
    }

    try {
      const channel = `databases.${APPWRITE_CONFIG.databaseId}.collections`;
      
      // Select appropriate documents based on authorization level
      const channels = currentUser ? [
        `${channel}.${APPWRITE_CONFIG.collections.users}.documents`,
        `${channel}.${APPWRITE_CONFIG.collections.plans}.documents`,
        `${channel}.${APPWRITE_CONFIG.collections.deposits}.documents`,
        `${channel}.${APPWRITE_CONFIG.collections.investments}.documents`,
        `${channel}.${APPWRITE_CONFIG.collections.withdrawals}.documents`,
        `${channel}.${APPWRITE_CONFIG.collections.notifications}.documents`,
        `${channel}.${APPWRITE_CONFIG.collections.farmUpdates}.documents`,
        `${channel}.${APPWRITE_CONFIG.collections.referrals}.documents`,
      ] : [
        `${channel}.${APPWRITE_CONFIG.collections.plans}.documents`,
        `${channel}.${APPWRITE_CONFIG.collections.farmUpdates}.documents`,
      ];

      unsubscribe = realtimeClient.subscribe(channels, () => {
        console.log("Appwrite Realtime Event: State changed. Synchronizing active user/guest views...");
        if (currentUser) {
          fetchAllData(currentUser);
        } else {
          fetchPublicData();
        }
      });

      if (typeof window !== "undefined") {
        window.addEventListener("appwrite_realtime_fail", handleRealtimeFail);
      }
    } catch (err) {
      console.warn("Could not establish real-time socket connection, relying on background polling fallback:", err);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("appwrite_realtime_fail", handleRealtimeFail);
      }
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (e) {}
      }
    };
  }, [currentUser, isMockSync]);

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
        userProfile = mapUserFromDoc(doc);
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

      // Sync investor profile with local Express server ledger for absolute reliability
      try {
        await fetch("/api/sync-user-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userProfile)
        });
      } catch (syncErr) {
        console.warn("Express user-sync failed:", syncErr);
      }

      setCurrentUser(userProfile);
      syncLocal("fr_current_user", userProfile);
      setCurrentPage("dashboard");
    } catch (err: any) {
      console.warn("Real Appwrite login failed:", err);
      // Only fallback to mock if we are explicitly running in Mock Mode by design
      if (isMockAppwrite) {
        console.log("Triggering simulated mock fallback for email:", email);
        const isEmailAdmin = email.toLowerCase() === "paypalclint007@gmail.com";
        const mockUid = "user_riser_" + Math.floor(Math.random() * 1000);
        const mockU: UserProfile = {
          id: mockUid,
          email: email,
          name: isEmailAdmin ? "Admin Clint" : "Standard Investor",
          phoneNumber: "+2348000000000",
          balance: isEmailAdmin ? 25000 : 0, // Prefill ONLY admins with test funds, regular users starts with zero balance
          totalInvested: 0,
          totalEarnings: 0,
          referralBonus: 0,
          totalProfit: 0,
          referralCode: "RISE" + Math.floor(Math.random() * 9000 + 1000),
          referredBy: "",
          isAdmin: isEmailAdmin,
          registeredAt: new Date().toISOString()
        };

        if (typeof window !== "undefined") {
          localStorage.setItem("fr_fallback_active", "true");
          localStorage.setItem("fr_current_user", JSON.stringify(mockU));
          
          const localUsers = JSON.parse(localStorage.getItem("fr_users") || "[]");
          if (!localUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
            localUsers.push(mockU);
            localStorage.setItem("fr_users", JSON.stringify(localUsers));
          }
          
          // Smooth reload to boot fully with isMockAppwrite = true
          window.location.reload();
        }
        return;
      }
      throw new Error(err.message || "Failed to sign-in to investor account. Please verify credentials or network.");
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    phoneNumber: string,
    referredCode?: string,
    onStatusChange?: (status: string) => void
  ) => {
    const cleanReferredCode = referredCode?.trim().toUpperCase() || "";
    const normalizedEmail = email.toLowerCase().trim();

    // Strict client-side / pre-flight check for unique registered email
    const emailExists = users.some(u => u.email?.toLowerCase().trim() === normalizedEmail);
    if (emailExists) {
      throw new Error(`An account with the email address ${email} is already registered on this platform. Please sign in instead.`);
    }

    if (isMockAppwrite) {
      onStatusChange?.("Initializing sandbox registration...");
      await new Promise((r) => setTimeout(r, 600));

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
        referredBy: cleanReferredCode,
        isAdmin: email.toLowerCase() === "paypalclint007@gmail.com",
        registeredAt: new Date().toISOString()
      };
      
      onStatusChange?.("Persisting mock investor profile...");
      await new Promise((r) => setTimeout(r, 600));
      
      setCurrentUser(mockU);
      syncLocal("fr_current_user", mockU);
      
      const newUsers = [...users.filter(u => u.email?.toLowerCase().trim() !== normalizedEmail), mockU];
      setUsers(newUsers);
      syncLocal("fr_users", newUsers);

      if (cleanReferredCode) {
        onStatusChange?.("Attaching referral link...");
        await new Promise((r) => setTimeout(r, 400));
        const referrer = users.find(u => u.referralCode.toUpperCase() === cleanReferredCode);
        if (referrer) {
          const newRefRecord: Referral = {
            id: "ref_" + Date.now(),
            referrerId: referrer.id,
            referrerCode: cleanReferredCode,
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

      onStatusChange?.("Redirecting to your investment portal...");
      await new Promise((r) => setTimeout(r, 400));
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

      onStatusChange?.("Generating secure authentication credentials...");
      const userId = ID.unique();
      await account.create(userId, email, pass, name);

      onStatusChange?.("Opening encrypted session tunnel...");
      await account.createEmailPasswordSession(email, pass);

      onStatusChange?.("Synchronizing investor profile with secure central database...");
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
        referredBy: cleanReferredCode,
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
      } catch (createErr: any) {
        console.warn("Profile Sync to Appwrite Cloud DB failed or skipped. Using persistent sync ledger.", createErr);
      }

      // Synchronize with local Express server user registry (crucial fallback)
      try {
        await fetch("/api/sync-user-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProfile),
        });
      } catch (syncErr) {
        console.warn("Express user-sync API unreachable:", syncErr);
      }

      if (cleanReferredCode) {
        onStatusChange?.("Processing referral connections...");
        try {
          let referrerDoc: UserProfile | null = null;
          
          try {
            const referrerQuery = await databases.listDocuments(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.collections.users,
              [Query.equal("referralCode", cleanReferredCode)]
            );
            if (referrerQuery.documents.length > 0) {
              referrerDoc = mapUserFromDoc(referrerQuery.documents[0]);
            }
          } catch (queryErr) {
            console.warn("Index query for referralCode failed, performing fallback scan.", queryErr);
          }
          
          // Fallback scan: load is safely in case of missing index
          if (!referrerDoc) {
            try {
              const allUsersDocs = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                []
              );
              const mappedUsers = allUsersDocs.documents.map(mapUserFromDoc);
              const match = mappedUsers.find(u => u.referralCode.toUpperCase() === cleanReferredCode);
              if (match) {
                referrerDoc = match;
              }
            } catch (fallbackErr) {
              console.error("Fallback scan for referrer failed:", fallbackErr);
            }
          }
          
          const refId = referrerDoc ? `${referrerDoc.id}_${userId}` : `ref_${cleanReferredCode}_${userId}`;
          const referralRec: Referral = {
            id: refId,
            referrerId: referrerDoc ? referrerDoc.id : `code_${cleanReferredCode}`,
            referrerCode: cleanReferredCode,
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
        } catch (err) {
          console.error("Error creating referral document:", err);
        }
      }

      onStatusChange?.("Sync finalization... Fetching your workspace dashboard data...");
      
      setCurrentUser(newProfile);
      syncLocal("fr_current_user", newProfile);
      
      const localUsers = JSON.parse(localStorage.getItem("fr_users") || "[]");
      if (!localUsers.some((u: any) => u.email.toLowerCase().trim() === email.toLowerCase().trim())) {
        localUsers.push(newProfile);
        syncLocal("fr_users", localUsers);
      }
      setUsers(prev => [...prev.filter(u => u.email?.toLowerCase().trim() !== email.toLowerCase().trim()), newProfile]);

      setCurrentPage("dashboard");
    } catch (err: any) {
      console.warn("Real Appwrite sign-up failed:", err);
      // Only fallback to mock if we are explicitly running in Mock Mode by design
      if (isMockAppwrite) {
        console.log("Triggering simulated mock fallback for register email:", email);
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
          referredBy: cleanReferredCode,
          isAdmin: email.toLowerCase() === "paypalclint007@gmail.com",
          registeredAt: new Date().toISOString()
        };

        if (typeof window !== "undefined") {
          localStorage.setItem("fr_fallback_active", "true");
          localStorage.setItem("fr_current_user", JSON.stringify(mockU));
          
          const localUsers = JSON.parse(localStorage.getItem("fr_users") || "[]");
          if (!localUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
            localUsers.push(mockU);
            localStorage.setItem("fr_users", JSON.stringify(localUsers));
          }

          if (cleanReferredCode) {
            const mockReferrals = JSON.parse(localStorage.getItem("fr_referrals") || "[]");
            const newRefRecord: Referral = {
              id: "ref_" + Date.now(),
              referrerId: "ref_referrer",
              referrerCode: referredCode,
              referredId: mockUid,
              referredName: name,
              referredEmail: email,
              referredPhone: phoneNumber,
              status: "pending",
              commissionPaid: 0,
              createdAt: new Date().toISOString()
            };
            mockReferrals.push(newRefRecord);
            localStorage.setItem("fr_referrals", JSON.stringify(mockReferrals));
          }

          // Smooth reload to boot fully with isMockAppwrite = true
          window.location.reload();
        }
        return;
      }
      throw new Error(err.message || "Failed to register new investor profile. Please check that password is at least 8 characters and collections exist.");
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("fr_current_user");
      localStorage.removeItem("fr_fallback_active");
    }
    if (!isMockAppwrite) {
      try {
        await account.deleteSession("current");
      } catch (err) {
        console.warn("Session logout warning: ", err);
      }
    }
    setCurrentUser(null);
    setIsAdminMode(false);
    setCurrentPage("login");
    if (typeof window !== "undefined") {
      window.location.reload();
    }
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

      let newRefs = [...referrals];
      let updatedUserList = [...users];

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

          updatedUserList = users.map(u => {
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
              id: "not_" + Date.now() + "_ref_deposit",
              userId: refUser.id,
              title: "Referral Commission Received! 🎁",
              message: `You earned +₦${commission} (5% direct commission) as ${currentUser.name} made a deposit!`,
              isRead: false,
              createdAt: new Date().toISOString()
            };
            const updatedNotifs = [rNotif, newNotif, ...notifications];
            setNotifications(updatedNotifs);
            syncLocal("fr_notifications", updatedNotifs);
            return;
          }
        }
      }

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

      // Trigger instant referral completion in Live DB mode on deposit creation
      if (currentUser.referredBy) {
        try {
          const matches = await safeFetchCollectionOuter(
            APPWRITE_CONFIG.collections.referrals,
            [Query.equal("referredId", currentUser.id)]
          );
          const refData = matches.find((r: any) => r.status === "pending");
          if (refData) {
            const commission = Number((amount * 0.05).toFixed(2));
            const targetRefId = refData.$id || refData.id;
            await databases.updateDocument(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.collections.referrals,
              targetRefId,
              {
                status: "active",
                commissionPaid: commission
              }
            ).catch(err => console.warn("Live referral update error during deposit create:", err));
          }
        } catch (err) {
          console.error("Live referral check failed during deposit create:", err);
        }
      }
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
          walletBalance: updatedUserBalance,
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
          let referrerDoc: UserProfile | null = null;
          
          try {
            const referrerQuery = await databases.listDocuments(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.collections.users,
              [Query.equal("referralCode", currentUser.referredBy)]
            );
            if (referrerQuery.documents.length > 0) {
              referrerDoc = mapUserFromDoc(referrerQuery.documents[0]);
            }
          } catch (queryErr) {
            console.warn("Index query for referralCode failed on payout check. Performing fallback scan.", queryErr);
          }
          
          // Fallback scan: load user safely
          if (!referrerDoc) {
            try {
              const allUsersDocs = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                []
              );
              const mappedUsers = allUsersDocs.documents.map(mapUserFromDoc);
              const match = mappedUsers.find(u => u.referralCode.toUpperCase() === currentUser.referredBy.toUpperCase());
              if (match) {
                referrerDoc = match;
              }
            } catch (fallbackErr) {
              console.error("Fallback scan for payout referrer failed:", fallbackErr);
            }
          }

          if (referrerDoc) {
            const rDoc = referrerDoc;
            
            try {
              const matches = await safeFetchCollectionOuter(
                APPWRITE_CONFIG.collections.referrals,
                [Query.equal("referredId", currentUser.id)]
              );
              
              const refData = matches.find((r: any) => r.status === "pending");
              if (refData) {
                const commission = Number((amount * 0.05).toFixed(2));
                const targetRefId = refData.$id || refData.id;
                
                await databases.updateDocument(
                  APPWRITE_CONFIG.databaseId,
                  APPWRITE_CONFIG.collections.referrals,
                  targetRefId,
                  {
                    referrerId: rDoc.id,
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
                    balance: Number((rDoc.balance + commission).toFixed(2)),
                    walletBalance: Number((rDoc.balance + commission).toFixed(2))
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

    // Enforce referral requirement check (except for Admin)
    if (currentUser && !currentUser.isAdmin) {
      const myRefs = referrals.filter(r => 
        r.referrerId === currentUser.id || 
        r.referrerId === `code_${currentUser.referralCode?.toUpperCase()}` || 
        r.referrerCode?.toUpperCase() === currentUser.referralCode?.toUpperCase()
      );

      const activeInvestingRefs = myRefs.filter(r => 
        investments.some(inv => inv.userId === r.referredId)
      );

      const uniqueInvestingCount = new Set(activeInvestingRefs.map(r => r.referredId.toLowerCase().trim())).size;

      if (uniqueInvestingCount < 2) {
        throw new Error(`Withdrawal Locked: Under our agricultural sponsorship contracts, you must invite at least 2 distinct active sponsors who have active farm investment contracts to unlock your bank payouts. Currently, ${uniqueInvestingCount}/2 of your referrals have invested.`);
      }
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
        
        let updatedUserList = users.map(u => u.id === target.userId ? updatedTargetUser : u);

        // -- REFERRAL COMMISSION & ACTIVATION ON DEPOSIT IN MOCK MODE --
        let newRefs = [...referrals];
        if (targetUser.referredBy) {
          const activeRefIndex = newRefs.findIndex(r => r.referredId === target.userId && r.status === "pending");
          if (activeRefIndex !== -1) {
            const activeRef = { ...newRefs[activeRefIndex] };
            const commission = Number((target.amount * 0.05).toFixed(2));
            activeRef.status = "active";
            activeRef.commissionPaid = commission;
            newRefs[activeRefIndex] = activeRef;

            setReferrals(newRefs);
            syncLocal("fr_referrals", newRefs);

            updatedUserList = updatedUserList.map(u => {
              if (u.referralCode === targetUser.referredBy) {
                return {
                  ...u,
                  referralBonus: Number((u.referralBonus + commission).toFixed(2)),
                  balance: Number((u.balance + commission).toFixed(2))
                };
              }
              return u;
            });

            if (currentUser && currentUser.referralCode === targetUser.referredBy) {
              const updatedCurrentUser: UserProfile = {
                ...currentUser,
                referralBonus: Number((currentUser.referralBonus + commission).toFixed(2)),
                balance: Number((currentUser.balance + commission).toFixed(2))
              };
              setCurrentUser(updatedCurrentUser);
              syncLocal("fr_current_user", updatedCurrentUser);
            }

            const refUser = updatedUserList.find(u => u.referralCode === targetUser.referredBy);
            if (refUser) {
              const rNotif: Notification = {
                id: "not_" + Date.now() + "_ref_deposit",
                userId: refUser.id,
                title: "Referral Commission Received! 🎁",
                message: `You earned +₦${commission} (5% direct commission) as your partner ${targetUser.name} made a successful deposit!`,
                isRead: false,
                createdAt: new Date().toISOString()
              };
              notifications.unshift(rNotif);
            }
          }
        }
        // -- END REFERRAL DEPOSIT COMMISSION --

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
      const u = mapUserFromDoc(userDoc);
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
        {
          balance: newBalance,
          walletBalance: newBalance
        }
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

      // -- REFERRAL COMMISSION & ACTIVATION ON DEPOSIT IN LIVE MODE --
      if (u.referredBy) {
        try {
          let referrerDoc: UserProfile | null = null;
          try {
            const referrerQuery = await databases.listDocuments(
              APPWRITE_CONFIG.databaseId,
              APPWRITE_CONFIG.collections.users,
              [Query.equal("referralCode", u.referredBy)]
            );
            if (referrerQuery.documents.length > 0) {
              referrerDoc = mapUserFromDoc(referrerQuery.documents[0]);
            }
          } catch (queryErr) {
            console.warn("Index query for referralCode failed on payout check. Performing fallback scan.", queryErr);
          }

          if (!referrerDoc) {
            try {
              const allUsersDocs = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                []
              );
              const mappedUsers = allUsersDocs.documents.map(mapUserFromDoc);
              const match = mappedUsers.find(user => user.referralCode.toUpperCase() === u.referredBy.toUpperCase());
              if (match) {
                referrerDoc = match;
              }
            } catch (fallbackErr) {
              console.error("Fallback scan for payout referrer failed:", fallbackErr);
            }
          }

          if (referrerDoc) {
            const rDoc = referrerDoc;
            try {
              const matches = await safeFetchCollectionOuter(
                APPWRITE_CONFIG.collections.referrals,
                [Query.equal("referredId", u.id)]
              );
              const refData = matches.find((r: any) => r.status === "pending");
              if (refData) {
                const commission = Number((target.amount * 0.05).toFixed(2));
                const targetRefId = refData.$id || refData.id;

                await databases.updateDocument(
                  APPWRITE_CONFIG.databaseId,
                  APPWRITE_CONFIG.collections.referrals,
                  targetRefId,
                  {
                    referrerId: rDoc.id,
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
                    balance: Number((rDoc.balance + commission).toFixed(2)),
                    walletBalance: Number((rDoc.balance + commission).toFixed(2))
                  }
                );

                const rNotifId = "not_" + Date.now() + "_ref_deposit";
                await databases.createDocument(
                  APPWRITE_CONFIG.databaseId,
                  APPWRITE_CONFIG.collections.notifications,
                  rNotifId,
                  {
                    id: rNotifId,
                    userId: rDoc.id,
                    title: "Referral Commission Received! 🎁",
                    message: `You earned +₦${commission} (5% direct commission) as your partner ${u.name} made a successful deposit!`,
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
      // -- END REFERRAL DEPOSIT COMMISSION --

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
      const u = mapUserFromDoc(userDoc);
      if (u.balance < target.amount) {
        throw new Error(`Insufficient wallet balance on user profile to discharge withdrawal.`);
      }

      const updatedBalance = Number((u.balance - target.amount).toFixed(2));

      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        target.userId,
        {
          balance: updatedBalance,
          walletBalance: updatedBalance
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

  const createOrUpdateCategory = async (cat: LivestockCategory) => {
    if (isMockAppwrite) {
      const existing = categories.some(c => c.id === cat.id);
      let updated;
      if (existing) {
        updated = categories.map(c => c.id === cat.id ? cat : c);
      } else {
        updated = [...categories, cat];
      }
      setCategories(updated);
      syncLocal("fr_categories", updated);
      return;
    }
    try {
      try {
        await databases.getDocument(APPWRITE_CONFIG.databaseId, "categories", cat.id);
        await databases.updateDocument(APPWRITE_CONFIG.databaseId, "categories", cat.id, mapCategoryToDoc(cat));
      } catch {
        await databases.createDocument(APPWRITE_CONFIG.databaseId, "categories", cat.id, {
          id: cat.id,
          ...mapCategoryToDoc(cat)
        });
      }
      // Re-fetch to synchronize state
      if (currentUser) {
        await fetchAllData(currentUser);
      } else {
        await fetchPublicData();
      }
    } catch (err) {
      handleAppwriteError(err, OperationType.WRITE, `categories/${cat.id}`);
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
      try {
        localStorage.setItem("fr_users", JSON.stringify(updatedUsers));
      } catch (err) {
        console.warn("Storage write failed in banUser:", err);
      }
      
      const updatedUser = updatedUsers.find(u => u.id === userId);
      if (updatedUser) {
        try {
          await fetch("/api/sync-user-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedUser)
          });
        } catch (syncErr) {
          console.warn("Express user-sync failed in banUser:", syncErr);
        }
      }

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

  const adjustUserWallet = async (userId: string, fields: Partial<UserProfile>) => {
    if (isMockAppwrite) {
      const updated = users.map(u => u.id === userId ? { ...u, ...fields } : u);
      setUsers(updated);
      syncLocal("fr_users", updated);
      if (currentUser?.id === userId) {
        const updatedCurrentUser = { ...currentUser, ...fields };
        setCurrentUser(updatedCurrentUser);
        syncLocal("fr_current_user", updatedCurrentUser);
      }
      return;
    }
    try {
      const payload: any = {};
      if (fields.balance !== undefined) {
        payload.balance = fields.balance;
        payload.walletBalance = fields.balance;
      }
      if (fields.totalInvested !== undefined) {
        payload.totalInvested = fields.totalInvested;
      }
      if (fields.totalEarnings !== undefined) {
        payload.totalEarnings = fields.totalEarnings;
        payload.totalProfit = fields.totalEarnings;
      }
      if (fields.referralBonus !== undefined) {
        payload.referralBonus = fields.referralBonus;
      }
      if (fields.name !== undefined) {
        payload.fullname = fields.name;
        payload.name = fields.name;
      }
      if (fields.phoneNumber !== undefined) {
        payload.phoneNumber = fields.phoneNumber;
        payload.phone = fields.phoneNumber;
      }
      if (fields.isBanned !== undefined) {
        payload.isBanned = fields.isBanned;
      }

      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.collections.users,
        userId,
        payload
      );
      
      const updatedUsers = users.map(u => u.id === userId ? { ...u, ...fields } : u);
      setUsers(updatedUsers);
      try {
        localStorage.setItem("fr_users", JSON.stringify(updatedUsers));
      } catch (err) {
        console.warn("Storage write failed in adjustUserWallet:", err);
      }
      
      const updatedUser = updatedUsers.find(u => u.id === userId);
      if (updatedUser) {
        try {
          await fetch("/api/sync-user-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedUser)
          });
        } catch (syncErr) {
          console.warn("Express user-sync failed in adjustUserWallet:", syncErr);
        }
      }

      if (currentUser?.id === userId) {
        const updatedCurrentUser = { ...currentUser, ...fields };
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
            balance: Number((currentUser.balance + amount).toFixed(2)),
            walletBalance: Number((currentUser.balance + amount).toFixed(2))
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
          walletBalance: newUserVal.balance,
          totalInvested: newUserVal.totalInvested,
          totalEarnings: newUserVal.totalEarnings,
          totalProfit: newUserVal.totalEarnings
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
      currentUser, plans, categories, deposits, investments, withdrawals, notifications, 
      farmUpdates, users, referrals, currentPage, selectedPlan, loading, isAdminMode,
      connectionError, reconnectAppwrite,
      loginWithEmail, registerWithEmail, logout, navigate, forgotPassword,
      createDeposit, createInvestment, withdrawMaturedInvestment, createWithdrawal, markNotificationRead,
      approveDeposit, rejectDeposit, approveWithdrawal, rejectWithdrawal,
      createOrUpdatePlan, createOrUpdateCategory, deletePlan, createFarmUpdate, editFarmUpdate, deleteFarmUpdate, banUser, adjustUserWallet, sendBroadcastNotification,
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
