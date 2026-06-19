export type UserRole = 'admin' | 'loan_giver' | 'verifier';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  preferredLanguage: 'en' | 'hi';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface FirmSettings {
  id: string;
  firmName: string;
  defaultLanguage: 'en' | 'hi';
  tdsDefaultEnabled: boolean;
  tdsRateDefault: number;
  reminderDaysBeforeDue: number;
  quarterGraceDaysDefault: number;
  autoRenewDefault: boolean;
  supportedCommodities: string[];
  ocrProvider: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Borrower {
  id: string;
  fullName: string;
  mobileNumber: string;
  whatsappNumber: string;
  address: string;
  idProofType: string;
  idProofNumber: string;
  notes: string;
  photoUrl?: string;
  agreementPhotoUrls: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Broker {
  id: string;
  name: string;
  whatsappNumber: string;
  commissionRupeesPerLakhPerYear: number;
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Commodity {
  id: string;
  commodityNameEn: string;
  commodityNameHi: string;
  unit: string;
  isActive: boolean;
  createdAt: Date;
}

export interface MandiPriceEntry {
  id: string;
  mandiName: string;
  entryDate: Date;
  commodityId: string;
  commodityNameSnapshot: string;
  priceLow: number;
  priceMedium: number;
  priceHigh: number;
  unit: string;
  sourceType: 'ocr' | 'manual' | 'official';
  sourceImageUrl?: string;
  rawOcrText?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseReceipt {
  id: string;
  receiptNumber: string;
  borrowerId: string;
  commodityId: string;
  quantity: number;
  receiptAmount: number;
  issueDate: Date;
  expiryDate: Date;
  receiptFileUrl: string;
  extraFiles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type GraceRuleMode = 'capitalize_immediately' | 'allow_grace';
export type LoanStatus = 'active' | 'due' | 'overdue' | 'closed' | 'renewed';
export type RiskStatus = 'safe' | 'warning' | 'risky';

export interface Loan {
  id: string;
  loanNumber: string;
  borrowerId: string;
  brokerId?: string;
  warehouseReceiptId?: string;
  commodityId: string;
  mandiReferencePriceId?: string;
  principalAmountInitial: number;
  principalAmountCurrent: number;
  sanctionedAmount: number;
  receiptAmount: number;
  annualInterestRate: number;
  interestCycleMonths: number;
  interestMode: 'compound';
  startDate: Date;
  nextRolloverDate: Date;
  dueDate: Date;
  graceRuleMode: GraceRuleMode;
  graceDays: number;
  autoRenewEnabled: boolean;
  tdsApplicable: boolean;
  tdsRate: number;
  status: LoanStatus;
  riskPercent: number;
  riskStatus: RiskStatus;
  notes: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanInterestCycle {
  id: string;
  loanId: string;
  cycleStartDate: Date;
  cycleEndDate: Date;
  interestAmountGross: number;
  tdsAmount: number;
  interestAmountNet: number;
  paidWithinGrace: boolean;
  capitalizedToPrincipal: boolean;
  principalBeforeCycle: number;
  principalAfterCycle: number;
  status: 'pending' | 'processed' | 'paid' | 'capitalized';
  processedAt?: Date;
  processedBy?: string;
}

export type PaymentType = 'interest' | 'principal' | 'mixed';

export interface Payment {
  id: string;
  loanId: string;
  paymentType: PaymentType;
  amountReceived: number;
  allocatedInterestAmount: number;
  allocatedPrincipalAmount: number;
  paymentDate: Date;
  paymentMode: string;
  referenceNumber: string;
  notes: string;
  receivedBy: string;
  createdAt: Date;
}

export interface Bill {
  id: string;
  loanId: string;
  borrowerId: string;
  billNumber: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  tdsAmount: number;
  dueDate: Date;
  pdfUrl?: string;
  generatedBy: string;
  generatedAt: Date;
}

export interface ReminderTemplate {
  id: string;
  name: string;
  channel: 'push' | 'whatsapp';
  triggerType: 'pre_due' | 'due_today' | 'quarter_due' | 'overdue' | 'manual';
  templateBody: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ReminderChannel = 'push' | 'whatsapp';
export type ReminderTriggerType = 'pre_due' | 'due_today' | 'quarter_due' | 'overdue' | 'manual';
export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled';

export interface Reminder {
  id: string;
  loanId: string;
  borrowerId: string;
  channel: ReminderChannel;
  triggerType: ReminderTriggerType;
  messageBody: string;
  scheduledAt: Date;
  sentAt?: Date;
  status: ReminderStatus;
  createdBy: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  relatedEntityType: string;
  relatedEntityId: string;
  isRead: boolean;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  oldValueJson?: Record<string, unknown>;
  newValueJson?: Record<string, unknown>;
  reason?: string;
  createdAt: Date;
}

export interface DashboardMetrics {
  totalActiveLoans: number;
  totalDueAmount: number;
  totalInterestEarned: number;
  totalTds: number;
  upcomingDueReminders: number;
  quarterRolloverReminders: number;
  safeLoans: number;
  warningLoans: number;
  riskyLoans: number;
}

export interface LoanCardData {
  id: string;
  borrowerName: string;
  commodity: string;
  principalAmount: number;
  currentAmount: number;
  dueDate: Date;
  status: LoanStatus;
  riskStatus: RiskStatus;
  riskPercent: number;
  miniPriceChartData: number[];
}