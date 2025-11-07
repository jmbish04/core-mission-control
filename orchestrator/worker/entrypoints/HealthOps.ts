/**
 * orchestrator/worker/entrypoints/HealthOps.ts
 * ------------------------------------------------------------
 * Health Database Operations RPC Entrypoint
 * 
 * Provides RPC methods for database operations on DB_HEALTH.
 * This entrypoint allows apps/ workers to access the health database
 * through the orchestrator service binding instead of direct D1 bindings.
 * 
 * Responsibilities:
 * - Health check operations (CRUD)
 * - Worker health check operations (CRUD)
 * - Health monitoring data operations
 * 
 * All operations use Drizzle ORM on DB_HEALTH database.
 * ------------------------------------------------------------
 */

import type { CoreEnv } from '@shared/types/env';
import { BaseWorkerEntrypoint } from '@shared/base/workerEntrypoint';
import { createDatabaseService } from '../database/database';
import { eq, and, desc, asc } from 'drizzle-orm';
import * as schema from '../database/health/schema';

export interface HealthCheckResponse {
    id: number;
    healthCheckUuid: string;
    triggerType: string;
    triggerSource: string | null;
    status: string;
    totalWorkers: number;
    completedWorkers: number;
    passedWorkers: number;
    failedWorkers: number;
    overallHealthScore: number;
    aiAnalysis: string | null;
    aiRecommendations: string | null;
    startedAt: number;
    completedAt: number | null;
    timeoutAt: number | null;
    createdAt: number;
}

export interface WorkerHealthCheckResponse {
    id: number;
    workerCheckUuid: string;
    healthCheckUuid: string;
    workerName: string;
    workerType: string;
    workerUrl: string | null;
    status: string;
    overallStatus: string | null;
    healthScore: number;
    createdAt: number;
    completedAt: number | null;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
}

export class HealthOps extends BaseWorkerEntrypoint<CoreEnv> {
    private dbService = createDatabaseService(this.env);

    // ========================================
    // HEALTH CHECK OPERATIONS
    // ========================================

    /**
     * Get health check by UUID
     */
    async getHealthCheck(params: {
        healthCheckUuid: string;
    }): Promise<HealthCheckResponse | null> {
        const [check] = await this.dbService.health
            .select()
            .from(schema.healthChecks)
            .where(eq(schema.healthChecks.healthCheckUuid, params.healthCheckUuid))
            .limit(1);

        if (!check) return null;

        return {
            id: check.id,
            healthCheckUuid: check.healthCheckUuid,
            triggerType: check.triggerType,
            triggerSource: check.triggerSource ?? null,
            status: check.status ?? 'running',
            totalWorkers: check.totalWorkers ?? 0,
            completedWorkers: check.completedWorkers ?? 0,
            passedWorkers: check.passedWorkers ?? 0,
            failedWorkers: check.failedWorkers ?? 0,
            overallHealthScore: check.overallHealthScore ?? 0.0,
            aiAnalysis: check.aiAnalysis ?? null,
            aiRecommendations: check.aiRecommendations ?? null,
            startedAt: check.startedAt ?? Date.now(),
            completedAt: check.completedAt ?? null,
            timeoutAt: check.timeoutAt ?? null,
            createdAt: check.createdAt ?? Date.now(),
        };
    }

