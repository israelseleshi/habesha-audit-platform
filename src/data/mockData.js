const zones = ['AA-C', 'AA-N', 'AA-E', 'AA-W', 'AA-S'];
const segments = ['tej_house', 'bar_restaurant', 'supermarket', 'hotel', 'nightclub'];
const mechanics = ['visibility', 'price_execution', 'sku_availability'];

const enumerators = [
  { id: 'enum-001', name: 'Yonas Girma', assignedZone: 'AA-C' },
  { id: 'enum-002', name: 'Hanna Kebede', assignedZone: 'AA-N' },
  { id: 'enum-003', name: 'Mekdes Ali', assignedZone: 'AA-W' },
  { id: 'enum-004', name: 'Abel Tadesse', assignedZone: 'AA-E' },
  { id: 'enum-005', name: 'Liya Demissie', assignedZone: 'AA-S' },
  { id: 'enum-006', name: 'Samuel Worku', assignedZone: 'AA-C' },
];

const zoneCenters = {
  'AA-C': { lat: 9.017, lng: 38.762 },
  'AA-N': { lat: 9.047, lng: 38.79 },
  'AA-E': { lat: 9.03, lng: 38.82 },
  'AA-W': { lat: 9.02, lng: 38.736 },
  'AA-S': { lat: 8.99, lng: 38.76 },
};

