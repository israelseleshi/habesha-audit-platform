import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button/Button';
import Dropdown from '../../components/Dropdown/Dropdown';
import { useToast } from '../../components/Toast/ToastContext';
import { formatAuditStatus, formatDay, formatEscalationStatus, formatTriggerReasons } from '../../i18n/localeText';
import { useLanguage } from '../../i18n/LanguageContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import styles from './Supervisor.module.css';

function createMockPhoto(label, background) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='720' height='420'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='${background}' /><stop offset='100%' stop-color='#1a1a1a' /></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='52%' text-anchor='middle' fill='#f5edd6' font-size='34' font-family='Arial'>${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const mockEnumeratorRows = [
  { id: 'enum-1', name: 'Yonas Girma', zone: 'AA-C', day: 'thursday', status: 'submitted', lastSubmission: '2026-03-27T09:45:00+03:00' },
  { id: 'enum-2', name: 'Hanna Kebede', zone: 'AA-N', day: 'thursday', status: 'in_progress', lastSubmission: null },
  { id: 'enum-3', name: 'Mekdes Ali', zone: 'AA-W', day: 'thursday', status: 'not_started', lastSubmission: null },
  { id: 'enum-4', name: 'Abel Tadesse', zone: 'AA-C', day: 'thursday', status: 'submitted', lastSubmission: '2026-03-27T10:20:00+03:00' },
];

const mockPendingQueue = [
  {
    id: 'audit-001',
    outletName: 'Tej Bet Desta',
    zone: 'AA-C',
    enumeratorName: 'Yonas Girma',
    submittedAt: '2026-03-27T10:05:00+03:00',
    complianceScore: 82,
    gpsLat: 9.0108,
    gpsLng: 38.7612,
    remarks: 'Table signage adjusted after briefing.',
    photos: [
      createMockPhoto('POSM Placement', '#6d5c22'),
      createMockPhoto('Price Board', '#4f5f2f'),
      createMockPhoto('Promoter Presence', '#2f5f58'),
    ],
  },
  {
    id: 'audit-002',
    outletName: 'Addis Bar & Restaurant',
    zone: 'AA-N',
    enumeratorName: 'Hanna Kebede',
    submittedAt: '2026-03-27T11:15:00+03:00',
    complianceScore: 39,
    gpsLat: 9.034,
    gpsLng: 38.7469,
    remarks: 'Promoter absent at check-in window.',
    photos: [
      createMockPhoto('POSM Missing', '#6a2f2f'),
      createMockPhoto('Shelf Empty', '#5a2f43'),
    ],
  },
];

const mockEscalations = [
  {
    id: 'esc-001',
    outletName: 'Addis Bar & Restaurant',
    triggerReason: ['promoter_absent', 'low_compliance_score'],
    status: 'open',
    deadlineAt: '2026-03-28T11:15:00+03:00',
  },
  {
    id: 'esc-002',
    outletName: 'Merkato Corner Beer House',
    triggerReason: ['branded_materials_missing'],
    status: 'acknowledged',
    deadlineAt: '2026-03-28T14:40:00+03:00',
  },
];

const mockThursdayPlanner = [
  { id: 'plan-1', name: 'Tej Bet Desta', zone: 'AA-C', selected: true },
  { id: 'plan-2', name: 'Megenagna Sports Bar', zone: 'AA-N', selected: false },
  { id: 'plan-3', name: 'Kazanchis Night Spot', zone: 'AA-C', selected: false },
  { id: 'plan-4', name: 'Merkato Corner Beer House', zone: 'AA-W', selected: true },
];

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-ET', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Addis_Ababa',
  }).format(new Date(value));
}

