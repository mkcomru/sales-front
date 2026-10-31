export type AiRoutingSkipReason = 'billing_hold' | 'billing_hold_zero_balance' | 'sync_in_progress';

export function labelForAiRoutingSkip(reason: AiRoutingSkipReason): string {
  switch (reason) {
    case 'billing_hold':
      return 'Ассистент не отвечает: биллинг на паузе или недостаточно средств.';
    case 'billing_hold_zero_balance':
      return 'Ассистент не отвечает: баланс компании равен нулю.';
    case 'sync_in_progress':
      return 'Ассистент ждёт окончания синхронизации канала.';
  }
}

export function parseAiRoutingSkipReason(raw: string): AiRoutingSkipReason | null {
  if (raw === 'billing_hold' || raw === 'billing_hold_zero_balance' || raw === 'sync_in_progress') {
    return raw;
  }
  return null;
}
