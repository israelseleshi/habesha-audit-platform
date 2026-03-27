import { useMemo, useState } from 'react';
import Button from '../../components/Button/Button';
import Dropdown from '../../components/Dropdown/Dropdown';
import { useToast } from '../../components/Toast/ToastContext';
import {
  average,
  getWeekLabel,
  mockAuditVisits,
  mockEscalations,
  mockOutlets,
} from '../../data/mockData';
import { formatOutletType, formatPromotionMechanic } from '../../i18n/localeText';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './Executive.module.css';

function toCsvValue(value) {
  const safe = String(value ?? '').replace(/"/g, '""');
  return `"${safe}"`;
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((line) => line.map((value) => toCsvValue(value)).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function scoreBadge(score) {
  if (score >= 75) {
    return 'status-badge status-badge--compliant';
  }

  if (score >= 50) {
    return 'status-badge status-badge--warning';
  }

  return 'status-badge status-badge--critical';
}

function createLinePath(points, width, height, maxValue) {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((point, idx) => {
      const x = (idx / Math.max(points.length - 1, 1)) * width;
      const y = height - (point / maxValue) * height;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function Executive() {
  const { tx } = useLanguage();
  const { showToast } = useToast();
  const [selectedSegment, setSelectedSegment] = useState('all');

  const segmentOptions = useMemo(
    () => [
      { value: 'all', label: tx('All Segments', 'ሁሉም ክፍሎች') },
      { value: 'tej_house', label: formatOutletType('tej_house', tx) },
      { value: 'bar_restaurant', label: formatOutletType('bar_restaurant', tx) },
      { value: 'supermarket', label: formatOutletType('supermarket', tx) },
      { value: 'hotel', label: formatOutletType('hotel', tx) },
      { value: 'nightclub', label: formatOutletType('nightclub', tx) },
    ],
    [tx]
  );

  const latestVisits = useMemo(() => {
    return mockOutlets
      .map((outlet) => {
        const related = mockAuditVisits
          .filter((visit) => visit.outletId === outlet.id)
          .sort((a, b) => (a.visitTimestamp < b.visitTimestamp ? 1 : -1));

        return related[0] || null;
      })
      .filter(Boolean);
  }, []);

  const filteredLatest = useMemo(() => {
    if (selectedSegment === 'all') {
      return latestVisits;
    }

    return latestVisits.filter((visit) => visit.outletType === selectedSegment);
  }, [latestVisits, selectedSegment]);

  const overallCompliance = useMemo(
    () => average(filteredLatest.map((visit) => visit.complianceScore)),
    [filteredLatest]
  );

  const zoneAverages = useMemo(() => {
    const grouped = filteredLatest.reduce((acc, visit) => {
      if (!acc[visit.outletZone]) {
        acc[visit.outletZone] = [];
      }

      acc[visit.outletZone].push(visit.complianceScore);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([zone, scores]) => ({ zone, score: average(scores) }))
      .sort((a, b) => b.score - a.score);
  }, [filteredLatest]);

  const mechanicAverages = useMemo(() => {
    const grouped = filteredLatest.reduce((acc, visit) => {
      if (!acc[visit.promotionMechanic]) {
        acc[visit.promotionMechanic] = [];
      }

      acc[visit.promotionMechanic].push(visit.complianceScore);
      return acc;
    }, {});

    return Object.entries(grouped).map(([mechanic, scores]) => ({
      mechanic,
      score: average(scores),
    }));
  }, [filteredLatest]);

  const prizeFunnel = useMemo(() => {
    const expected = filteredLatest.reduce((acc, visit) => acc + visit.prizesExpected, 0);
    const issued = filteredLatest.reduce((acc, visit) => acc + visit.prizesIssued, 0);
    const verified = filteredLatest.reduce((acc, visit) => acc + visit.prizesVerified, 0);

    return { expected, issued, verified };
  }, [filteredLatest]);

  const escalationSummary = useMemo(() => {
    const relatedOutletIds = new Set(filteredLatest.map((visit) => visit.outletId));
    const relevant = mockEscalations.filter((item) => relatedOutletIds.has(item.outletId));

    const open = relevant.filter((item) => item.status !== 'resolved').length;
    const resolved = relevant.filter((item) => item.status === 'resolved');

    const avgResolutionHours =
      resolved.length === 0
        ? 0
        : Number(
            (
              resolved.reduce((acc, item) => {
                const start = new Date(item.createdAt).getTime();
                const end = new Date(item.resolvedAt).getTime();
                return acc + (end - start) / 3600000;
              }, 0) / resolved.length
            ).toFixed(1)
          );

    return {
      open,
      resolved: resolved.length,
      avgResolutionHours,
    };
  }, [filteredLatest]);

  const trendBySegment = useMemo(() => {
    const source = selectedSegment === 'all'
      ? mockAuditVisits
      : mockAuditVisits.filter((visit) => visit.outletType === selectedSegment);

    const grouped = source.reduce((acc, visit) => {
      const key = `${visit.outletType}-${getWeekLabel(visit.visitDate)}`;
      if (!acc[key]) {
        acc[key] = {
          outletType: visit.outletType,
          week: getWeekLabel(visit.visitDate),
          scores: [],
        };
      }

      acc[key].scores.push(visit.complianceScore);
      return acc;
    }, {});

    return Object.values(grouped)
      .map((item) => ({
        outletType: item.outletType,
        week: item.week,
        score: average(item.scores),
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [selectedSegment]);

  const trendWeeks = useMemo(() => {
    const weekSet = new Set(trendBySegment.map((point) => point.week));
    return [...weekSet].sort((a, b) => a.localeCompare(b));
  }, [trendBySegment]);

  const trendSeries = useMemo(() => {
    const grouped = trendBySegment.reduce((acc, point) => {
      if (!acc[point.outletType]) {
        acc[point.outletType] = [];
      }

      acc[point.outletType].push(point);
      return acc;
    }, {});

    return Object.entries(grouped).map(([segment, points]) => ({
      segment,
      points: trendWeeks.map((week) => {
        const found = points.find((item) => item.week === week);
        return found?.score ?? 0;
      }),
    }));
  }, [trendBySegment, trendWeeks]);

  const hasSegmentData = filteredLatest.length > 0;

  const downloadReport = () => {
    if (!hasSegmentData) {
      showToast(
        tx('No records available for the selected segment.', 'ለተመረጠው ክፍል የሚወርድ መረጃ የለም።'),
        'warning'
      );
      return;
    }

    const reportRows = filteredLatest.map((visit) => [
      visit.outletName,
      visit.outletZone,
      formatOutletType(visit.outletType, tx),
      visit.visitDate,
      visit.complianceScore,
      formatPromotionMechanic(visit.promotionMechanic, tx),
      visit.prizesExpected,
      visit.prizesIssued,
      visit.prizesVerified,
    ]);

    const stamp = new Date().toISOString().slice(0, 10);
    const segmentLabel = selectedSegment === 'all' ? 'all-segments' : selectedSegment;

    downloadCsv(
      `executive-report-${segmentLabel}-${stamp}.csv`,
      [
        tx('Outlet', 'መሸጫ'),
        tx('Zone', 'ዞን'),
        tx('Segment', 'ክፍል'),
        tx('Visit Date', 'የጉብኝት ቀን'),
        tx('Compliance Score', 'የተገዢነት ውጤት'),
        tx('Promotion Mechanic', 'የፕሮሞሽን መካኒክ'),
        tx('Prizes Expected', 'የተጠበቁ ሽልማቶች'),
        tx('Prizes Issued', 'የተሰጡ ሽልማቶች'),
        tx('Prizes Verified', 'የተረጋገጡ ሽልማቶች'),
      ],
      reportRows
    );

    showToast(tx('Executive report exported as CSV.', 'የከፍተኛ አመራር ሪፖርት በCSV ወጥቷል።'), 'success');
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.hero}`}>
        <div className={styles.heroBody}>
          <p className={styles.kicker}>{tx('Habesha Client View', 'የሀበሻ ደንበኛ እይታ')}</p>
          <h1>{tx('Executive Dashboard', 'የከፍተኛ አመራር ዳሽቦርድ')}</h1>
          <p>
            {tx(
              'Read-only KPI intelligence for compliance, prize verification, trends, and escalations across Addis Ababa outlets.',
              'በአዲስ አበባ መሸጫዎች ላይ የተገዢነት፣ የሽልማት ማረጋገጫ፣ የአዝማሚያ ትንተና እና የአስቸኳይ ጉዳዮች መረጃ በንባብ ብቻ ይቀርባል።'
            )}
          </p>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>{tx('Executive Filters', 'የከፍተኛ አመራር ማጣሪያዎች')}</h2>
          <Dropdown
            className={styles.filterControl}
            label={tx('Outlet Segment', 'የመሸጫ ክፍል')}
            value={selectedSegment}
            onChange={setSelectedSegment}
            options={segmentOptions}
          />
        </div>
      </section>

      <section className={styles.kpiStrip}>
        <article>
          <h2>{tx('Overall Compliance', 'አጠቃላይ ተገዢነት')}</h2>
          <p>{overallCompliance}%</p>
        </article>
        <article>
          <h2>{tx('Open Escalations', 'ክፍት አስቸኳይ ጉዳዮች')}</h2>
          <p>{escalationSummary.open}</p>
        </article>
        <article>
          <h2>{tx('Resolved Escalations', 'የተፈቱ አስቸኳይ ጉዳዮች')}</h2>
          <p>{escalationSummary.resolved}</p>
        </article>
        <article>
          <h2>{tx('Avg. Resolution Time', 'አማካይ የመፍትሄ ጊዜ')}</h2>
          <p>{escalationSummary.avgResolutionHours}h</p>
        </article>
      </section>

      <section className={styles.panel}>
        <h2>{tx('Compliance by Zone', 'ተገዢነት በዞን')}</h2>
        {!hasSegmentData && (
          <p className={styles.emptyState}>
            {tx('No zone data is available for this segment.', 'ለዚህ ክፍል የዞን መረጃ አልተገኘም።')}
          </p>
        )}
        {hasSegmentData && (
          <div className={styles.cardGrid}>
            {zoneAverages.map((item) => (
              <article key={item.zone} className={styles.scoreCard}>
                <h3>{item.zone}</h3>
                <span className={scoreBadge(item.score)}>{item.score}%</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2>{tx('Compliance by Promotion Mechanic', 'ተገዢነት በፕሮሞሽን መካኒክ')}</h2>
        {!hasSegmentData && (
          <p className={styles.emptyState}>
            {tx('No mechanic-level data is available for this segment.', 'ለዚህ ክፍል የመካኒክ ደረጃ መረጃ የለም።')}
          </p>
        )}
        {hasSegmentData && (
          <div className={styles.cardGrid}>
            {mechanicAverages.map((item) => (
              <article key={item.mechanic} className={styles.scoreCard}>
                <h3>{formatPromotionMechanic(item.mechanic, tx)}</h3>
                <span className={scoreBadge(item.score)}>{item.score}%</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2>{tx('Prize Disbursement Funnel', 'የሽልማት ስርጭት ፈንል')}</h2>
        <div className={styles.funnelWrap}>
          <div className={styles.funnelRow}>
            <span>{tx('Expected', 'የተጠበቀ')}</span>
            <strong>{prizeFunnel.expected}</strong>
            <div className={styles.funnelBar}>
              <div className={styles.funnelFillExpected} style={{ width: '100%' }} />
            </div>
          </div>
          <div className={styles.funnelRow}>
            <span>{tx('Issued', 'የተሰጠ')}</span>
            <strong>{prizeFunnel.issued}</strong>
            <div className={styles.funnelBar}>
              <div
                className={styles.funnelFillIssued}
                style={{ width: `${prizeFunnel.expected === 0 ? 0 : (prizeFunnel.issued / prizeFunnel.expected) * 100}%` }}
              />
            </div>
          </div>
          <div className={styles.funnelRow}>
            <span>{tx('Verified with Photo', 'በፎቶ የተረጋገጠ')}</span>
            <strong>{prizeFunnel.verified}</strong>
            <div className={styles.funnelBar}>
              <div
                className={styles.funnelFillVerified}
                style={{ width: `${prizeFunnel.expected === 0 ? 0 : (prizeFunnel.verified / prizeFunnel.expected) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>{tx('Week-over-Week Compliance Trend by Segment', 'ሳምንት በሳምንት ተገዢነት አዝማሚያ በክፍል')}</h2>
        {trendSeries.length === 0 && (
          <p className={styles.emptyState}>
            {tx('No trend data is available for this segment.', 'ለዚህ ክፍል የአዝማሚያ መረጃ የለም።')}
          </p>
        )}
        {trendSeries.length > 0 && (
          <div className={styles.chartWrap}>
            <svg viewBox="0 0 640 280" role="img" aria-label={tx('Week-over-week compliance trend chart', 'የሳምንት በሳምንት ተገዢነት አዝማሚያ ገበታ')}>
              <rect x="0" y="0" width="640" height="280" fill="transparent" />
              {[0, 25, 50, 75, 100].map((tick) => (
                <g key={tick}>
                  <line
                    x1="0"
                    x2="640"
                    y1={280 - tick * 2.4}
                    y2={280 - tick * 2.4}
                    stroke="rgba(245, 237, 214, 0.12)"
                    strokeWidth="1"
                  />
                  <text x="6" y={280 - tick * 2.4 - 4} fill="#c8b89a" fontSize="10">
                    {tick}%
                  </text>
                </g>
              ))}

              {trendSeries.map((series, index) => {
                const colors = ['#d4af37', '#2ecc71', '#f39c12', '#e74c3c', '#7ed6df'];
                const path = createLinePath(series.points, 640, 240, 100);

                return (
                  <path
                    key={series.segment}
                    d={path}
                    fill="none"
                    stroke={colors[index % colors.length]}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
            <div className={styles.legend}>
              {trendSeries.map((series) => (
                <span key={series.segment}>{formatOutletType(series.segment, tx)}</span>
              ))}
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>{tx('Segment', 'ክፍል')}</th>
                    {trendWeeks.map((week) => (
                      <th key={week}>{week}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trendSeries.map((series) => (
                    <tr key={`table-${series.segment}`}>
                      <td>{formatOutletType(series.segment, tx)}</td>
                      {series.points.map((score, idx) => (
                        <td key={`${series.segment}-${trendWeeks[idx]}`}>{score}%</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>{tx('Latest Weekly Report', 'የቅርብ ሳምንታዊ ሪፖርት')}</h2>
          <Button size="sm" onClick={downloadReport}>
            {tx('Download Report', 'ሪፖርት አውርድ')}
          </Button>
        </div>
      </section>
    </main>
  );
}

export default Executive;