function formatCountdown(deadlineAt, nowTick, tx) {
  const diffMs = new Date(deadlineAt).getTime() - nowTick;
  if (Number.isNaN(diffMs)) {
    return tx('Unknown', 'አልታወቀም');
  }

  if (diffMs <= 0) {
    return tx('Expired', 'ጊዜው አልፏል');
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return tx(`${hours}h ${minutes}m remaining`, `${hours} ሰዓት ${minutes} ደቂቃ ይቀራል`);
}

function mapStatusBadge(status) {
  if (status === 'submitted') {
    return 'status-badge status-badge--compliant';
  }

  if (status === 'in_progress') {
    return 'status-badge status-badge--warning';
  }

  return 'status-badge status-badge--critical';
}

function mapScoreBadge(score) {
  if (score >= 70) {
    return 'status-badge status-badge--compliant';
  }

  if (score >= 40) {
    return 'status-badge status-badge--warning';
  }

  return 'status-badge status-badge--critical';
}

function SignoffCard({ item, onApprove, onRevision, updating, tx }) {
  const [activePhoto, setActivePhoto] = useState(0);

  return (
    <article className={styles.auditCard}>
      <div className={styles.auditCardTop}>
        <div>
          <h3>{item.outletName}</h3>
          <p>
            {item.zone} | {tx('Enumerator', 'ኦዲተር')}: {item.enumeratorName}
          </p>
        </div>
        <span className={mapScoreBadge(item.complianceScore)}>{item.complianceScore}%</span>
      </div>

      <p className={styles.metaCopy}>{tx('Submitted', 'የተላከበት')}: {formatDateTime(item.submittedAt)}</p>
      <p className={styles.metaCopy}>{tx('Remarks', 'ማብራሪያ')}: {item.remarks || tx('No remarks provided.', 'ማብራሪያ አልተጻፈም።')}</p>

      <a
        className={styles.mapPin}
        href={`https://www.google.com/maps?q=${item.gpsLat},${item.gpsLng}`}
        target="_blank"
        rel="noreferrer"
      >
        {tx('Open GPS pin', 'የGPS ነጥብ ክፈት')}: {item.gpsLat}, {item.gpsLng}
      </a>

      <div className={styles.viewerWrap}>
        <img
          className={styles.viewerMain}
          src={item.photos[activePhoto]}
          alt={tx(`Audit evidence ${activePhoto + 1} for ${item.outletName}`, `${item.outletName} የኦዲት ማስረጃ ${activePhoto + 1}`)}
        />
        <div className={styles.viewerThumbs}>
          {item.photos.map((photoUrl, index) => (
            <button
              key={`${item.id}-photo-${index}`}
              type="button"
              className={`${styles.thumbButton} ${index === activePhoto ? styles.thumbButtonActive : ''}`}
              onClick={() => setActivePhoto(index)}
              aria-label={tx(`View photo ${index + 1}`, `ፎቶ ${index + 1} እይ`) }
            >
              <img src={photoUrl} alt="" />
            </button>
          ))}
        </div>
      </div>

      <div className={styles.actionsRow}>
        <Button
          size="sm"
          loading={updating}
          onClick={() => onApprove(item.id)}
          disabled={updating}
        >
          {tx('Approve', 'አፅድቅ')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          loading={updating}
          onClick={() => onRevision(item.id)}
          disabled={updating}
        >
          {tx('Request Revision', 'ማሻሻያ ጠይቅ')}
        </Button>
      </div>
    </article>
  );
}

function Supervisor() {
  const { tx } = useLanguage();
  const { showToast } = useToast();
  const [zoneFilter, setZoneFilter] = useState('all');
  const [dataSource, setDataSource] = useState('demo');
  const [enumeratorRows, setEnumeratorRows] = useState(mockEnumeratorRows);
  const [pendingQueue, setPendingQueue] = useState(mockPendingQueue);
  const [escalations, setEscalations] = useState(mockEscalations);
  const [plannerRows, setPlannerRows] = useState(mockThursdayPlanner);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [updatingAuditId, setUpdatingAuditId] = useState('');
  const [clockTick, setClockTick] = useState(Date.now());
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTick(Date.now());
    }, 60000);

    return () => clearInterval(timer);
  }, [tx]);

  useEffect(() => {
    let isMounted = true;

    const loadLiveData = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setDataSource('demo');
        return;
      }

      setLoading(true);
      setPageError('');

      try {
        const today = new Date().toISOString().slice(0, 10);
        const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

        const { data: enumerators, error: enumeratorError } = await supabase
          .from('profiles')
          .select('id, full_name, assigned_zone, role, is_active')
          .eq('role', 'enumerator')
          .eq('is_active', true);

        if (enumeratorError) {
          throw new Error(enumeratorError.message);
        }

        const { data: todayAudits, error: auditsError } = await supabase
          .from('audits')
          .select('id, outlet_id, enumerator_id, visit_date, visit_timestamp, status, supervisor_signed, compliance_score, gps_lat, gps_lng, remarks')
          .eq('visit_date', today)
          .order('visit_timestamp', { ascending: false });

        if (auditsError) {
          throw new Error(auditsError.message);
        }

        const outletIds = [...new Set((todayAudits || []).map((audit) => audit.outlet_id).filter(Boolean))];
        let outlets = [];

        if (outletIds.length > 0) {
          const { data: outletData, error: outletsError } = await supabase
            .from('outlets')
            .select('id, name, zone, is_active')
            .in('id', outletIds);

          if (outletsError) {
            throw new Error(outletsError.message);
          }

          outlets = outletData || [];
        }

        const outletMap = new Map(outlets.map((outlet) => [outlet.id, outlet]));
        const latestAuditByEnumerator = new Map();

        for (const audit of todayAudits || []) {
          if (!latestAuditByEnumerator.has(audit.enumerator_id)) {
            latestAuditByEnumerator.set(audit.enumerator_id, audit);
          }
        }

        const nextEnumeratorRows = (enumerators || []).map((enumerator) => {
          const latestAudit = latestAuditByEnumerator.get(enumerator.id);
          let status = 'not_started';

          if (latestAudit) {
            status = latestAudit.status === 'draft' ? 'in_progress' : 'submitted';
          }

          return {
            id: enumerator.id,
            name: enumerator.full_name,
            zone: enumerator.assigned_zone || 'Unassigned',
            day: dayLabel.toLowerCase(),
            status,
            lastSubmission: latestAudit?.visit_timestamp || null,
          };
        });

        const queueSource = (todayAudits || []).filter(
          (audit) => audit.status === 'submitted' && !audit.supervisor_signed
        );

        const queueAuditIds = queueSource.map((audit) => audit.id);
        let responseRows = [];

        if (queueAuditIds.length > 0) {
          const { data: responses, error: responseError } = await supabase
            .from('audit_responses')
            .select('audit_id, photo_url')
            .in('audit_id', queueAuditIds)
            .not('photo_url', 'is', null);

          if (responseError) {
            throw new Error(responseError.message);
          }

          responseRows = responses || [];
        }

        const photosByAudit = new Map();

        for (const row of responseRows) {
          if (!photosByAudit.has(row.audit_id)) {
            photosByAudit.set(row.audit_id, []);
          }

          photosByAudit.get(row.audit_id).push(row.photo_url);
        }

        const enumeratorNameById = new Map(
          (enumerators || []).map((enumerator) => [enumerator.id, enumerator.full_name])
        );

        const nextPendingQueue = queueSource.map((audit) => {
          const outlet = outletMap.get(audit.outlet_id);
          const evidence = photosByAudit.get(audit.id) || [];

          return {
            id: audit.id,
            outletName: outlet?.name || 'Unknown outlet',
            zone: outlet?.zone || tx('Unknown zone', 'ያልታወቀ ዞን'),
            enumeratorName: enumeratorNameById.get(audit.enumerator_id) || tx('Unknown enumerator', 'ያልታወቀ ኦዲተር'),
            submittedAt: audit.visit_timestamp,
            complianceScore: Number(audit.compliance_score || 0),
            gpsLat: Number(audit.gps_lat || 0),
            gpsLng: Number(audit.gps_lng || 0),
            remarks: audit.remarks || '',
            photos:
              evidence.length > 0
                ? evidence.slice(0, 4)
                : [createMockPhoto(tx('No Photo Uploaded', 'ፎቶ አልተጫነም'), '#4a4a4a')],
          };
        });

        const { data: escalationRows, error: escalationError } = await supabase
          .from('escalations')
          .select('id, outlet_id, trigger_reason, status, deadline_at')
          .in('status', ['open', 'acknowledged'])
          .order('deadline_at', { ascending: true });

        if (escalationError) {
          throw new Error(escalationError.message);
        }

        const nextEscalations = (escalationRows || []).map((item) => {
          const outlet = outletMap.get(item.outlet_id);

          return {
            id: item.id,
            outletName: outlet?.name || tx('Unknown outlet', 'ያልታወቀ መሸጫ'),
            triggerReason: item.trigger_reason || [],
            status: item.status,
            deadlineAt: item.deadline_at,
          };
        });

        const { data: plannerOutlets, error: plannerError } = await supabase
          .from('outlets')
          .select('id, name, zone, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true })
          .limit(16);

        if (plannerError) {
          throw new Error(plannerError.message);
        }

        const nextPlannerRows = (plannerOutlets || []).map((outlet) => ({
          id: outlet.id,
          name: outlet.name,
          zone: outlet.zone,
          selected: false,
        }));

        if (!isMounted) {
          return;
        }

        setDataSource('live');
        setEnumeratorRows(nextEnumeratorRows);
        setPendingQueue(nextPendingQueue);
        setEscalations(nextEscalations);
        setPlannerRows(nextPlannerRows.length > 0 ? nextPlannerRows : mockThursdayPlanner);
        setLastRefreshedAt(Date.now());
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDataSource('demo');
        setPageError(error.message || tx('Failed to load supervisor data.', 'የተቆጣጣሪ መረጃ መጫን አልተሳካም።'));
        setEnumeratorRows(mockEnumeratorRows);
        setPendingQueue(mockPendingQueue);
        setEscalations(mockEscalations);
        setPlannerRows(mockThursdayPlanner);
        setLastRefreshedAt(Date.now());
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLiveData();

    return () => {
      isMounted = false;
    };
  }, [refreshNonce, tx]);

  const zoneOptions = useMemo(() => {
    const unique = [...new Set(enumeratorRows.map((row) => row.zone))];
    return ['all', ...unique];
  }, [enumeratorRows]);

  const zoneFilterOptions = useMemo(
    () =>
      zoneOptions.map((zone) => ({
        value: zone,
        label: zone === 'all' ? tx('All zones', 'ሁሉም ዞኖች') : zone,
      })),
    [tx, zoneOptions]
  );

  const filteredRows = useMemo(() => {
    if (zoneFilter === 'all') {
      return enumeratorRows;
    }

    return enumeratorRows.filter((row) => row.zone === zoneFilter);
  }, [enumeratorRows, zoneFilter]);

  const summary = useMemo(() => {
    const total = filteredRows.length;

    if (total === 0) {
      return {
        submitted: 0,
        inProgress: 0,
        notStarted: 0,
      };
    }

    return filteredRows.reduce(
      (acc, row) => {
        if (row.status === 'submitted') {
          acc.submitted += 1;
        } else if (row.status === 'in_progress') {
          acc.inProgress += 1;
        } else {
          acc.notStarted += 1;
        }

        return acc;
      },
      { submitted: 0, inProgress: 0, notStarted: 0 }
    );
  }, [filteredRows]);

  const filteredEscalations = useMemo(() => {
    if (zoneFilter === 'all') {
      return escalations;
    }

    return escalations.filter((item) => item.zone === zoneFilter);
  }, [escalations, zoneFilter]);

  const refreshData = () => {
    if (!loading) {
      setRefreshNonce((prev) => prev + 1);
    }
  };

  const handleApprove = async (auditId) => {
    const confirmed = window.confirm(
      tx(
        'Approve this audit and sign it off?',
        'ይህን ኦዲት አፅድቀው ፊርማ ማከናወን ይፈልጋሉ?'
      )
    );

    if (!confirmed) {
      return;
    }

    setUpdatingAuditId(auditId);

    try {
      if (dataSource === 'live' && supabase) {
        const { error } = await supabase
          .from('audits')
          .update({
            supervisor_signed: true,
            supervisor_signed_at: new Date().toISOString(),
            status: 'signed_off',
          })
          .eq('id', auditId);

        if (error) {
          throw new Error(error.message);
        }
      }

      setPendingQueue((prev) => prev.filter((item) => item.id !== auditId));
      showToast(tx('Audit approved and signed off successfully.', 'ኦዲቱ ተፅድቆ በስኬት ተፈርሟል።'), 'success');
    } catch (error) {
      showToast(error.message || tx('Unable to approve audit.', 'ኦዲቱን ማፅደቅ አልተቻለም።'), 'error');
    } finally {
      setUpdatingAuditId('');
    }
  };

  const handleRevision = async (auditId) => {
    const confirmed = window.confirm(
      tx(
        'Send this audit back for revision?',
        'ይህን ኦዲት ለማሻሻያ መልሰው መላክ ይፈልጋሉ?'
      )
    );

    if (!confirmed) {
      return;
    }

    setUpdatingAuditId(auditId);

    try {
      if (dataSource === 'live' && supabase) {
        const { error } = await supabase
          .from('audits')
          .update({ status: 'draft' })
          .eq('id', auditId);

        if (error) {
          throw new Error(error.message);
        }
      }

      setPendingQueue((prev) => prev.filter((item) => item.id !== auditId));
      showToast(tx('Revision request sent to enumerator.', 'የማሻሻያ ጥያቄ ለኦዲተሩ ተልኳል።'), 'success');
    } catch (error) {
      showToast(error.message || tx('Unable to request revision.', 'የማሻሻያ ጥያቄ መላክ አልተቻለም።'), 'error');
    } finally {
      setUpdatingAuditId('');
    }
  };

  const togglePlannerItem = (id) => {
    setPlannerRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              selected: !row.selected,
            }
          : row
      )
    );
  };

  const confirmDeployment = () => {
    const selected = plannerRows.filter((item) => item.selected).length;

    if (selected === 0) {
      showToast(tx('Select at least one outlet before confirming Thursday deployment.', 'የሐሙስ ስምሪት ከማረጋገጥ በፊት ቢያንስ አንድ መሸጫ ይምረጡ።'), 'warning');
      return;
    }

    showToast(
      tx(
        `Thursday deployment confirmation sent to Project Manager for ${selected} outlet(s).`,
        `የሐሙስ ስምሪት ማረጋገጫ ለፕሮጀክት አስተዳዳሪ ለ ${selected} መሸጫ(ዎች) ተልኳል።`
      ),
      'success'
    );
  };

  const statusLabelMap = {
    submitted: formatAuditStatus('submitted', tx),
    in_progress: formatAuditStatus('in_progress', tx),
    not_started: formatAuditStatus('not_started', tx),
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.hero}`}>
        <div className={styles.heroBody}>
          <div>
            <p className={styles.kicker}>{tx('Supervisor Workspace', 'የተቆጣጣሪ ስርዓት')}</p>
            <h1>{tx('Supervisor Dashboard', 'የተቆጣጣሪ ዳሽቦርድ')}</h1>
            <p>
              {tx(
                'Zone-level execution oversight, sign-off queue, escalation inbox, and Thursday deployment planning in one view.',
                'የዞን አፈጻጸም ክትትል፣ የፊርማ ተራ፣ የአስቸኳይ ጉዳይ ሳጥን እና የሐሙስ ስምሪት እቅድ በአንድ ገጽ።'
              )}
            </p>
          </div>
          <div className={styles.heroBadges}>
            <span className={dataSource === 'live' ? 'status-badge status-badge--compliant' : 'status-badge status-badge--warning'}>
              {tx('Data Source', 'የመረጃ ምንጭ')}: {dataSource === 'live' ? tx('Live Supabase', 'ቀጥታ Supabase') : tx('Demo Data', 'የሙከራ መረጃ')}
            </span>
            <span className="status-badge status-badge--warning">
              {tx('Last refresh', 'መጨረሻ የታደሰበት')}: {formatDateTime(lastRefreshedAt)}
            </span>
            {loading && <span className="status-badge status-badge--warning">{tx('Refreshing...', 'በማደስ ላይ...')}</span>}
            <Button size="sm" variant="ghost" onClick={refreshData} disabled={loading}>
              {tx('Refresh Now', 'አሁኑኑ አድስ')}
            </Button>
          </div>
        </div>
      </section>

      {pageError && (
        <section className={styles.warningPanel}>
          <p>{pageError}</p>
          <div className={styles.warningPanelActions}>
            <Button size="sm" variant="ghost" onClick={refreshData} disabled={loading}>
              {tx('Retry', 'እንደገና ሞክር')}
            </Button>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{tx('Zone Enumerator Status', 'የዞን ኦዲተር ሁኔታ')}</h2>
          <Dropdown
            className={styles.filterControl}
            label={tx('Zone', 'ዞን')}
            value={zoneFilter}
            onChange={setZoneFilter}
            options={zoneFilterOptions}
          />
        </div>

        <div className={styles.kpiRow}>
          <article>
            <h3>{tx('Submitted', 'ተልኳል')}</h3>
            <p>{summary.submitted}</p>
          </article>
          <article>
            <h3>{tx('In Progress', 'በሂደት ላይ')}</h3>
            <p>{summary.inProgress}</p>
          </article>
          <article>
            <h3>{tx('Not Started', 'አልተጀመረም')}</h3>
            <p>{summary.notStarted}</p>
          </article>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{tx('Enumerator', 'ኦዲተር')}</th>
                <th>{tx('Zone', 'ዞን')}</th>
                <th>{tx('Day', 'ቀን')}</th>
                <th>{tx('Status', 'ሁኔታ')}</th>
                <th>{tx('Last Submission', 'የመጨረሻ ማስገቢያ')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.zone}</td>
                  <td>{formatDay(row.day, tx)}</td>
                  <td>
                    <span className={mapStatusBadge(row.status)}>{statusLabelMap[row.status]}</span>
                  </td>
                  <td>{row.lastSubmission ? formatDateTime(row.lastSubmission) : tx('No submission yet', 'እስካሁን ማስገቢያ የለም')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2>{tx('Pending Sign-off Queue', 'የተቆጣጣሪ ፊርማ የሚጠብቅ ተራ')}</h2>
        <div className={styles.cardGrid}>
          {pendingQueue.length === 0 && <p className={styles.emptyState}>{tx('No pending sign-off audits right now.', 'በአሁኑ ጊዜ የሚጠብቅ ፊርማ ኦዲት የለም።')}</p>}
          {pendingQueue.map((item) => (
            <SignoffCard
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onRevision={handleRevision}
              updating={updatingAuditId === item.id}
              tx={tx}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>{tx('Escalation Inbox', 'የአስቸኳይ ጉዳይ ሳጥን')}</h2>
        <div className={styles.escalationGrid}>
          {filteredEscalations.length === 0 && <p className={styles.emptyState}>{tx('No open escalations for this zone.', 'ለዚህ ዞን ክፍት አስቸኳይ ጉዳይ የለም።')}</p>}
          {filteredEscalations.map((item) => (
            <article key={item.id} className={styles.escalationCard}>
              <div>
                <h3>{item.outletName}</h3>
                <p>{tx('Reasons', 'ምክንያቶች')}: {formatTriggerReasons(item.triggerReason, tx)}</p>
              </div>
              <div className={styles.escalationMeta}>
                <span className={item.status === 'open' ? 'status-badge status-badge--critical' : 'status-badge status-badge--warning'}>
                  {formatEscalationStatus(item.status, tx)}
                </span>
                <p>{formatCountdown(item.deadlineAt, clockTick, tx)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{tx('Thursday Deployment Planner', 'የሐሙስ ስምሪት እቅድ')}</h2>
          <Button size="sm" onClick={confirmDeployment}>{tx('Confirm and Notify Project Manager', 'አረጋግጥና ፕሮጀክት አስተዳዳሪን አሳውቅ')}</Button>
        </div>

        <div className={styles.plannerList}>
          {plannerRows.map((row) => (
            <label key={row.id} className={styles.plannerRow}>
              <input
                type="checkbox"
                checked={row.selected}
                onChange={() => togglePlannerItem(row.id)}
              />
              <span>{row.name}</span>
              <small>{row.zone}</small>
            </label>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Supervisor;
