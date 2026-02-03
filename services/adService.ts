
export type BenefitType = 'ADVANCED_REPORTS' | 'PDF_EXPORT' | 'DEEP_INSIGHTS';

interface AdState {
  isPremium: boolean;
  rewards: Record<BenefitType, number>; // Timestamp de expiração
  dailyCount: number;
  lastAdDate: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'azular_ad_state';

const getInitialState = (): AdState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    const today = new Date().toISOString().split('T')[0];
    if (parsed.lastAdDate !== today) {
      parsed.dailyCount = 0;
      parsed.lastAdDate = today;
    }
    return parsed;
  }
  return {
    isPremium: false,
    rewards: {
      ADVANCED_REPORTS: 0,
      PDF_EXPORT: 0,
      DEEP_INSIGHTS: 0
    },
    dailyCount: 0,
    lastAdDate: new Date().toISOString().split('T')[0]
  };
};

let currentState = getInitialState();

export const adService = {
  isPremium: () => currentState.isPremium,
  
  hasBenefit: (type: BenefitType): boolean => {
    if (currentState.isPremium) return true;
    return Date.now() < currentState.rewards[type];
  },

  canWatchAd: (): boolean => {
    return currentState.dailyCount < 2;
  },

  grantBenefit: (type: BenefitType) => {
    currentState.rewards[type] = Date.now() + 24 * 60 * 60 * 1000; // +24h
    currentState.dailyCount += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  },

  setPremium: (status: boolean) => {
    currentState.isPremium = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  }
};
