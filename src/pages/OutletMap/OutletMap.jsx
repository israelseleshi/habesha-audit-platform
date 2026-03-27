import { useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Button from '../../components/Button/Button';
import Dropdown from '../../components/Dropdown/Dropdown';
import {
  mockAuditVisits,
  mockEnumerators,
  mockLatestAuditByOutlet,
  mockOutlets,
} from '../../data/mockData';
import { formatAuditStatus, formatDay, formatTier, formatViewRole } from '../../i18n/localeText';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './OutletMap.module.css';

const tierColors = {
  compliant: '#2ecc71',
  warning: '#f39c12',
  critical: '#e74c3c',
  pending: '#95a5a6',
};

function toTier(score) {
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

function OutletMap() {
  const { tx } = useLanguage();
  const [zoneFilter, setZoneFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');
  const [enumeratorFilter, setEnumeratorFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [viewRole, setViewRole] = useState('supervisor');
  const [selectedOutletId, setSelectedOutletId] = useState(mockOutlets[0]?.id ?? '');
  const [mapRenderKey, setMapRenderKey] = useState(0);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  const outletRows = useMemo(() => {
    return mockOutlets.map((outlet) => {
      const latest = mockLatestAuditByOutlet[outlet.id];
      const history = mockAuditVisits
        .filter((visit) => visit.outletId === outlet.id)
        .sort((a, b) => (a.visitDate > b.visitDate ? 1 : -1));

      const tier = latest ? toTier(latest.complianceScore) : 'pending';

      return {
        ...outlet,
        latest,
        history,
        tier,
      };
    });
  }, []);

  const filteredOutlets = useMemo(() => {
    return outletRows.filter((outlet) => {
      const matchesZone = zoneFilter === 'all' || outlet.zone === zoneFilter;
      const matchesDay = dayFilter === 'all' || outlet.latest?.visitDay === dayFilter;
      const matchesEnumerator =
        enumeratorFilter === 'all' || outlet.latest?.enumeratorId === enumeratorFilter;
      const matchesTier = tierFilter === 'all' || outlet.tier === tierFilter;

      return matchesZone && matchesDay && matchesEnumerator && matchesTier;
    });
  }, [dayFilter, enumeratorFilter, outletRows, tierFilter, zoneFilter]);

  const selectedOutlet = useMemo(() => {
    const filteredSelected = filteredOutlets.find((item) => item.id === selectedOutletId);
    if (filteredSelected) {
      return filteredSelected;
    }

    return filteredOutlets[0] || null;
  }, [filteredOutlets, selectedOutletId]);

  const zoneOptions = useMemo(() => {
    const zones = [...new Set(mockOutlets.map((outlet) => outlet.zone))];
    return zones.sort((a, b) => a.localeCompare(b));
  }, []);

  const viewRoleOptions = useMemo(
    () => [
      { value: 'supervisor', label: formatViewRole('supervisor', tx) },
      { value: 'project_manager', label: formatViewRole('project_manager', tx) },
      { value: 'client_executive', label: formatViewRole('client_executive', tx) },
    ],
    [tx]
  );

  const zoneFilterOptions = useMemo(
    () => [{ value: 'all', label: tx('All Zones', 'ሁሉም ዞኖች') }, ...zoneOptions.map((zone) => ({ value: zone, label: zone }))],
    [tx, zoneOptions]
  );

  const dayOptions = useMemo(
    () => [
      { value: 'all', label: tx('All Days', 'ሁሉም ቀናት') },
      { value: 'saturday', label: formatDay('saturday', tx) },
      { value: 'sunday', label: formatDay('sunday', tx) },
      { value: 'thursday', label: formatDay('thursday', tx) },
    ],
    [tx]
  );

  const enumeratorOptions = useMemo(
    () => [
      { value: 'all', label: tx('All Enumerators', 'ሁሉም ኦዲተሮች') },
      ...mockEnumerators.map((enumerator) => ({ value: enumerator.id, label: enumerator.name })),
    ],
    [tx]
  );

  const tierOptions = useMemo(
    () => [
      { value: 'all', label: tx('All Tiers', 'ሁሉም ደረጃዎች') },
      { value: 'compliant', label: formatTier('compliant', tx) },
      { value: 'warning', label: formatTier('warning', tx) },
      { value: 'critical', label: formatTier('critical', tx) },
      { value: 'pending', label: formatTier('pending', tx) },
    ],
    [tx]
  );

  const clearFilters = () => {
    setZoneFilter('all');
    setDayFilter('all');
    setEnumeratorFilter('all');
    setTierFilter('all');
    setSelectedOutletId(mockOutlets[0]?.id ?? '');
  };

  const retryMapLoad = () => {
    setMapLoadFailed(false);
    setMapRenderKey((prev) => prev + 1);
  };

  const handleMapKeyDown = (event) => {
    if (filteredOutlets.length === 0) {
      return;
    }

    const currentIndex = Math.max(
      0,
      filteredOutlets.findIndex((item) => item.id === selectedOutletId)
    );

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % filteredOutlets.length;
      setSelectedOutletId(filteredOutlets[nextIndex].id);
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = (currentIndex - 1 + filteredOutlets.length) % filteredOutlets.length;
      setSelectedOutletId(filteredOutlets[nextIndex].id);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setSelectedOutletId(filteredOutlets[0].id);
    }

    if (event.key === 'End') {
      event.preventDefault();
      setSelectedOutletId(filteredOutlets[filteredOutlets.length - 1].id);
    }
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.hero}`}>
        <div className={styles.heroBody}>
          <p className={styles.kicker}>{tx('Cross-Role Geospatial View', 'የተለያዩ ሚናዎች የጂኦ እይታ')}</p>
          <h1>{tx('Outlet Compliance Map', 'የመሸጫ ተገዢነት ካርታ')}</h1>
          <p>
            {tx(
              'Live-style geospatial monitoring for 80 outlets with status-coded pins, drill-down details, and cross-filter controls.',
              'ለ80 መሸጫዎች በሁኔታ የተቀለሙ ፒኖች፣ ዝርዝር መግቢያዎች እና ተሻጋሪ ማጣሪያዎች ያሉበት የጂኦ ክትትል።'
            )}
          </p>
        </div>
      </section>

      <section className={styles.filters}>
        <Dropdown
          label={tx('View Role', 'የእይታ ሚና')}
          value={viewRole}
          onChange={setViewRole}
          options={viewRoleOptions}
        />

        <Dropdown
          label={tx('Zone', 'ዞን')}
          value={zoneFilter}
          onChange={setZoneFilter}
          options={zoneFilterOptions}
        />

        <Dropdown
          label={tx('Day', 'ቀን')}
          value={dayFilter}
          onChange={setDayFilter}
          options={dayOptions}
        />

        <Dropdown
          label={tx('Enumerator', 'ኦዲተር')}
          value={enumeratorFilter}
          onChange={setEnumeratorFilter}
          options={enumeratorOptions}
        />

        <Dropdown
          label={tx('Compliance Tier', 'የተገዢነት ደረጃ')}
          value={tierFilter}
          onChange={setTierFilter}
          options={tierOptions}
        />

        {filteredOutlets.length === 0 && (
          <div className={styles.filterActions}>
            <p>{tx('No outlets matched these filters.', 'እነዚህን ማጣሪያዎች የሚያሟላ መሸጫ አልተገኘም።')}</p>
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              {tx('Clear Filters', 'ማጣሪያዎችን አፅዳ')}
            </Button>
          </div>
        )}
      </section>

      <section className={styles.workspace}>
        <div
          className={styles.mapWrap}
          tabIndex={0}
          onKeyDown={handleMapKeyDown}
          aria-label={tx(
            'Outlet map. Use arrow keys to move between outlets.',
            'የመሸጫ ካርታ። በቀስት ቁልፎች መሸጫዎች መካከል ይንቀሳቀሱ።'
          )}
        >
          {!mapLoadFailed && (
            <MapContainer
              key={mapRenderKey}
              center={[9.03, 38.76]}
              zoom={12}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                eventHandlers={{
                  tileerror: () => setMapLoadFailed(true),
                  load: () => setMapLoadFailed(false),
                }}
              />

              {filteredOutlets.map((outlet) => {
                const score = outlet.latest?.complianceScore ?? 0;
                const tier = outlet.tier;

                return (
                  <CircleMarker
                    key={outlet.id}
                    center={[outlet.lat, outlet.lng]}
                    radius={selectedOutlet?.id === outlet.id ? 9 : 7}
                    pathOptions={{
                      color: '#111111',
                      weight: 1,
                      fillColor: tierColors[tier],
                      fillOpacity: 0.92,
                    }}
                    eventHandlers={{
                      click: () => setSelectedOutletId(outlet.id),
                    }}
                  >
                    <Popup>
                      <strong>{outlet.name}</strong>
                      <br />
                      {outlet.zone} | {tx('Score', 'ውጤት')}: {score}%
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          )}

          {mapLoadFailed && (
            <div className={styles.mapFallback}>
              <p>
                {tx(
                  'Map tiles failed to load. Check network and retry.',
                  'የካርታ ፋይሎች መጫን አልተሳካም። ኔትወርክን ያረጋግጡና ዳግም ይሞክሩ።'
                )}
              </p>
              <Button size="sm" onClick={retryMapLoad}>
                {tx('Retry Map', 'ካርታን ደግም')}
              </Button>
            </div>
          )}
        </div>

        <aside className={styles.sidePanel}>
          {!selectedOutlet && <p>{tx('No outlet matches the selected filters.', 'የተመረጡትን ማጣሪያዎች የሚያሟላ መሸጫ የለም።')}</p>}

              {filteredOutlets.length > 0 && (
                <p className={styles.mapHint}>
                  {tx(
                    'Keyboard tip: focus the map and use arrow keys to cycle outlets.',
                    'የቁልፍ ማስታወሻ፦ ካርታውን በፎከስ አድርገው በቀስት ቁልፎች መሸጫዎችን ይቀያይሩ።'
                  )}
                </p>
              )}

          {selectedOutlet && (
            <>
              <div className={styles.panelHeader}>
                <h2>{selectedOutlet.name}</h2>
                <span className={`status-badge status-badge--${selectedOutlet.tier === 'pending' ? 'warning' : selectedOutlet.tier}`}>
                  {formatTier(selectedOutlet.tier, tx)}
                </span>
              </div>

              <p className={styles.metaCopy}>{tx('Zone', 'ዞን')}: {selectedOutlet.zone}</p>
              <p className={styles.metaCopy}>{tx('Address', 'አድራሻ')}: {selectedOutlet.addressText}</p>

              {viewRole !== 'client_executive' && (
                <p className={styles.metaCopy}>{tx('Owner Contact', 'የባለቤት መገኛ')}: {selectedOutlet.ownerName} | {selectedOutlet.ownerPhone}</p>
              )}

              {selectedOutlet.latest ? (
                <>
                  <section className={styles.subSection}>
                    <h3>{tx('Latest Audit Summary', 'የቅርብ ኦዲት ማጠቃለያ')}</h3>
                    <p>{tx('Score', 'ውጤት')}: {selectedOutlet.latest.complianceScore}%</p>
                    <p>{tx('Status', 'ሁኔታ')}: {formatAuditStatus(selectedOutlet.latest.status, tx)}</p>
                    <p>{tx('Visit Day', 'የጉብኝት ቀን')}: {formatDay(selectedOutlet.latest.visitDay, tx)}</p>
                    <p>{tx('Enumerator', 'ኦዲተር')}: {selectedOutlet.latest.enumeratorName}</p>
                    {viewRole !== 'client_executive' && <p>{tx('Remarks', 'ማብራሪያ')}: {selectedOutlet.latest.remarks}</p>}
                  </section>

                  <section className={styles.subSection}>
                    <h3>{tx('Photo Thumbnails', 'የፎቶ አነስተኛ ምስሎች')}</h3>
                    <div className={styles.photoGrid}>
                      {selectedOutlet.latest.photos.map((photo, index) => (
                        <img
                          key={`${selectedOutlet.id}-photo-${index}`}
                          src={photo}
                          alt={tx(`Outlet evidence ${index + 1}`, `የመሸጫ ማስረጃ ${index + 1}`)}
                        />
                      ))}
                    </div>
                  </section>

                  <section className={styles.subSection}>
                    <h3>{tx('Score History', 'የውጤት ታሪክ')}</h3>
                    <ul className={styles.historyList}>
                      {selectedOutlet.history.slice(-6).map((item) => (
                        <li key={item.id}>
                          <span>{item.visitDate}</span>
                          <span>{item.complianceScore}%</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              ) : (
                <p className={styles.metaCopy}>{tx('No audit records yet for this outlet.', 'ለዚህ መሸጫ እስካሁን የኦዲት መዝገብ የለም።')}</p>
              )}
            </>
          )}
        </aside>
      </section>
    </main>
  );
}

export default OutletMap;
