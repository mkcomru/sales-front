import type { TaskResponse } from '../types/api';

/** Evaluator-created follow-up tied to a stage ping rule (noise by default in lists). */
export function isStageRuleAutoPingTask(task: TaskResponse): boolean {
  return typeof task.ping_rule_id === 'number';
}

/** Assistant planned via schedule_reminder — not tied to stage rules; keep visible by default. */
export function isAgentScheduledFollowUpTask(task: TaskResponse): boolean {
  return (
    task.type === 'ai_scheduled' &&
    task.auto_action === 'send_followup_message' &&
    !isStageRuleAutoPingTask(task)
  );
}
