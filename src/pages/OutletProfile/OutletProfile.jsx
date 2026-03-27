import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/Toast/ToastContext';
import Dropdown from '../../components/Dropdown/Dropdown';
import {
  mockAuditVisits,
  mockEscalations,
  mockOutlets,
  mockPrizeLogs,
  mockPromoterAssignments,
} from '../../data/mockData';
import {
  formatAuditStatus,
  formatDay,
  formatEscalationStatus,
  formatOutletType,
  formatTriggerReasons,
} from '../../i18n/localeText';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './OutletProfile.module.css';

const HISTORY_PAGE_SIZE = 6;
const PRIZE_PAGE_SIZE = 12;

function isEvidenceLikelyExpired(loggedAt) {
  const ageMs = Date.now() - new Date(loggedAt).getTime();
  return ageMs > 45 * 24 * 3600 * 1000;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-ET', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Addis_Ababa',
  }).format(new Date(value));
}

function OutletProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tx } = useLanguage();
  const { showToast } = useToast();

  const routeOutlet = useMemo(() => mockOutlets.find((outlet) => outlet.id === id) || null, [id]);
  const isUnknownRoute = Boolean(id) && !routeOutlet;

  const selectedOutletId = routeOutlet?.id || mockOutlets[0].id;
  const [auditVisibleByOutlet, setAuditVisibleByOutlet] = useState({});
  const [escalationVisibleByOutlet, setEscalationVisibleByOutlet] = useState({});
  const [prizeVisibleByOutlet, setPrizeVisibleByOutlet] = useState({});
  const [promoterVisibleByOutlet, setPromoterVisibleByOutlet] = useState({});

  const selectedOutlet = useMemo(
    () => mockOutlets.find((outlet) => outlet.id === selectedOutletId) || mockOutlets[0],
    [selectedOutletId]
  );

  const auditVisibleCount = auditVisibleByOutlet[selectedOutlet.id] || HISTORY_PAGE_SIZE;
  const escalationVisibleCount = escalationVisibleByOutlet[selectedOutlet.id] || HISTORY_PAGE_SIZE;
  const prizeVisibleCount = prizeVisibleByOutlet[selectedOutlet.id] || PRIZE_PAGE_SIZE;
  const promoterVisibleCount = promoterVisibleByOutlet[selectedOutlet.id] || HISTORY_PAGE_SIZE;

  const auditHistory = useMemo(
    () =>
      mockAuditVisits
        .filter((audit) => audit.outletId === selectedOutlet.id)
        .sort((a, b) => (a.visitTimestamp < b.visitTimestamp ? 1 : -1)),
    [selectedOutlet.id]
  );

  const escalationHistory = useMemo(
    () =>
      mockEscalations
        .filter((item) => item.outletId === selectedOutlet.id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [selectedOutlet.id]
  );

  const prizeHistory = useMemo(
    () =>
      mockPrizeLogs
        .filter((item) => item.outletId === selectedOutlet.id)
        .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1)),
    [selectedOutlet.id]
  );

  const promoterHistory = useMemo(
    () =>
      mockPromoterAssignments
        .filter((item) => item.outletId === selectedOutlet.id)
        .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)),
    [selectedOutlet.id]
  );

  const outletOptions = useMemo(
    () => mockOutlets.map((outlet) => ({ value: outlet.id, label: outlet.name })),
    []
  );

  const handleOutletChange = (nextId) => {
    navigate(`/outlets/${nextId}`);
  };

  const requestEvidenceRefresh = () => {
    showToast(
      tx(
        'Evidence link may be expired. Re-upload request has been queued.',
        'የማስረጃ አገናኝ ሊያልፍ ይችላል። የዳግም ማስረጃ ጥያቄ ተመዝግቧል።'
      ),
      'warning'
    );
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.hero}`}>
        <div className={styles.heroBody}>
          <p className={styles.kicker}>{tx('Supervisor and PM View', 'የተቆጣጣሪ እና የፕሮጀክት አስተዳዳሪ እይታ')}</p>
          <h1>{tx('Outlet Profile', 'የመሸጫ መገለጫ')}</h1>
          <p>
            {tx(
              'Full outlet metadata, audit timeline, escalation context, prize verification, and promoter assignment history.',
              'ሙሉ የመሸጫ መረጃ፣ የኦዲት ታሪክ፣ የአስቸኳይ ጉዳይ ዝርዝር፣ የሽልማት ማረጋገጫ እና የፕሮሞተር ምደባ ታሪክ በአንድ ገጽ።'
            )}
          </p>
        </div>
      </section>

      {isUnknownRoute && (
        <section className={styles.warningPanel}>
          <p>
            {tx(
              `Outlet ID ${id} was not found. Showing the first available outlet instead.`,
              `የመሸጫ መለያ ${id} አልተገኘም። በምትኩ የመጀመሪያው የሚገኝ መሸጫ ታይቷል።`
            )}
          </p>
        </section>
      )}

      <section className={styles.panel}>
        <Dropdown
          className={styles.selector}
          label={tx('Select Outlet', 'መሸጫ ይምረጡ')}
          value={selectedOutlet.id}
          onChange={handleOutletChange}
          options={outletOptions}
        />

        <div className={styles.metaGrid}>
          <article>
            <h2>{tx('Zone', 'ዞን')}</h2>
            <p>{selectedOutlet.zone}</p>
          </article>
          <article>
            <h2>{tx('Outlet Type', 'የመሸጫ አይነት')}</h2>
            <p>{formatOutletType(selectedOutlet.outletType, tx)}</p>
          </article>
          <article>
            <h2>{tx('Sub City', 'ክፍለ ከተማ')}</h2>
            <p>{selectedOutlet.subCity}</p>
          </article>
          <article>
            <h2>{tx('Address', 'አድራሻ')}</h2>
            <p>{selectedOutlet.addressText}</p>
          </article>
          <article>
            <h2>{tx('GPS', 'ጂፒኤስ')}</h2>
            <p>
              {selectedOutlet.lat}, {selectedOutlet.lng}
            </p>
          </article>
          <article>
            <h2>{tx('Owner Contact', 'የባለቤት መገኛ')}</h2>
            <p>
              {selectedOutlet.ownerName} | {selectedOutlet.ownerPhone}
            </p>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>{tx('Complete Audit History Timeline', 'ሙሉ የኦዲት ታሪክ ቅደም ተከተል')}</h2>
        <ul className={styles.timelineList}>
          {auditHistory.length === 0 && <li>{tx('No audit records yet.', 'እስካሁን የኦዲት መዝገብ የለም።')}</li>}
          {auditHistory.slice(0, auditVisibleCount).map((audit) => (
            <li key={audit.id}>
              <div>
                <strong>{audit.visitDate}</strong>
                <p>
                  {tx('Score', 'ውጤት')}: {audit.complianceScore}% | {tx('Status', 'ሁኔታ')}: {formatAuditStatus(audit.status, tx)}
                </p>
                <p>
                  {tx('Enumerator', 'ኦዲተር')}: {audit.enumeratorName} | {tx('Day', 'ቀን')}: {formatDay(audit.visitDay, tx)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {auditVisibleCount < auditHistory.length && (
          <button
            type="button"
            className={styles.loadMore}
            onClick={() =>
              setAuditVisibleByOutlet((prev) => ({
                ...prev,
                [selectedOutlet.id]: (prev[selectedOutlet.id] || HISTORY_PAGE_SIZE) + HISTORY_PAGE_SIZE,
              }))
            }
          >
            {tx('Load More Audit History', 'ተጨማሪ የኦዲት ታሪክ አሳይ')}
          </button>
        )}
      </section>

      <section className={styles.panel}>
        <h2>{tx('Escalation History', 'የአስቸኳይ ጉዳይ ታሪክ')}</h2>
        <ul className={styles.timelineList}>
          {escalationHistory.length === 0 && <li>{tx('No escalations for this outlet.', 'ለዚህ መሸጫ የተመዘገበ አስቸኳይ ጉዳይ የለም።')}</li>}
          {escalationHistory.slice(0, escalationVisibleCount).map((item) => (
            <li key={item.id}>
              <div>
                <strong>{formatEscalationStatus(item.status, tx)}</strong>
                <p>{tx('Reasons', 'ምክንያቶች')}: {formatTriggerReasons(item.triggerReason, tx)}</p>
                <p>
                  {tx('Created', 'የተፈጠረበት')}: {formatDateTime(item.createdAt)} | {tx('Deadline', 'የመጨረሻ ሰዓት')}: {formatDateTime(item.deadlineAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {escalationVisibleCount < escalationHistory.length && (
          <button
            type="button"
            className={styles.loadMore}
            onClick={() =>
              setEscalationVisibleByOutlet((prev) => ({
                ...prev,
                [selectedOutlet.id]: (prev[selectedOutlet.id] || HISTORY_PAGE_SIZE) + HISTORY_PAGE_SIZE,
              }))
            }
          >
            {tx('Load More Escalations', 'ተጨማሪ አስቸኳይ ጉዳዮች አሳይ')}
          </button>
        )}
      </section>

      <section className={styles.panel}>
        <h2>{tx('Prize Log with Verified Photos', 'የሽልማት መዝገብ ከማረጋገጫ ፎቶ ጋር')}</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{tx('Winner', 'አሸናፊ')}</th>
                <th>{tx('Phone', 'ስልክ')}</th>
                <th>{tx('Prize', 'ሽልማት')}</th>
                <th>{tx('Promoter', 'ፕሮሞተር')}</th>
                <th>{tx('Evidence', 'ማስረጃ')}</th>
              </tr>
            </thead>
            <tbody>
              {prizeHistory.slice(0, prizeVisibleCount).map((item) => {
                const likelyExpired = isEvidenceLikelyExpired(item.loggedAt);

                return (
                <tr key={item.id}>
                  <td>{item.winnerName}</td>
                  <td>{item.winnerPhone}</td>
                  <td>{item.prizeDescription}</td>
                  <td>{item.promoterName}</td>
                  <td>
                    {!likelyExpired && (
                      <div className={styles.evidenceActions}>
                        <a href={item.redemptionSlipUrl} target="_blank" rel="noreferrer">
                          {tx('Slip', 'ስሊፕ')}
                        </a>
                        <a href={item.winnerPhotoUrl} target="_blank" rel="noreferrer">
                          {tx('Winner Photo', 'የአሸናፊ ፎቶ')}
                        </a>
                      </div>
                    )}

                    {likelyExpired && (
                      <div className={styles.evidenceActions}>
                        <span className={styles.expiredTag}>{tx('Evidence Link Expired', 'የማስረጃ አገናኝ ጊዜው አልፏል')}</span>
                        <button
                          type="button"
                          className={styles.inlineAction}
                          onClick={requestEvidenceRefresh}
                        >
                          {tx('Request Refresh', 'ዳግም አዘምን ይጠይቁ')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {prizeVisibleCount < prizeHistory.length && (
          <button
            type="button"
            className={styles.loadMore}
            onClick={() =>
              setPrizeVisibleByOutlet((prev) => ({
                ...prev,
                [selectedOutlet.id]: (prev[selectedOutlet.id] || PRIZE_PAGE_SIZE) + PRIZE_PAGE_SIZE,
              }))
            }
          >
            {tx('Load More Prize Logs', 'ተጨማሪ የሽልማት መዝገቦች አሳይ')}
          </button>
        )}
      </section>

      <section className={styles.panel}>
        <h2>{tx('Promoter Assignment History', 'የፕሮሞተር ምደባ ታሪክ')}</h2>
        <ul className={styles.timelineList}>
          {promoterHistory.length === 0 && <li>{tx('No promoter assignment history found.', 'የፕሮሞተር ምደባ ታሪክ አልተገኘም።')}</li>}
          {promoterHistory.slice(0, promoterVisibleCount).map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.promoterName}</strong>
                <p>{item.promoterPhone}</p>
                <p>
                  {tx('Assigned', 'የተመደበበት')}: {formatDateTime(item.startedAt)} | {tx('Ended', 'የተጠናቀቀበት')}: {item.endedAt ? formatDateTime(item.endedAt) : tx('Active', 'ንቁ')}
                </p>
                <p>{tx('Assigned By', 'የመደበው')}: {item.assignedBy}</p>
              </div>
            </li>
          ))}
        </ul>
        {promoterVisibleCount < promoterHistory.length && (
          <button
            type="button"
            className={styles.loadMore}
            onClick={() =>
              setPromoterVisibleByOutlet((prev) => ({
                ...prev,
                [selectedOutlet.id]: (prev[selectedOutlet.id] || HISTORY_PAGE_SIZE) + HISTORY_PAGE_SIZE,
              }))
            }
          >
            {tx('Load More Assignments', 'ተጨማሪ ምደባዎች አሳይ')}
          </button>
        )}
      </section>
    </main>
  );
}

export default OutletProfile;
