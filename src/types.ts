export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  balance: number;
  totalInvested: number;
  totalEarnings: number;
  referralBonus: number;
  totalProfit: number;
  referralCode: string;
  referredBy: string;
  isAdmin: boolean;
  registeredAt: string;
  isBanned?: boolean;
}

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  txRef: string;
  proofImg?: string;
  receiptImage?: string;
  createdAt: string;
  aiStatus?: "pending" | "legit" | "discrepancy" | "error";
  aiReason?: string;
  aiAuditTime?: string;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  type: "Chicken" | "Pig";
  minAmount: number;
  maxAmount: number;
  profitPercent: number; // e.g. 15 for 15% net yield
  durationDays: number;
  imageUrl: string;
  description: string;
  status: "active" | "inactive";
  dailyProfit?: number;
  totalReturn?: number;
}

export interface ActiveInvestment {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  type: "Chicken" | "Pig";
  amount: number;
  profitRate: number;
  expectedReturn: number;
  durationDays: number;
  status: "active" | "matured";
  createdAt: string;
  maturesAt: string;
}

export interface FarmUpdate {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  videoUrl?: string;
  type: "Chicken" | "Pig" | "General";
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  accountDetails: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string; // auth uid or "all"
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referrerCode: string;
  referredId: string;
  referredName: string;
  referredEmail: string;
  referredPhone: string;
  status: "pending" | "active";
  commissionPaid: number;
  createdAt: string;
}

export interface LivestockCategory {
  id: string;
  name: string;
  type: string;
  imageUrl: string;
  description: string;
  emoji: string;
}
