// Which vendors are due an RFQ nudge, and which have run out of time.
// Pure so the date arithmetic can be tested without a database or a mail
// server — the two things that make this kind of job hard to trust.

/** Send the nudge this many days before the submission deadline. */
export const REMINDER_LEAD_DAYS = 2;

/** Never send two reminders inside this window, however often the job runs. */
export const REMINDER_COOLDOWN_HOURS = 20;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface RfqVendorState {
  status: string;
  /** Null means the RFQ was never actually sent to this vendor. */
  sentDate: Date | null;
  submissionDeadline: Date | null;
  lastReminderDate: Date | null;
}

/**
 * Due a reminder: still awaiting a quote, the RFQ went out, the deadline is
 * inside the lead window but not yet passed, and we haven't just nudged them.
 */
export function needsReminder(v: RfqVendorState, now: Date): boolean {
  if (v.status !== "PENDING") return false;
  if (!v.sentDate || !v.submissionDeadline) return false;

  const msLeft = v.submissionDeadline.getTime() - now.getTime();
  // Past the deadline is the expiry case below, not a reminder.
  if (msLeft <= 0 || msLeft > REMINDER_LEAD_DAYS * DAY_MS) return false;

  if (!v.lastReminderDate) return true;
  return now.getTime() - v.lastReminderDate.getTime() >= REMINDER_COOLDOWN_HOURS * HOUR_MS;
}

/**
 * Out of time: the deadline has passed with no quote. Marked EXPIRED, which is
 * what the workflow document calls "No Response".
 */
export function hasExpired(v: RfqVendorState, now: Date): boolean {
  if (v.status !== "PENDING") return false;
  if (!v.submissionDeadline) return false; // no deadline, nothing to miss
  return v.submissionDeadline.getTime() <= now.getTime();
}
