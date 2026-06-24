import { Request, Response } from 'express';
import { z } from 'zod';
import { llmUsageRepository, channelUsageRepository } from '../repositories';
import { simulatePricing } from '../services/llm/pricing-simulation.service';
import { logger } from '../lib/logger';

export class UsageController {
  async getLLMCosts(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      });
      const params = schema.parse(req.query);

      const startDate = params.startDate ? new Date(params.startDate) : undefined;
      const endDate = params.endDate ? new Date(params.endDate) : undefined;

      const aggregation = await llmUsageRepository.getAggregation(
        params.businessId,
        startDate,
        endDate,
      );

      res.json({ success: true, data: aggregation });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to get LLM costs', { route: 'UsageController', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to get LLM costs' });
    }
  }

  async getChannelCosts(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        businessId: z.string().uuid().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      });
      const params = schema.parse(req.query);

      const startDate = params.startDate ? new Date(params.startDate) : undefined;
      const endDate = params.endDate ? new Date(params.endDate) : undefined;

      const summary = await channelUsageRepository.getSummary(
        params.businessId,
        startDate,
        endDate,
      );

      res.json({ success: true, data: summary });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to get channel costs', { route: 'UsageController', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to get channel costs' });
    }
  }

  async getCostSummary(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      });
      const params = schema.parse(req.query);

      const startDate = params.startDate ? new Date(params.startDate) : undefined;
      const endDate = params.endDate ? new Date(params.endDate) : undefined;

      const [llmAgg, channelAgg, perBusinessLLM, perBusinessChannel] = await Promise.all([
        llmUsageRepository.getAggregation(undefined, startDate, endDate),
        channelUsageRepository.getSummary(undefined, startDate, endDate),
        llmUsageRepository.getPerBusinessSummary(),
        channelUsageRepository.getPerBusinessSummary(),
      ]);

      const totalPlatformCost = llmAgg.totalCost + channelAgg.totalCost;
      const totalLLMCalls = llmAgg.totalCalls;
      const totalChannelMessages = channelAgg.totalMessages;
      const totalBusinesses = new Set([
        ...perBusinessLLM.map(b => b.businessId),
        ...perBusinessChannel.map(b => b.businessId),
      ]).size;

      const businessCosts = new Map<string, { businessName: string; llmCost: number; channelCost: number; llmCalls: number; channelMessages: number }>();

      for (const b of perBusinessLLM) {
        const entry = businessCosts.get(b.businessId) || { businessName: b.businessName, llmCost: 0, channelCost: 0, llmCalls: 0, channelMessages: 0 };
        entry.llmCost += b.totalCost;
        entry.llmCalls += b.totalCalls;
        businessCosts.set(b.businessId, entry);
      }

      for (const b of perBusinessChannel) {
        const entry = businessCosts.get(b.businessId) || { businessName: b.businessName, llmCost: 0, channelCost: 0, llmCalls: 0, channelMessages: 0 };
        entry.channelCost += b.totalCost;
        entry.channelMessages += b.totalMessages;
        entry.businessName = b.businessName;
        businessCosts.set(b.businessId, entry);
      }

      const topBusinesses = Array.from(businessCosts.entries())
        .map(([businessId, data]) => ({
          businessId,
          ...data,
          totalCost: data.llmCost + data.channelCost,
        }))
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 20);

      res.json({
        success: true,
        data: {
          platformMonthlyCost: totalPlatformCost,
          totalLLMCalls,
          totalChannelMessages,
          totalBusinesses,
          llmBreakdown: llmAgg.byProvider,
          channelBreakdown: channelAgg.byChannel,
          topBusinesses,
          dailyLLMCosts: llmAgg.dailyTotals,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to get cost summary', { route: 'UsageController', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to get cost summary' });
    }
  }

  async getLLMUsageDetail(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const schema = z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      });
      const params = schema.parse(req.query);

      const startDate = params.startDate ? new Date(params.startDate) : undefined;
      const endDate = params.endDate ? new Date(params.endDate) : undefined;

      const _offset = (params.page - 1) * params.limit;

      const records = await llmUsageRepository.findByBusiness(businessId, startDate, endDate);

      res.json({
        success: true,
        data: records.slice(0, params.limit),
        meta: { totalCount: records.length, page: params.page, limit: params.limit },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to get LLM usage detail', { route: 'UsageController', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to get LLM usage detail' });
    }
  }
  async simulatePricing(req: Request, res: Response): Promise<void> {
    try {
      const schema = z.object({
        totalBusinesses: z.coerce.number().int().min(1).default(10),
        conversationsPerBusinessPerMonth: z.coerce.number().int().min(1).default(100),
        llmCallsPerConversation: z.coerce.number().int().min(1).default(14),
        messagesPerConversation: z.coerce.number().int().min(1).default(6),
        targetMargin: z.coerce.number().min(0).max(100).default(80),
      });
      const params = schema.parse(req.query);

      const result = simulatePricing(params);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error('Failed to simulate pricing', { route: 'UsageController', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to simulate pricing' });
    }
  }

  async getFounderAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const [llmAgg, channelAgg, perBusinessLLM, perBusinessChannel, expensiveConversations] =
        await Promise.all([
          llmUsageRepository.getAggregation(),
          channelUsageRepository.getSummary(),
          llmUsageRepository.getPerBusinessSummary(),
          channelUsageRepository.getPerBusinessSummary(),
          llmUsageRepository.getAggregation().then(a => a.topConversations),
        ]);

      const businessMap = new Map<string, { llmCost: number; channelCost: number; llmCalls: number; channelMessages: number; businessName: string }>();

      for (const b of perBusinessLLM) {
        businessMap.set(b.businessId, {
          businessName: b.businessName,
          llmCost: b.totalCost,
          channelCost: 0,
          llmCalls: b.totalCalls,
          channelMessages: 0,
        });
      }

      for (const b of perBusinessChannel) {
        const entry = businessMap.get(b.businessId) || { businessName: b.businessName, llmCost: 0, channelCost: 0, llmCalls: 0, channelMessages: 0 };
        entry.channelCost += b.totalCost;
        entry.channelMessages += b.totalMessages;
        businessMap.set(b.businessId, entry);
      }

      const businesses = Array.from(businessMap.entries())
        .map(([businessId, d]) => ({ businessId, ...d, totalCost: d.llmCost + d.channelCost }))
        .sort((a, b) => b.totalCost - a.totalCost);

      const mostExpensive = businesses.slice(0, 5);
      const highVolume = [...businesses].sort((a, b) => b.llmCalls - a.llmCalls).slice(0, 5);

      res.json({
        success: true,
        data: {
          totals: {
            llmCost: llmAgg.totalCost,
            channelCost: channelAgg.totalCost,
            totalCost: llmAgg.totalCost + channelAgg.totalCost,
            llmCalls: llmAgg.totalCalls,
            channelMessages: channelAgg.totalMessages,
          },
          mostExpensive,
          highVolume,
          expensiveConversations: expensiveConversations.slice(0, 5),
        },
      });
    } catch (error: any) {
      logger.error('Failed to get founder analytics', { route: 'UsageController', error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ success: false, error: 'Failed to get founder analytics' });
    }
  }
}

export const usageController = new UsageController();
