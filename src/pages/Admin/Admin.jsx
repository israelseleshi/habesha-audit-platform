import { useMemo, useState } from 'react';
import Button from '../../components/Button/Button';
import Dropdown from '../../components/Dropdown/Dropdown';
import { useToast } from '../../components/Toast/ToastContext';
import {
  average,
  mockAuditVisits,
  mockClientCommunications,
  mockEnumerators,
  mockEscalations,
  mockLatestAuditByOutlet,
  mockOutlets,
  mockReportRuns,
} from '../../data/mockData';
import {
  formatApprovalStatus,
  formatAuditStatus,
  formatChannel,
  formatOutputType,
  formatReportPeriod,
} from '../../i18n/localeText';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './Admin.module.css';

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-ET', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Addis_Ababa',
  }).format(new Date(value));
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

function Admin() {
  const { tx } = useLanguage();
  const { showToast } = useToast();
  const [sortBy, setSortBy] = useState('score');
  const [sortDirection, setSortDirection] = useState('desc');
  const [reportPeriod, setReportPeriod] = useState('Weekly');
  const [reportRuns, setReportRuns] = useState(mockReportRuns);
  const [reportLoading, setReportLoading] = useState({ PDF: false, Excel: false });

  const newestVisitDate = useMemo(() => {
    const sorted = [...mockAuditVisits].sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1));
    return sorted[0]?.visitDate || '2026-03-27';
  }, []);

  const weeklyVisits = useMemo(() => {
    const maxDate = new Date(newestVisitDate);
    const minDate = new Date(maxDate.getTime() - 6 * 24 * 3600 * 1000);

    return mockAuditVisits.filter((visit) => {
      const dt = new Date(visit.visitDate);
      return dt >= minDate && dt <= maxDate;
    });
  }, [newestVisitDate]);

  const kpis = useMemo(() => {
    const totalOutletVisits = weeklyVisits.length;
    const averageCompliance = average(weeklyVisits.map((item) => item.complianceScore));
    const openEscalations = mockEscalations.filter((item) => item.status !== 'resolved').length;

    const prizesExpected = weeklyVisits.reduce((acc, item) => acc + item.prizesExpected, 0);
    const prizesVerified = weeklyVisits.reduce((acc, item) => acc + item.prizesVerified, 0);
    const prizesLoggedCopy = prizesExpected === 0
      ? tx('N/A', 'የለም')
      : `${prizesVerified}/${prizesExpected}`;

    return {
      totalOutletVisits,
      averageCompliance,
      openEscalations,
      prizesLoggedCopy,
    };
  }, [tx, weeklyVisits]);

  const outletRows = useMemo(
    () =>
      mockOutlets.map((outlet) => {
        const latest = mockLatestAuditByOutlet[outlet.id];
        return {
          id: outlet.id,
          name: outlet.name,
          zone: outlet.zone,
          latestScore: latest?.complianceScore ?? 0,
          latestStatus: latest?.status ?? 'not_started',
          latestVisitDate: latest?.visitDate ?? null,
        };
      }),
    []
  );

  const sortedOutlets = useMemo(() => {
    const rows = [...outletRows];
    rows.sort((a, b) => {
      let compareValue = 0;

      if (sortBy === 'name') {
        compareValue = a.name.localeCompare(b.name);
      } else if (sortBy === 'zone') {
        compareValue = a.zone.localeCompare(b.zone);
      } else if (sortBy === 'status') {
        compareValue = a.latestStatus.localeCompare(b.latestStatus);
      } else if (sortBy === 'last_visit') {
        const aTs = a.latestVisitDate ? new Date(a.latestVisitDate).getTime() : 0;
        const bTs = b.latestVisitDate ? new Date(b.latestVisitDate).getTime() : 0;
        compareValue = aTs - bTs;
      } else {
        compareValue = a.latestScore - b.latestScore;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return rows;
  }, [outletRows, sortBy, sortDirection]);

  const enumeratorPerformance = useMemo(() => {
    return mockEnumerators.map((enumerator) => {
      const visits = weeklyVisits.filter((visit) => visit.enumeratorId === enumerator.id);
      const escalated = visits.filter((visit) => visit.escalationFlag).length;

      return {
        id: enumerator.id,
        name: enumerator.name,
        visitsCompleted: visits.length,
        averageScore: average(visits.map((visit) => visit.complianceScore)),
        escalationRate: visits.length === 0 ? 0 : Number(((escalated / visits.length) * 100).toFixed(1)),
      };
    });
  }, [weeklyVisits]);

  const sortByOptions = useMemo(
    () => [
      { value: 'score', label: tx('Score', 'ውጤት') },
      { value: 'last_visit', label: tx('Last Visit', 'የመጨረሻ ጉብኝት') },
      { value: 'zone', label: tx('Zone', 'ዞን') },
      { value: 'status', label: tx('Visit Status', 'የጉብኝት ሁኔታ') },
      { value: 'name', label: tx('Outlet Name', 'የመሸጫ ስም') },
    ],
    [tx]
  );

  const directionOptions = useMemo(
    () => [
      { value: 'desc', label: tx('Descending', 'ከላይ ወደ ታች') },
      { value: 'asc', label: tx('Ascending', 'ከታች ወደ ላይ') },
    ],
    [tx]
  );

  const periodOptions = useMemo(
    () => [
      { value: 'Weekly', label: tx('Weekly', 'ሳምንታዊ') },
      { value: 'Monthly', label: tx('Monthly', 'ወርሃዊ') },
    ],
    [tx]
  );

  const runReport = async (outputType) => {
    if (reportLoading[outputType]) {
      return;
    }

    setReportLoading((prev) => ({ ...prev, [outputType]: true }));

    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 650);
      });

      if (!window.navigator.onLine) {
        throw new Error('offline');
      }

      const newRun = {
        id: `report-run-${Date.now()}`,
        period: reportPeriod,
        output: outputType,
        generatedAt: new Date().toISOString(),
        generatedBy: 'Dawit Alemu',
      };

      setReportRuns((prev) => [newRun, ...prev]);
      showToast(
        tx(
          `${reportPeriod} report generated as ${outputType}.`,
          `${reportPeriod === 'Weekly' ? 'ሳምንታዊ' : 'ወርሃዊ'} ሪፖርት በ ${outputType} ተፈጥሯል።`
        ),
        'success'
      );
    } catch {
      showToast(
        tx(
          'Report generation failed. Check network and retry.',
          'የሪፖርት ማመንጨት አልተሳካም። ኔትወርክን ያረጋግጡና ደግመው ይሞክሩ።'
        ),
        'warning'
      );
    } finally {
      setReportLoading((prev) => ({ ...prev, [outputType]: false }));
    }
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.hero}`}>
        <div className={styles.heroBody}>
          <p className={styles.kicker}>{tx('Project Manager Workspace', 'የፕሮጀክት አስተዳዳሪ ስርዓት')}</p>
          <h1>{tx('Admin Dashboard', 'የአስተዳደር ዳሽቦርድ')}</h1>
          <p>
            {tx(
              'Programme KPI tracking, outlet compliance oversight, enumerator performance, report generation, and client communication records.',
              'የፕሮግራም KPI ክትትል፣ የመሸጫ ተገዢነት ቁጥጥር፣ የኦዲተር አፈጻጸም፣ የሪፖርት ማመንጨት እና የደንበኛ ግንኙነት መዝገብ ይዟል።'
            )}
          </p>
        </div>
      </section>

      <section className={styles.kpiStrip}>
        <article>
          <h2>{tx('Total Outlet Visits (Week)', 'የሳምንቱ ጠቅላላ ጉብኝት')}</h2>
          <p>{kpis.totalOutletVisits}</p>
        </article>
        <article>
          <h2>{tx('Average Compliance', 'አማካይ ተገዢነት')}</h2>
          <p>{kpis.averageCompliance}%</p>
        </article>
        <article>
          <h2>{tx('Open Escalations', 'ክፍት አስቸኳይ ጉዳዮች')}</h2>
          <p>{kpis.openEscalations}</p>
        </article>
        <article>
          <h2>{tx('Prizes Logged vs Expected', 'የተመዘገቡ ሽልማቶች ከተጠበቁት ጋር')}</h2>
          <p>{kpis.prizesLoggedCopy}</p>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>{tx('Outlet Compliance Table', 'የመሸጫ ተገዢነት ሰንጠረዥ')}</h2>
          <div className={styles.sortControls}>
            <Dropdown
              label={tx('Sort By', 'ለመደርደር')}
              value={sortBy}
              onChange={setSortBy}
              options={sortByOptions}
            />
            <Dropdown
              label={tx('Direction', 'አቅጣጫ')}
              value={sortDirection}
              onChange={setSortDirection}
              options={directionOptions}
            />
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{tx('Outlet', 'መሸጫ')}</th>
                <th>{tx('Zone', 'ዞን')}</th>
                <th>{tx('Latest Score', 'የቅርብ ውጤት')}</th>
                <th>{tx('Status', 'ሁኔታ')}</th>
                <th>{tx('Last Visit', 'የመጨረሻ ጉብኝት')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedOutlets.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.zone}</td>
                  <td>
                    <span className={scoreBadge(row.latestScore)}>{row.latestScore || 0}%</span>
                  </td>
                  <td>{formatAuditStatus(row.latestStatus, tx)}</td>
                  <td>{row.latestVisitDate || tx('No visits yet', 'እስካሁን ጉብኝት የለም')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>{tx('Enumerator Performance Tracker', 'የኦዲተር አፈጻጸም መከታተያ')}</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{tx('Enumerator', 'ኦዲተር')}</th>
                <th>{tx('Visits Completed', 'የተጠናቀቁ ጉብኝቶች')}</th>
                <th>{tx('Avg. Score', 'አማካይ ውጤት')}</th>
                <th>{tx('Escalation Rate', 'የአስቸኳይ ጉዳይ መጠን')}</th>
              </tr>
            </thead>
            <tbody>
              {enumeratorPerformance.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.visitsCompleted}</td>
                  <td>{item.averageScore}%</td>
                  <td>{item.escalationRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>{tx('Report Builder', 'የሪፖርት አዘጋጅ')}</h2>
          <Dropdown
            className={styles.inlineControl}
            label={tx('Period', 'ጊዜ ክልል')}
            value={reportPeriod}
            onChange={setReportPeriod}
            options={periodOptions}
          />
        </div>

        <div className={styles.reportActions}>
          <Button size="sm" onClick={() => runReport('PDF')} loading={reportLoading.PDF}>
            {tx('Export PDF', 'PDF አውጣ')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => runReport('Excel')} loading={reportLoading.Excel}>
            {tx('Export Excel', 'Excel አውጣ')}
          </Button>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{tx('Period', 'ጊዜ ክልል')}</th>
                <th>{tx('Output', 'ውጤት')}</th>
                <th>{tx('Generated At', 'የተፈጠረበት')}</th>
                <th>{tx('Generated By', 'ያዘጋጀው')}</th>
              </tr>
            </thead>
            <tbody>
              {reportRuns.map((run) => (
                <tr key={run.id}>
                  <td>{formatReportPeriod(run.period, tx)}</td>
                  <td>{formatOutputType(run.output, tx)}</td>
                  <td>{formatDateTime(run.generatedAt)}</td>
                  <td>{run.generatedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>{tx('Client Communication Log', 'የደንበኛ ግንኙነት መዝገብ')}</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{tx('Report', 'ሪፖርት')}</th>
                <th>{tx('Recipient', 'ተቀባይ')}</th>
                <th>{tx('Channel', 'መላኪያ መንገድ')}</th>
                <th>{tx('Sent At', 'የተላከበት')}</th>
                <th>{tx('Approval', 'ፍቃድ')}</th>
                <th>{tx('Notes', 'ማስታወሻ')}</th>
              </tr>
            </thead>
            <tbody>
              {mockClientCommunications.map((item) => (
                <tr key={item.id}>
                  <td>{item.reportType}</td>
                  <td>{item.recipient}</td>
                  <td>{formatChannel(item.channel, tx)}</td>
                  <td>{formatDateTime(item.sentAt)}</td>
                  <td>
                    <span
                      className={
                        item.approvalStatus === 'approved'
                          ? 'status-badge status-badge--compliant'
                          : 'status-badge status-badge--warning'
                      }
                    >
                      {formatApprovalStatus(item.approvalStatus, tx)}
                    </span>
                  </td>
                  <td>{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default Admin;
