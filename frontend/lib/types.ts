export type MilestoneStatus = "Locked" | "Released" | "Disputed";

export interface Milestone {
  amount: bigint;
  status: MilestoneStatus;
}

export interface Escrow {
  creator: string;
  recipient: string;
  arbiterContract: string;
  milestones: Milestone[];
  token: string;
}

/** The four distinct error states the UI must surface, per spec Section 5. */
export type AppErrorKind =
  | "wallet-not-found"
  | "signature-rejected"
  | "insufficient-balance"
  | "not-authorized";

export interface AppError {
  kind: AppErrorKind;
  message: string;
}