    /**
     * Get health checks with filters
     */
    async getHealthChecks(params: {
        triggerType?: string;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<PaginatedResponse<HealthCheckResponse>> {
        const limit = params.limit ?? 50;
        const offset = params.offset ?? 0;

        const conditions = [];
        if (params.triggerType) {
            conditions.push(eq(schema.healthChecks.triggerType, params.triggerType));
        }
        if (params.status) {
            conditions.push(eq(schema.healthChecks.status, params.status));
        }

        const checks = await this.dbService.health
            .select()
            .from(schema.healthChecks)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(schema.healthChecks.startedAt))
            .limit(limit)
            .offset(offset);

        // Get total count
        const allChecks = await this.dbService.health
            .select()
            .from(schema.healthChecks)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = allChecks.length;

        return {
            data: checks.map(check => ({
                id: check.id,
                healthCheckUuid: check.healthCheckUuid,
                triggerType: check.triggerType,
                triggerSource: check.triggerSource ?? null,
                status: check.status ?? 'running',
                totalWorkers: check.totalWorkers ?? 0,
                completedWorkers: check.completedWorkers ?? 0,
                passedWorkers: check.passedWorkers ?? 0,
                failedWorkers: check.failedWorkers ?? 0,
                overallHealthScore: check.overallHealthScore ?? 0.0,
                aiAnalysis: check.aiAnalysis ?? null,
                aiRecommendations: check.aiRecommendations ?? null,
                startedAt: check.startedAt ?? Date.now(),
                completedAt: check.completedAt ?? null,
                timeoutAt: check.timeoutAt ?? null,
                createdAt: check.createdAt ?? Date.now(),
            })),
            pagination: {
                limit,
                offset,
                total,
                hasMore: offset + limit < total,
            },
        };
    }

    /**
     * Create health check
     */
    async createHealthCheck(params: {
        healthCheckUuid: string;
        triggerType: string;
        triggerSource?: string;
        totalWorkers?: number;
        timeoutAt?: number;
    }): Promise<{ id: number }> {
        const [check] = await this.dbService.health
            .insert(schema.healthChecks)
            .values({
                healthCheckUuid: params.healthCheckUuid,
                triggerType: params.triggerType,
                triggerSource: params.triggerSource ?? null,
                totalWorkers: params.totalWorkers ?? 0,
                timeoutAt: params.timeoutAt ?? null,
                status: 'running',
            })
            .returning();

        return { id: check.id };
    }

    /**
     * Update health check
     */
    async updateHealthCheck(params: {
        healthCheckUuid: string;
        status?: string;
        completedWorkers?: number;
        passedWorkers?: number;
        failedWorkers?: number;
        overallHealthScore?: number;
        aiAnalysis?: string;
        aiRecommendations?: string;
        completedAt?: number;
    }): Promise<{ ok: boolean }> {
        const updateData: Partial<typeof schema.healthChecks.$inferInsert> = {};

        if (params.status !== undefined) updateData.status = params.status;
        if (params.completedWorkers !== undefined) updateData.completedWorkers = params.completedWorkers;
        if (params.passedWorkers !== undefined) updateData.passedWorkers = params.passedWorkers;
        if (params.failedWorkers !== undefined) updateData.failedWorkers = params.failedWorkers;
        if (params.overallHealthScore !== undefined) updateData.overallHealthScore = params.overallHealthScore;
        if (params.aiAnalysis !== undefined) updateData.aiAnalysis = params.aiAnalysis;
        if (params.aiRecommendations !== undefined) updateData.aiRecommendations = params.aiRecommendations;
        if (params.completedAt !== undefined) updateData.completedAt = params.completedAt;

        await this.dbService.health
            .update(schema.healthChecks)
            .set(updateData)
            .where(eq(schema.healthChecks.healthCheckUuid, params.healthCheckUuid));

        return { ok: true };
    }

    // ========================================
    // WORKER HEALTH CHECK OPERATIONS
    // ========================================

    /**
     * Get worker health check by UUID
     */
    async getWorkerHealthCheck(params: {
        workerCheckUuid: string;
    }): Promise<WorkerHealthCheckResponse | null> {
        const [check] = await this.dbService.health
            .select()
            .from(schema.workerHealthChecks)
            .where(eq(schema.workerHealthChecks.workerCheckUuid, params.workerCheckUuid))
            .limit(1);

        if (!check) return null;

        return {
            id: check.id,
            workerCheckUuid: check.workerCheckUuid,
            healthCheckUuid: check.healthCheckUuid,
            workerName: check.workerName,
            workerType: check.workerType,
            workerUrl: check.workerUrl ?? null,
            status: check.status ?? 'pending',
            overallStatus: check.overallStatus ?? null,
            healthScore: check.healthScore ?? 0.0,
            createdAt: check.createdAt ?? Date.now(),
            completedAt: check.completedAt ?? null,
        };
    }

    /**
     * Get worker health checks by health check UUID
     */
    async getWorkerHealthChecks(params: {
        healthCheckUuid: string;
        limit?: number;
        offset?: number;
    }): Promise<PaginatedResponse<WorkerHealthCheckResponse>> {
        const limit = params.limit ?? 100;
        const offset = params.offset ?? 0;

        const checks = await this.dbService.health
            .select()
            .from(schema.workerHealthChecks)
            .where(eq(schema.workerHealthChecks.healthCheckUuid, params.healthCheckUuid))
            .orderBy(desc(schema.workerHealthChecks.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count
        const allChecks = await this.dbService.health
            .select()
            .from(schema.workerHealthChecks)
            .where(eq(schema.workerHealthChecks.healthCheckUuid, params.healthCheckUuid));

        const total = allChecks.length;

        return {
            data: checks.map(check => ({
                id: check.id,
                workerCheckUuid: check.workerCheckUuid,
                healthCheckUuid: check.healthCheckUuid,
                workerName: check.workerName,
                workerType: check.workerType,
                workerUrl: check.workerUrl ?? null,
                status: check.status ?? 'pending',
                overallStatus: check.overallStatus ?? null,
                healthScore: check.healthScore ?? 0.0,
                createdAt: check.createdAt ?? Date.now(),
                completedAt: check.completedAt ?? null,
            })),
            pagination: {
                limit,
                offset,
                total,
                hasMore: offset + limit < total,
            },
        };
    }

    /**
     * Create worker health check
     */
    async createWorkerHealthCheck(params: {
        workerCheckUuid: string;
        healthCheckUuid: string;
        workerName: string;
        workerType: string;
        workerUrl?: string;
    }): Promise<{ id: number }> {
        const [check] = await this.dbService.health
            .insert(schema.workerHealthChecks)
            .values({
                workerCheckUuid: params.workerCheckUuid,
                healthCheckUuid: params.healthCheckUuid,
                workerName: params.workerName,
                workerType: params.workerType,
                workerUrl: params.workerUrl ?? null,
                status: 'pending',
            })
            .returning();

        return { id: check.id };
    }

    /**
     * Update worker health check
     */
    async updateWorkerHealthCheck(params: {
        workerCheckUuid: string;
        status?: string;
        overallStatus?: string;
        healthScore?: number;
        completedAt?: number;
    }): Promise<{ ok: boolean }> {
        const updateData: Partial<typeof schema.workerHealthChecks.$inferInsert> = {};

        if (params.status !== undefined) updateData.status = params.status;
        if (params.overallStatus !== undefined) updateData.overallStatus = params.overallStatus;
        if (params.healthScore !== undefined) updateData.healthScore = params.healthScore;
        if (params.completedAt !== undefined) updateData.completedAt = params.completedAt;

        await this.dbService.health
            .update(schema.workerHealthChecks)
            .set(updateData)
            .where(eq(schema.workerHealthChecks.workerCheckUuid, params.workerCheckUuid));

        return { ok: true };
    }
}