function createMockPhoto(label, colorA, colorB = '#1a1a1a') {
  const safeLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='${colorA}' /><stop offset='100%' stop-color='${colorB}' /></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='54%' text-anchor='middle' fill='#f5edd6' font-family='Arial' font-size='30'>${safeLabel}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function outletLatLng(zone, index) {
  const center = zoneCenters[zone];
  const ring = Math.floor(index / 5) + 1;
  const angle = (index * 37) % 360;
  const radius = 0.002 + ring * 0.00035;
  const lat = center.lat + Math.sin((angle * Math.PI) / 180) * radius;
  const lng = center.lng + Math.cos((angle * Math.PI) / 180) * radius;

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

function computeScore(seed, weekOffset) {
  const base = 35 + ((seed * 11 + weekOffset * 7) % 64);
  return Math.min(99, Number(base.toFixed(2)));
}

function scoreToTier(score) {
  if (score >= 75) {
    return 'compliant';
  }

  if (score >= 50) {
    return 'warning';
  }

  if (score > 0) {
    return 'critical';
  }

  return 'pending';
}

function scoreToAuditStatus(score) {
  if (score >= 80) {
    return 'signed_off';
  }

  if (score >= 45) {
    return 'submitted';
  }

  return 'escalated';
}

export const mockEnumerators = enumerators;

export const mockOutlets = Array.from({ length: 80 }, (_, idx) => {
  const i = idx + 1;
  const zone = zones[idx % zones.length];
  const segment = segments[idx % segments.length];
  const point = outletLatLng(zone, idx);

  return {
    id: `outlet-${String(i).padStart(3, '0')}`,
    name: `Habesha Outlet ${String(i).padStart(2, '0')}`,
    outletType: segment,
    zone,
    subCity: ['Kirkos', 'Arada', 'Bole', 'Yeka', 'Addis Ketema'][idx % 5],
    addressText: `Block ${i}, ${zone} corridor`,
    lat: point.lat,
    lng: point.lng,
    ownerName: `Owner ${i}`,
    ownerPhone: `+25191123${String(i).padStart(4, '0')}`,
  };
});

export const mockAuditVisits = mockOutlets.flatMap((outlet, index) => {
  if ((index + 1) % 9 === 0) {
    return [];
  }

  return Array.from({ length: 6 }, (_, weekIndex) => {
    const seed = index + 1;
    const score = computeScore(seed, weekIndex);
    const enumerator = enumerators[(seed + weekIndex) % enumerators.length];
    const day = ['saturday', 'sunday', 'thursday'][weekIndex % 3];
    const visitDate = new Date(Date.UTC(2026, 1, 15 + weekIndex * 7 + (seed % 6)));
    const status = scoreToAuditStatus(score);
    const escalationFlag = score < 40 || (seed + weekIndex) % 11 === 0;

    return {
      id: `audit-${outlet.id}-${weekIndex + 1}`,
      outletId: outlet.id,
      outletName: outlet.name,
      outletZone: outlet.zone,
      outletType: outlet.outletType,
      visitDate: visitDate.toISOString().slice(0, 10),
      visitDay: day,
      visitTimestamp: new Date(visitDate.getTime() + (8 + (seed % 7)) * 3600 * 1000).toISOString(),
      enumeratorId: enumerator.id,
      enumeratorName: enumerator.name,
      complianceScore: score,
      complianceTier: scoreToTier(score),
      status,
      escalationFlag,
      promotionMechanic: mechanics[(seed + weekIndex) % mechanics.length],
      remarks:
        score < 50
          ? 'Execution gap observed, escalation review recommended.'
          : 'Execution aligned with brief and documented with evidence.',
      gpsLat: outlet.lat,
      gpsLng: outlet.lng,
      photos: [
        createMockPhoto('POSM Evidence', '#6b5d2a'),
        createMockPhoto('Price Board', '#2f5b64'),
        createMockPhoto('Promoter Presence', '#4d6a32'),
      ],
      prizesExpected: 8 + ((seed + weekIndex) % 10),
      prizesIssued: 6 + ((seed + weekIndex * 2) % 8),
      prizesVerified: 4 + ((seed + weekIndex * 3) % 7),
    };
  });
});

export const mockLatestAuditByOutlet = mockOutlets.reduce((acc, outlet) => {
  const related = mockAuditVisits
    .filter((audit) => audit.outletId === outlet.id)
    .sort((a, b) => (a.visitTimestamp < b.visitTimestamp ? 1 : -1));

  acc[outlet.id] = related[0] || null;
  return acc;
}, {});

export const mockEscalations = mockAuditVisits
  .filter((audit) => audit.escalationFlag)
  .slice(0, 24)
  .map((audit, idx) => {
    const createdAt = new Date(new Date(audit.visitTimestamp).getTime() + 45 * 60 * 1000);
    const deadlineAt = new Date(createdAt.getTime() + 24 * 3600 * 1000);
    const status = idx % 4 === 0 ? 'resolved' : idx % 3 === 0 ? 'acknowledged' : 'open';

    return {
      id: `esc-${String(idx + 1).padStart(3, '0')}`,
      auditId: audit.id,
      outletId: audit.outletId,
      outletName: audit.outletName,
      zone: audit.outletZone,
      triggerReason:
        audit.complianceScore < 40
          ? ['low_compliance_score', 'promoter_absent']
          : ['manual_flag'],
      status,
      createdAt: createdAt.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      resolvedAt:
        status === 'resolved'
          ? new Date(createdAt.getTime() + (8 + (idx % 7)) * 3600 * 1000).toISOString()
          : null,
    };
  });

export const mockClientCommunications = [
  {
    id: 'comm-001',
    reportType: 'Weekly Compliance Report',
    sentAt: '2026-03-05T09:10:00+03:00',
    recipient: 'Tigist Bekele',
    channel: 'Email',
    approvalStatus: 'approved',
    notes: 'Approved with minor commentary on zone segmentation.',
  },
  {
    id: 'comm-002',
    reportType: 'Weekly Escalation Summary',
    sentAt: '2026-03-12T08:30:00+03:00',
    recipient: 'Tigist Bekele',
    channel: 'Email',
    approvalStatus: 'pending',
    notes: 'Awaiting executive confirmation.',
  },
  {
    id: 'comm-003',
    reportType: 'Monthly Performance Pack',
    sentAt: '2026-03-21T17:20:00+03:00',
    recipient: 'Habesha Activation Team',
    channel: 'Meeting + PDF',
    approvalStatus: 'approved',
    notes: 'Accepted for March review cycle.',
  },
];

export const mockReportRuns = [
  {
    id: 'report-run-001',
    period: 'Weekly',
    output: 'PDF',
    generatedAt: '2026-03-22T10:20:00+03:00',
    generatedBy: 'Dawit Alemu',
  },
  {
    id: 'report-run-002',
    period: 'Monthly',
    output: 'Excel',
    generatedAt: '2026-03-24T16:45:00+03:00',
    generatedBy: 'Dawit Alemu',
  },
];

export function getWeekLabel(isoDate) {
  const date = new Date(isoDate);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  return `W${week}`;
}

export function average(values) {
  if (values.length === 0) {
    return 0;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return Number((sum / values.length).toFixed(2));
}

export const mockPromoters = Array.from({ length: 18 }, (_, idx) => {
  const i = idx + 1;
  return {
    id: `promoter-${String(i).padStart(3, '0')}`,
    fullName: `Promoter ${i}`,
    phone: `+25192255${String(i).padStart(4, '0')}`,
    assignedDays: ['saturday', 'sunday', i % 3 === 0 ? 'thursday' : 'sunday'],
  };
});

export const mockPromoterAssignments = mockOutlets.slice(0, 48).map((outlet, idx) => {
  const promoter = mockPromoters[idx % mockPromoters.length];
  const startedAt = new Date(Date.UTC(2026, 0, 5 + (idx % 12) * 6));
  const endedAt = idx % 5 === 0 ? null : new Date(startedAt.getTime() + (18 + (idx % 7)) * 86400000);

  return {
    id: `promoter-assignment-${idx + 1}`,
    outletId: outlet.id,
    outletName: outlet.name,
    promoterId: promoter.id,
    promoterName: promoter.fullName,
    promoterPhone: promoter.phone,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt ? endedAt.toISOString() : null,
    assignedBy: ['Hiwot Tesfaye', 'Dawit Alemu'][idx % 2],
  };
});

export const mockPrizeLogs = mockAuditVisits.slice(0, 180).map((audit, idx) => {
  const promoter = mockPromoters[idx % mockPromoters.length];
  const winnerNo = idx + 1;
  const loggedAt = new Date(new Date(audit.visitTimestamp).getTime() + (idx % 90) * 60000);

  return {
    id: `prize-log-${String(winnerNo).padStart(4, '0')}`,
    auditId: audit.id,
    outletId: audit.outletId,
    outletName: audit.outletName,
    winnerName: `Winner ${winnerNo}`,
    winnerPhone: `+25193344${String(winnerNo).padStart(4, '0')}`,
    prizeDescription: ['Habesha Gift Pack', 'Branded Glass Set', 'Cash Voucher'][idx % 3],
    promoterId: promoter.id,
    promoterName: promoter.fullName,
    promoterSigned: idx % 4 !== 0,
    redemptionSlipUrl: createMockPhoto('Signed Slip', '#4c3e1f'),
    winnerPhotoUrl: createMockPhoto('Winner Verification', '#2f4f39'),
    loggedAt: loggedAt.toISOString(),
  };
});

export const mockQuestionnaireVersions = [
  {
    id: 'qv-001',
    versionNumber: 1,
    title: 'Baseline March Questionnaire',
    isActive: false,
    approvedBy: 'Tigist Bekele',
    approvedAt: '2026-03-02T10:20:00+03:00',
    createdAt: '2026-02-28T09:00:00+03:00',
  },
  {
    id: 'qv-002',
    versionNumber: 2,
    title: 'Week 3 Execution Alignment',
    isActive: true,
    approvedBy: 'Tigist Bekele',
    approvedAt: '2026-03-17T15:10:00+03:00',
    createdAt: '2026-03-15T08:30:00+03:00',
  },
];

export const mockQuestionnaireItems = [
  {
    id: 'qi-001',
    versionId: 'qv-002',
    section: 'promotion_visibility',
    itemKey: 'posm_placement',
    questionText: 'POSM correctly positioned according to brief?',
    responseType: 'yes_no',
    photoRequired: true,
    sortOrder: 1,
  },
  {
    id: 'qi-002',
    versionId: 'qv-002',
    section: 'promotion_visibility',
    itemKey: 'branded_material_condition',
    questionText: 'Condition score for branded materials (1-5).',
    responseType: 'score_1_5',
    photoRequired: true,
    sortOrder: 2,
  },
  {
    id: 'qi-003',
    versionId: 'qv-002',
    section: 'price_execution',
    itemKey: 'retail_price_correct',
    questionText: 'Promo SKU retail price matches approved list?',
    responseType: 'yes_no',
    photoRequired: true,
    sortOrder: 3,
  },
  {
    id: 'qi-004',
    versionId: 'qv-002',
    section: 'promoter_presence',
    itemKey: 'promoter_present',
    questionText: 'Promoter present during planned activation window?',
    responseType: 'yes_no',
    photoRequired: true,
    sortOrder: 4,
  },
  {
    id: 'qi-005',
    versionId: 'qv-002',
    section: 'winner_verification',
    itemKey: 'winner_photo',
    questionText: 'Winner verification photo captured in-app?',
    responseType: 'yes_no',
    photoRequired: true,
    sortOrder: 5,
  },
  {
    id: 'qi-006',
    versionId: 'qv-001',
    section: 'customer_awareness',
    itemKey: 'customer_awareness',
    questionText: 'Sampled customer understands mechanic?',
    responseType: 'multiple_choice',
    photoRequired: false,
    sortOrder: 1,
  },
];
