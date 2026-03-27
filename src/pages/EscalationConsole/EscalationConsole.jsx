import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button/Button';
import Dropdown from '../../components/Dropdown/Dropdown';
import { useToast } from '../../components/Toast/ToastContext';
import { mockEnumerators, mockEscalations } from '../../data/mockData';
import { formatEscalationStatus, formatTriggerReasons } from '../../i18n/localeText';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './EscalationConsole.module.css';

const STORAGE_KEY = 'habesha-escalation-console-v1';

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

function initialRows() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore malformed storage and rebuild from defaults.
  }

  return mockEscalations.map((item) => ({
    ...item,
    assignedTo: item.status === 'resolved' ? 'Hiwot Tesfaye' : '',
    rootCause: item.status === 'resolved' ? 'Stock replenishment breakdown at outlet level.' : '',
    correctiveAction:
      item.status === 'resolved' ? 'Supervisor restocked POSM and verified promoter attendance.' : '',
    resolvedBy: item.status === 'resolved' ? 'Hiwot Tesfaye' : '',
  }));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-ET', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Addis_Ababa',
  }).format(new Date(value));
}

function countdown(deadlineAt, tx) {
  const diff = new Date(deadlineAt).getTime() - Date.now();

  if (diff <= 0) {
    return tx('Expired', 'ጊዜው አልፏል');
  }

  const totalMinutes = Math.floor(diff / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return tx(`${h}h ${m}m`, `${h} ሰዓት ${m} ደቂቃ`);
}

function EscalationConsole() {
  const { tx } = useLanguage();
  const { showToast } = useToast();
  const [rows, setRows] = useState(initialRows);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEscalationId, setSelectedEscalationId] = useState('');
  const [assignmentUser, setAssignmentUser] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const statusFilterOptions = useMemo(
    () => [
      { value: 'all', label: tx('All', 'ሁሉም') },
      { value: 'open', label: tx('Open', 'ክፍት') },
      { value: 'acknowledged', label: tx('Acknowledged', 'ተቀብሏል') },
      { value: 'resolved', label: tx('Resolved', 'ተፈቷል') },
    ],
    [tx]
  );

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') {
      return rows;
    }

    return rows.filter((item) => item.status === statusFilter);
  }, [rows, statusFilter]);

  const selectedRow = useMemo(
    () => rows.find((item) => item.id === selectedEscalationId) || null,
    [rows, selectedEscalationId]
  );

  const eligibleAssignees = useMemo(() => {
    if (!selectedRow) {
      return [];
    }

    return mockEnumerators.filter((person) => person.assignedZone === selectedRow.zone);
  }, [selectedRow]);

  const assigneeOptions = useMemo(
    () => [
      { value: '', label: tx('Select supervisor', 'ተቆጣጣሪ ይምረጡ') },
      ...eligibleAssignees.map((item) => ({ value: item.name, label: item.name })),
    ],
    [eligibleAssignees, tx]
  );

  const isAssigneeEligible = (name) => {
    if (!selectedRow || !name) {
      return false;
    }

    return eligibleAssignees.some((person) => person.name === name);
  };

  const assignEscalation = () => {
    if (!selectedEscalationId || !assignmentUser) {
      showToast(tx('Select an escalation and assignee first.', 'እባክዎ በመጀመሪያ አስቸኳይ ጉዳዩንና ተመዳቢውን ይምረጡ።'), 'warning');
      return;
    }

    if (!isAssigneeEligible(assignmentUser)) {
      showToast(
        tx(
          'Selected assignee is not eligible for this zone.',
          'የተመረጠው ተመዳቢ ለዚህ ዞን ብቁ አይደለም።'
        ),
        'warning'
      );
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === selectedEscalationId
          ? {
              ...row,
              assignedTo: assignmentUser,
              status: row.status === 'open' ? 'acknowledged' : row.status,
            }
          : row
      )
    );

    showToast(tx('Escalation assigned successfully.', 'አስቸኳይ ጉዳዩ በተሳካ ሁኔታ ተመድቧል።'), 'success');
  };

  const resolveEscalation = () => {
    if (!selectedEscalationId || !resolutionNote.trim() || !correctiveAction.trim()) {
      showToast(
        tx(
          'Provide root cause and corrective action before resolving.',
          'ለመፍታት በፊት ዋና ምክንያትና የተወሰደ ማስተካከያ እርምጃ ያስገቡ።'
        ),
        'warning'
      );
      return;
    }

    if (!selectedRow) {
      showToast(tx('No escalation is selected.', 'ምንም አስቸኳይ ጉዳይ አልተመረጠም።'), 'warning');
      return;
    }

    if (selectedRow.status === 'resolved') {
      showToast(tx('This escalation is already resolved.', 'ይህ አስቸኳይ ጉዳይ አስቀድሞ ተፈትቷል።'), 'warning');
      return;
    }

    const finalAssignee = assignmentUser || selectedRow.assignedTo;
    if (!isAssigneeEligible(finalAssignee)) {
      showToast(
        tx(
          'Assign an eligible supervisor before resolving.',
          'ከመፍታት በፊት ለዞኑ ብቁ የሆነ ተቆጣጣሪ ይመድቡ።'
        ),
        'warning'
      );
      return;
    }

    if (resolutionNote.trim().length < 12 || correctiveAction.trim().length < 12) {
      showToast(
        tx(
          'Root cause and corrective action must be at least 12 characters each.',
          'ዋና ምክንያትና የማስተካከያ እርምጃ ቢያንስ 12 ፊደላት መሆን አለባቸው።'
        ),
        'warning'
      );
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === selectedEscalationId
          ? {
              ...row,
              status: 'resolved',
              rootCause: resolutionNote,
              correctiveAction,
              assignedTo: finalAssignee,
              resolvedBy: finalAssignee,
              resolvedAt: new Date().toISOString(),
            }
          : row
      )
    );

    showToast(tx('Escalation resolved and logged.', 'አስቸኳይ ጉዳዩ ተፈትቶ በመዝገብ ላይ ተቀምጧል።'), 'success');
  };

  const exportReport = () => {
    if (filteredRows.length === 0) {
      showToast(tx('No escalations to export for this filter.', 'ለዚህ ማጣሪያ የሚወጣ አስቸኳይ ጉዳይ የለም።'), 'warning');
      return;
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const rowsForCsv = filteredRows.map((row) => [
      row.outletName,
      row.zone,
      formatTriggerReasons(row.triggerReason, tx),
      formatEscalationStatus(row.status, tx),
      row.assignedTo || tx('Unassigned', 'ያልተመደበ'),
      row.rootCause || '-',
      row.correctiveAction || '-',
      row.resolvedBy || '-',
      row.resolvedAt ? formatDateTime(row.resolvedAt) : '-',
    ]);

    downloadCsv(
      `escalations-${statusFilter}-${stamp}.csv`,
      [
        tx('Outlet', 'መሸጫ'),
        tx('Zone', 'ዞን'),
        tx('Reasons', 'ምክንያቶች'),
        tx('Status', 'ሁኔታ'),
        tx('Assigned To', 'የተመደበለት'),
        tx('Root Cause', 'ዋና ምክንያት'),
        tx('Corrective Action', 'የማስተካከያ እርምጃ'),
        tx('Resolved By', 'የፈታው'),
        tx('Resolved At', 'የተፈታበት'),
      ],
      rowsForCsv
    );

    showToast(tx('Escalation report exported.', 'የአስቸኳይ ጉዳይ ሪፖርት ተላክ።'), 'success');
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.hero}`}>
        <div className={styles.heroBody}>
          <p className={styles.kicker}>{tx('Supervisor and PM Console', 'የተቆጣጣሪ እና የፕሮጀክት አስተዳዳሪ ኮንሶል')}</p>
          <h1>{tx('Escalation Console', 'የአስቸኳይ ጉዳይ ኮንሶል')}</h1>
          <p>
            {tx(
              'Monitor open and resolved escalations, assign follow-up, log resolutions, and export reports.',
              'ክፍትና የተፈቱ አስቸኳይ ጉዳዮችን ይከታተሉ፣ ተመዳቢ ይመድቡ፣ የመፍትሄ ዝርዝር ይመዝግቡ እና ሪፖርት ያውጡ።'
            )}
          </p>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <Dropdown
            label={tx('Status Filter', 'የሁኔታ ማጣሪያ')}
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusFilterOptions}
          />

          <Button size="sm" onClick={exportReport}>
            {tx('Export Escalation Report', 'የአስቸኳይ ጉዳይ ሪፖርት አውጣ')}
          </Button>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{tx('Outlet', 'መሸጫ')}</th>
                <th>{tx('Zone', 'ዞን')}</th>
                <th>{tx('Reasons', 'ምክንያቶች')}</th>
                <th>{tx('Status', 'ሁኔታ')}</th>
                <th>{tx('24h Countdown', 'የ24 ሰዓት ቆጠራ')}</th>
                <th>{tx('Assign', 'መደብ')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.outletName}</td>
                  <td>{row.zone}</td>
                  <td>{formatTriggerReasons(row.triggerReason, tx)}</td>
                  <td>
                    <span
                      className={
                        row.status === 'resolved'
                          ? 'status-badge status-badge--compliant'
                          : row.status === 'acknowledged'
                            ? 'status-badge status-badge--warning'
                            : 'status-badge status-badge--critical'
                      }
                    >
                      {formatEscalationStatus(row.status, tx)}
                    </span>
                  </td>
                  <td>{countdown(row.deadlineAt, tx)}</td>
                  <td>
                    <button
                      className={styles.inlineButton}
                      type="button"
                      onClick={() => {
                        setSelectedEscalationId(row.id);
                        const zoneEligible = mockEnumerators.some(
                          (person) => person.name === row.assignedTo && person.assignedZone === row.zone
                        );
                        setAssignmentUser(zoneEligible ? row.assignedTo : '');
                        setResolutionNote(row.rootCause || '');
                        setCorrectiveAction(row.correctiveAction || '');
                      }}
                    >
                      {tx('Open', 'ክፈት')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>{tx('Resolution Log Editor', 'የመፍትሄ መዝገብ አርታዒ')}</h2>

        {!selectedRow && <p>{tx('Select an escalation from the table to manage.', 'ለማስተዳደር ከሰንጠረዡ አንድ አስቸኳይ ጉዳይ ይምረጡ።')}</p>}

        {selectedRow && (
          <div className={styles.editorGrid}>
            <p>
              <strong>{selectedRow.outletName}</strong> | {selectedRow.zone}
            </p>
            <p>
              {tx('Created', 'የተፈጠረበት')}: {formatDateTime(selectedRow.createdAt)} | {tx('Deadline', 'የመጨረሻ ሰዓት')}: {formatDateTime(selectedRow.deadlineAt)}
            </p>

            <Dropdown
              label={tx('Assign to Supervisor', 'ለተቆጣጣሪ መድብ')}
              value={assignmentUser}
              onChange={setAssignmentUser}
              options={assigneeOptions}
            />

            {selectedRow && eligibleAssignees.length === 0 && (
              <p className={styles.warningText}>
                {tx(
                  'No eligible supervisor found for this zone. Update team assignment first.',
                  'ለዚህ ዞን ብቁ ተቆጣጣሪ አልተገኘም። መጀመሪያ የቡድን ምደባን ያዘምኑ።'
                )}
              </p>
            )}

            <label>
              <span>{tx('Root Cause', 'ዋና ምክንያት')}</span>
              <textarea
                rows="3"
                value={resolutionNote}
                onChange={(event) => setResolutionNote(event.target.value)}
              />
            </label>

            <label>
              <span>{tx('Corrective Action Taken', 'የተወሰደ የማስተካከያ እርምጃ')}</span>
              <textarea
                rows="3"
                value={correctiveAction}
                onChange={(event) => setCorrectiveAction(event.target.value)}
              />
            </label>

            <div className={styles.actionRow}>
              <Button size="sm" variant="ghost" onClick={assignEscalation}>
                {tx('Save Assignment', 'ምደባ አስቀምጥ')}
              </Button>
              <Button size="sm" onClick={resolveEscalation}>
                {tx('Resolve Escalation', 'ጉዳዩን ፍታ')}
              </Button>
            </div>

            {(selectedRow.resolvedBy || selectedRow.resolvedAt) && (
              <p>
                {tx('Resolved by', 'የፈታው')}: {selectedRow.resolvedBy || '-'} | {tx('Resolved at', 'የተፈታበት')}: {selectedRow.resolvedAt ? formatDateTime(selectedRow.resolvedAt) : '-'}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default EscalationConsole;
