/**
 * Ops Specialist — Automated operational role handling:
 * - Conflict resolution (merge/branch collisions)
 * - Delivery report generation
 * - Follow-up issue creation and final QA
 *
 * Integrated as an orchestrator submodule. Called by queue worker or API route.
 */

import { githubRemediation } from '../worker/services/remediation/githubRemediation'
import type { Env } from '../worker/types'

export const OpsSpecialist = {
  /** Attempt to clear merge conflicts via core-github-api and create a PR */
  async resolveConflict(env: Env, repo: string, branch: string, conflictFiles: string[]) {
    const note = `Conflict detected in ${repo}:${branch} → ${conflictFiles.join(', ')}`
    await githubRemediation.createIssue(
      env,
      {
        error_code: 'merge_conflict',
        file_path: conflictFiles[0] ?? 'unknown',
        message: note,
      },
      'Ops Specialist auto-detected conflict and opened an issue.'
    )
  },

  /** Generate final delivery report from D1 logs and followups */
  async generateDeliveryReport(env: Env, orderId: string) {
    const { results } = await env.DB.prepare(
      `SELECT * FROM followups WHERE order_id = ? ORDER BY impact_level ASC`
    ).bind(orderId).all()

    const { results: ops } = await env.DB.prepare(
      `SELECT * FROM operation_logs WHERE order_id = ?`
    ).bind(orderId).all()

    return {
      order_id: orderId,
      summary: {
        issues: results.length,
        ops_count: ops.length,
        last_updated: new Date().toISOString(),
      },
      followups: results,
      operations: ops,
    }
  },

  /** Final QA routine invoked at the end of each delivery cycle */
  async finalQA(env: Env, orderId: string) {
    const report = await OpsSpecialist.generateDeliveryReport(env, orderId)
    const blocked = report.followups.filter((f: any) => f.type === 'blocked')

    if (blocked.length > 0) {
      await githubRemediation.createIssue(
        env,
        {
          order_id: orderId,
          file_path: blocked[0].file_path ?? 'unknown',
          error_code: 'final_qa_blocked',
          message: `${blocked.length} unresolved blockers.`,
        },
        'Final QA failed — unresolved followups remain.'
      )
    }

    return {
      report,
      status: blocked.length ? 'failed' : 'passed',
    }
  },
}
