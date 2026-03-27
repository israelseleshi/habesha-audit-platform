function normalizeToken(value) {
  return String(value || '').trim().toLowerCase();
}

export function formatDay(value, tx) {
  const key = normalizeToken(value);
  const map = {
    saturday: tx('Saturday', 'ቅዳሜ'),
    sunday: tx('Sunday', 'እሑድ'),
    thursday: tx('Thursday', 'ሐሙስ'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatAuditStatus(value, tx) {
  const key = normalizeToken(value);
  const map = {
    submitted: tx('Submitted', 'ተልኳል'),
    in_progress: tx('In Progress', 'በሂደት ላይ'),
    not_started: tx('Not Started', 'አልተጀመረም'),
    signed_off: tx('Signed Off', 'ተፈርሟል'),
    escalated: tx('Escalated', 'ወደ አስቸኳይ ጉዳይ ተላልፏል'),
    draft: tx('Draft', 'ረቂቅ'),
    resolved: tx('Resolved', 'ተፈቷል'),
    acknowledged: tx('Acknowledged', 'ተቀብሏል'),
    open: tx('Open', 'ክፍት'),
    pending: tx('Pending', 'በመጠባበቅ ላይ'),
    approved: tx('Approved', 'ፀድቋል'),
    rejected: tx('Rejected', 'ተከልክሏል'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatEscalationStatus(value, tx) {
  const key = normalizeToken(value);
  const map = {
    open: tx('Open', 'ክፍት'),
    acknowledged: tx('Acknowledged', 'ተቀብሏል'),
    resolved: tx('Resolved', 'ተፈቷል'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatTier(value, tx) {
  const key = normalizeToken(value);
  const map = {
    compliant: tx('Compliant', 'ተገዢ'),
    warning: tx('Warning', 'ማስጠንቀቂያ'),
    critical: tx('Critical', 'ከባድ'),
    pending: tx('Pending', 'በመጠባበቅ ላይ'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatOutletType(value, tx) {
  const key = normalizeToken(value);
  const map = {
    tej_house: tx('Tej House', 'ተጅ ቤት'),
    bar_restaurant: tx('Bar & Restaurant', 'ባር እና ሬስቶራንት'),
    supermarket: tx('Supermarket', 'ሱፐርማርኬት'),
    hotel: tx('Hotel', 'ሆቴል'),
    nightclub: tx('Nightclub', 'ናይት ክለብ'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatPromotionMechanic(value, tx) {
  const key = normalizeToken(value);
  const map = {
    visibility: tx('Visibility', 'ታይነት'),
    price_execution: tx('Price Execution', 'የዋጋ አፈጻጸም'),
    sku_availability: tx('SKU Availability', 'የምርት አቅርቦት'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatQuestionSection(value, tx) {
  const key = normalizeToken(value);
  const map = {
    promotion_visibility: tx('Promotion Visibility', 'የፕሮሞሽን ታይነት'),
    price_execution: tx('Price Execution', 'የዋጋ አፈጻጸም'),
    sku_availability: tx('SKU Availability', 'የምርት አቅርቦት'),
    promoter_presence: tx('Promoter Presence', 'የፕሮሞተር መገኘት'),
    winner_verification: tx('Winner Verification', 'የአሸናፊ ማረጋገጫ'),
    customer_awareness: tx('Customer Awareness', 'የደንበኛ ግንዛቤ'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatResponseType(value, tx) {
  const key = normalizeToken(value);
  const map = {
    yes_no: tx('Yes / No', 'አዎ / አይ'),
    score_1_5: tx('Score 1-5', 'ውጤት 1-5'),
    multiple_choice: tx('Multiple Choice', 'ብዙ አማራጮች'),
    numeric: tx('Numeric', 'ቁጥራዊ'),
    text: tx('Text', 'ጽሑፍ'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatTriggerReason(value, tx) {
  const key = normalizeToken(value);
  const map = {
    low_compliance_score: tx('Low Compliance Score', 'ዝቅተኛ የተገዢነት ውጤት'),
    promoter_absent: tx('Promoter Absent', 'ፕሮሞተር አልተገኘም'),
    branded_materials_missing: tx('Branded Materials Missing', 'የብራንድ እቃዎች ጎድለዋል'),
    manual_flag: tx('Manual Flag', 'በእጅ የተነሳ ምልክት'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatTriggerReasons(values, tx) {
  if (!Array.isArray(values) || values.length === 0) {
    return formatTriggerReason('manual_flag', tx);
  }

  return values.map((item) => formatTriggerReason(item, tx)).join(', ');
}

export function formatApprovalStatus(value, tx) {
  const key = normalizeToken(value);
  const map = {
    approved: tx('Approved', 'ፀድቋል'),
    pending: tx('Pending', 'በመጠባበቅ ላይ'),
    rejected: tx('Rejected', 'ተከልክሏል'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatReportPeriod(value, tx) {
  const key = normalizeToken(value);
  const map = {
    weekly: tx('Weekly', 'ሳምንታዊ'),
    monthly: tx('Monthly', 'ወርሃዊ'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatOutputType(value, tx) {
  const key = normalizeToken(value);
  const map = {
    pdf: tx('PDF', 'ፒዲኤፍ'),
    excel: tx('Excel', 'ኤክሴል'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatChannel(value, tx) {
  const key = normalizeToken(value);
  const map = {
    email: tx('Email', 'ኢሜይል'),
    'meeting + pdf': tx('Meeting + PDF', 'ስብሰባ + ፒዲኤፍ'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}

export function formatViewRole(value, tx) {
  const key = normalizeToken(value);
  const map = {
    supervisor: tx('Supervisor', 'ተቆጣጣሪ'),
    project_manager: tx('Project Manager', 'ፕሮጀክት አስተዳዳሪ'),
    client_executive: tx('Client Executive', 'የደንበኛ ከፍተኛ አመራር'),
  };

  return map[key] || value || tx('Unknown', 'አልታወቀም');
}
