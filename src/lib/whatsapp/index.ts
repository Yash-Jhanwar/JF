export interface WhatsAppMessageVariables {
  borrowerName: string;
  principalAmount: number;
  currentAmount: number;
  dueDate: string;
  interestDue: number;
  tdsAmount?: number;
  commodityName: string;
  loanNumber: string;
  firmName: string;
}

export const defaultReminderTemplates = {
  pre_due: `नमस्ते {borrowerName} जी,
आपका ऋण {loanNumber} ({commodityName}) की किश्त ₹{interestDue} दिनांक {dueDate} को देय है।
कुल बकाया: ₹{currentAmount}
कृपया समय पर भुगतान करें।
धन्यवाद,
{firmName}`,

  due_today: `नमस्ते {borrowerName} जी,
आज आपके ऋण {loanNumber} ({commodityName}) की किश्त ₹{interestDue} देय है।
कुल बकाया: ₹{currentAmount}
कृपया आज ही भुगतान करें।
धन्यवाद,
{firmName}`,

  quarter_due: `नमस्ते {borrowerName} जी,
आपके ऋण {loanNumber} ({commodityName}) का तिमाही ब्याज ₹{interestDue} देय है।
मूलधन: ₹{principalAmount}
कुल बकाया: ₹{currentAmount}
देय तिथि: {dueDate}
कृपया भुगतान करें।
धन्यवाद,
{firmName}`,

  overdue: `नमस्ते {borrowerName} जी,
आपका ऋण {loanNumber} ({commodityName}) ओवरड्यू है।
बकाया ब्याज: ₹{interestDue}
कुल बकाया: ₹{currentAmount}
मूल देय तिथि: {dueDate}
कृपया तुरंत संपर्क करें।
धन्यवाद,
{firmName}`,

  payment_received: `नमस्ते {borrowerName} जी,
आपके ऋण {loanNumber} के लिए ₹{amount} का भुगतान प्राप्त हुआ।
शेष बकाया: ₹{remainingAmount}
धन्यवाद,
{firmName}`,
};

export function buildWhatsAppMessage(
  template: string,
  variables: WhatsAppMessageVariables
): string {
  let message = template;
  
  const replacements: Record<string, string> = {
    '{borrowerName}': variables.borrowerName,
    '{principalAmount}': formatIndianCurrency(variables.principalAmount),
    '{currentAmount}': formatIndianCurrency(variables.currentAmount),
    '{dueDate}': variables.dueDate,
    '{interestDue}': formatIndianCurrency(variables.interestDue),
    '{tdsAmount}': variables.tdsAmount ? formatIndianCurrency(variables.tdsAmount) : '0',
    '{commodityName}': variables.commodityName,
    '{loanNumber}': variables.loanNumber,
    '{firmName}': variables.firmName,
  };

  Object.entries(replacements).forEach(([key, value]) => {
    message = message.replace(new RegExp(key, 'g'), value);
  });

  return message;
}

export function generateWhatsAppUrl(phoneNumber: string, message: string): string {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/91${cleanPhone}?text=${encodedMessage}`;
}

export function generateWhatsAppClickLink(
  phoneNumber: string,
  template: string,
  variables: WhatsAppMessageVariables
): string {
  const message = buildWhatsAppMessage(template, variables);
  return generateWhatsAppUrl(phoneNumber, message);
}

function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isValidIndianPhoneNumber(phone: string): boolean {
  const clean = sanitizePhoneNumber(phone);
  return clean.length === 10 && /^[6-9]\d{9}$/.test(clean);
}