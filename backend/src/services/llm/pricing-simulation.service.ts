export interface SimulationInput {
  totalBusinesses: number;
  conversationsPerBusinessPerMonth: number;
  llmCallsPerConversation: number;
  messagesPerConversation: number;
  targetMargin: number;
}

export interface SimulationResult {
  monthlyCostTotal: number;
  monthlyCostPerBusiness: number;
  monthlyLLMCost: number;
  monthlyChannelCost: number;
  totalLLMCalls: number;
  totalChannelMessages: number;
  recommendedPricePerBusiness: number;
  revenueAtPrice: number;
  grossProfit: number;
  grossMargin: number;
  breakevenBusinesses: number;
}

const COST_ASSUMPTIONS = {
  avgLLMCostPerCall: 0.0005,
  avgChannelCostPerMessage: 0.002,
};

export function simulatePricing(input: SimulationInput): SimulationResult {
  const totalConversations = input.totalBusinesses * input.conversationsPerBusinessPerMonth;
  const totalLLMCalls = totalConversations * input.llmCallsPerConversation;
  const totalChannelMessages = totalConversations * input.messagesPerConversation;

  const monthlyLLMCost = totalLLMCalls * COST_ASSUMPTIONS.avgLLMCostPerCall;
  const monthlyChannelCost = totalChannelMessages * COST_ASSUMPTIONS.avgChannelCostPerMessage;
  const monthlyCostTotal = monthlyLLMCost + monthlyChannelCost;
  const monthlyCostPerBusiness = monthlyCostTotal / Math.max(input.totalBusinesses, 1);

  const totalInfrastructureCost = 7;
  const totalMonthlyCost = monthlyCostTotal + totalInfrastructureCost;

  const recommendedPricePerBusiness = totalMonthlyCost / Math.max(input.totalBusinesses, 1) / (1 - input.targetMargin / 100);
  const revenueAtPrice = recommendedPricePerBusiness * input.totalBusinesses;
  const grossProfit = revenueAtPrice - totalMonthlyCost;
  const grossMargin = revenueAtPrice > 0 ? (grossProfit / revenueAtPrice) * 100 : 0;

  const pricePerBusiness = recommendedPricePerBusiness;
  let breakevenBusinesses = 1;
  for (let n = 1; n <= 100; n++) {
    const rev = n * pricePerBusiness;
    const cost = (n * monthlyCostPerBusiness) + totalInfrastructureCost;
    if (rev >= cost) {
      breakevenBusinesses = n;
      break;
    }
  }

  return {
    monthlyCostTotal,
    monthlyCostPerBusiness,
    monthlyLLMCost,
    monthlyChannelCost,
    totalLLMCalls,
    totalChannelMessages,
    recommendedPricePerBusiness: Math.round(recommendedPricePerBusiness * 100) / 100,
    revenueAtPrice,
    grossProfit,
    grossMargin: Math.round(grossMargin * 10) / 10,
    breakevenBusinesses,
  };
}
