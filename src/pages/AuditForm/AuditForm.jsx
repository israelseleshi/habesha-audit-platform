import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button/Button';
import { useToast } from '../../components/Toast/ToastContext';
import { formatTriggerReasons } from '../../i18n/localeText';
import { useLanguage } from '../../i18n/LanguageContext';
import { getCurrentPosition } from '../../services/photoUpload';
import styles from './AuditForm.module.css';

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

const assignedOutlets = [
  {
    id: 'outlet-001',
    name: 'Tej Bet Desta',
    zone: 'AA-C',
    supervisor: 'Hiwot Tesfaye',
  },
  {
    id: 'outlet-002',
    name: 'Addis Bar & Restaurant',
    zone: 'AA-N',
    supervisor: 'Samuel Worku',
  },
  {
    id: 'outlet-003',
    name: 'Kazanchis Night Spot',
    zone: 'AA-C',
    supervisor: 'Hiwot Tesfaye',
  },
];

const initialFormState = {
  posmPlacement: '',
  brandedMaterialCondition: '',
  tablePresence: '',
  retailPriceCorrect: '',
  promoSkuInStock: '',
  freeProductUnits: '',
  promoterPresent: '',
  promoterHours: '',
  staffAwarenessScore: '',
  staffPrizeKnowledge: '',
  customerAwareness: '',
  winnerName: '',
  winnerPhone: '',
  remarks: '',
  manualEscalation: false,
  posmPhoto: null,
  brandedMaterialPhoto: null,
  retailPricePhoto: null,
  promoterPhoto: null,
  redemptionSlipPhoto: null,
  winnerPhoto: null,
};

const requiredFields = [
  { key: 'posmPlacement', en: 'POSM placement', am: 'የPOSM አቀማመጥ' },
  { key: 'brandedMaterialCondition', en: 'Branded material condition score', am: 'የብራንድ እቃ ሁኔታ ውጤት' },
  { key: 'tablePresence', en: 'Table presence vs brief', am: 'የጠረጴዛ አቀማመጥ ከብሪፉ ጋር መመጣጠን' },
  { key: 'retailPriceCorrect', en: 'Correct retail price', am: 'የትክክለኛ የችርቻሮ ዋጋ' },
  { key: 'promoSkuInStock', en: 'Promo SKU in stock', am: 'የፕሮሞ ምርት በክምችት ላይ መኖር' },
  { key: 'freeProductUnits', en: 'Free product units', am: 'ነፃ ምርት ብዛት' },
  { key: 'promoterPresent', en: 'Promoter present', am: 'ፕሮሞተር በቦታው መኖሩ' },
  { key: 'promoterHours', en: 'Promoter logged hours', am: 'የፕሮሞተር የስራ ሰዓት' },
  { key: 'staffAwarenessScore', en: 'Staff awareness score', am: 'የሰራተኞች ግንዛቤ ውጤት' },
  { key: 'staffPrizeKnowledge', en: 'Prize structure knowledge', am: 'የሽልማት አወቃቀር እውቀት' },
  { key: 'customerAwareness', en: 'Customer awareness', am: 'የደንበኛ ግንዛቤ' },
  { key: 'winnerName', en: 'Winner name', am: 'የአሸናፊ ስም' },
  { key: 'winnerPhone', en: 'Winner phone', am: 'የአሸናፊ ስልክ' },
];

const requiredPhotos = [
  { key: 'posmPhoto', en: 'POSM placement photo', am: 'የPOSM አቀማመጥ ፎቶ' },
  { key: 'brandedMaterialPhoto', en: 'Branded materials condition photo', am: 'የብራንድ እቃ ሁኔታ ፎቶ' },
  { key: 'retailPricePhoto', en: 'Retail price board photo', am: 'የዋጋ ሰሌዳ ፎቶ' },
  { key: 'promoterPhoto', en: 'Promoter presence photo', am: 'የፕሮሞተር መገኘት ፎቶ' },
  { key: 'redemptionSlipPhoto', en: 'Signed redemption slip photo', am: 'የተፈረመ የመስጫ ሰነድ ፎቶ' },
  { key: 'winnerPhoto', en: 'Winner photo', am: 'የአሸናፊ ፎቶ' },
];

function calculateComplianceScore(values) {
  let score = 0;

  if (values.posmPlacement === 'yes') score += 15;
  score += (Number(values.brandedMaterialCondition) || 0) * 4;
  if (values.tablePresence === 'yes') score += 6;
  if (values.retailPriceCorrect === 'yes') score += 15;
  if (values.promoSkuInStock === 'yes') score += 10;
  if (values.promoterPresent === 'yes') score += 15;
  score += (Number(values.staffAwarenessScore) || 0) * 3;
  if (values.staffPrizeKnowledge === 'yes') score += 8;
  if (values.customerAwareness === 'yes') score += 8;
  if (values.customerAwareness === 'partially') score += 4;

  return Math.min(100, Number(score.toFixed(2)));
}

function buildEscalationReasons(values, score) {
  const reasons = [];

  if (values.promoterPresent === 'no') {
    reasons.push('promoter_absent');
  }

  if (Number(values.brandedMaterialCondition) <= 2) {
    reasons.push('branded_material_condition_low');
  }

  if (values.manualEscalation) {
    reasons.push('manual_flag');
  }

  if (score < 40) {
    reasons.push('low_compliance_score');
  }

  return reasons;
}

function PhotoField({ id, label, photoValue, isCapturingGps, onChange, errorCopy, warningCopy, tx }) {
  const gpsCopy = photoValue?.gps
    ? `GPS ${photoValue.gps.lat.toFixed(5)}, ${photoValue.gps.lng.toFixed(5)} (±${Math.round(photoValue.gps.accuracy)}m)`
    : tx('GPS capture unavailable', 'የGPS መረጃ አልተገኘም');

  return (
    <label className={styles.photoField} htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      {isCapturingGps && <small>{tx('Capturing GPS coordinates...', 'የGPS መረጃ በመሰብሰብ ላይ...')}</small>}
      {!isCapturingGps && photoValue?.file && (
        <small>
          {photoValue.file.name} - {gpsCopy}
        </small>
      )}
      {warningCopy && <small className={styles.warningText}>{warningCopy}</small>}
      {errorCopy && <small className={styles.errorText}>{errorCopy}</small>}
    </label>
  );
}

function AuditForm() {
  const { tx, isAmharic } = useLanguage();
  const { showToast } = useToast();
  const [selectedOutletId, setSelectedOutletId] = useState(assignedOutlets[0].id);
  const [formState, setFormState] = useState(initialFormState);
  const [validationErrors, setValidationErrors] = useState([]);
  const [gpsCaptureState, setGpsCaptureState] = useState({});
  const [gpsWarnings, setGpsWarnings] = useState({});
  const [photoErrors, setPhotoErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSummary, setSubmitSummary] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const outlet = useMemo(
    () => assignedOutlets.find((item) => item.id === selectedOutletId),
    [selectedOutletId]
  );

  const projectedScore = useMemo(() => calculateComplianceScore(formState), [formState]);
  const projectedEscalations = useMemo(
    () => buildEscalationReasons(formState, projectedScore),
    [formState, projectedScore]
  );

  useEffect(() => {
    const hasUnsavedChanges = isDirty && !isSubmitting;

    const warnOnUnload = (event) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnOnUnload);

    return () => {
      window.removeEventListener('beforeunload', warnOnUnload);
    };
  }, [isDirty, isSubmitting]);

  const updateField = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormState((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);

    if (field === 'remarks' && value.trim()) {
      setValidationErrors((prev) => prev.filter((item) => item !== tx('Escalation remarks', 'የአስቸኳይ ጉዳይ ማብራሪያ')));
    }
  };

  const handlePhotoChange = async (field, file) => {
    if (!file) {
      setFormState((prev) => ({ ...prev, [field]: null }));
      setGpsWarnings((prev) => ({ ...prev, [field]: '' }));
      setPhotoErrors((prev) => ({ ...prev, [field]: '' }));
      setIsDirty(true);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPhotoErrors((prev) => ({
        ...prev,
        [field]: tx('Only image files are allowed.', 'የምስል ፋይሎች ብቻ ይፈቀዳሉ።'),
      }));
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoErrors((prev) => ({
        ...prev,
        [field]: tx('Photo must be 10MB or smaller.', 'ፎቶው 10MB ወይም ከዚያ በታች መሆን አለበት።'),
      }));
      return;
    }

    setPhotoErrors((prev) => ({ ...prev, [field]: '' }));
    setGpsWarnings((prev) => ({ ...prev, [field]: '' }));

    setGpsCaptureState((prev) => ({ ...prev, [field]: true }));
    const gps = await getCurrentPosition();

    setFormState((prev) => ({
      ...prev,
      [field]: {
        file,
        gps,
      },
    }));

    setIsDirty(true);

    if (!gps) {
      const warningCopy = tx(
        'GPS could not be captured for this photo. This record may require manual supervisor review.',
        'ለዚህ ፎቶ GPS መረጃ አልተሰበሰበም። ይህ መዝገብ በእጅ የተቆጣጣሪ ምርመራ ሊያስፈልገው ይችላል።'
      );
      setGpsWarnings((prev) => ({ ...prev, [field]: warningCopy }));
      showToast(warningCopy, 'warning');
    }

    setGpsCaptureState((prev) => ({ ...prev, [field]: false }));
  };

  const validate = () => {
    const missing = [];

    for (const field of requiredFields) {
      const value = formState[field.key];
      if (value === '' || value === null || value === undefined) {
        missing.push(isAmharic ? field.am : field.en);
      }
    }

    for (const field of requiredPhotos) {
      if (!formState[field.key]?.file) {
        missing.push(isAmharic ? field.am : field.en);
      }
    }

    if (formState.manualEscalation && !formState.remarks.trim()) {
      missing.push(tx('Escalation remarks', 'የአስቸኳይ ጉዳይ ማብራሪያ'));
    }

    const validPhone = /^\+?[0-9]{7,15}$/.test(formState.winnerPhone.trim());
    if (!validPhone) {
      missing.push(tx('Valid winner phone', 'ትክክለኛ የአሸናፊ ስልክ'));
    }

    return missing;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const missingItems = validate();
    if (missingItems.length > 0) {
      setValidationErrors(missingItems);
      setSubmitSummary(null);
      return;
    }

    setValidationErrors([]);
    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 700));

    const complianceScore = calculateComplianceScore(formState);
    const escalationReasons = buildEscalationReasons(formState, complianceScore);

    const payload = {
      outlet,
      complianceScore,
      escalationFlag: escalationReasons.length > 0,
      escalationReasons,
      submittedAt: new Date().toISOString(),
    };

    setSubmitSummary(payload);
    setIsDirty(false);
    setIsSubmitting(false);

    if (escalationReasons.length > 0) {
      showToast(
        tx(
          `Audit submitted with escalation: ${escalationReasons.join(', ')}`,
          `ኦዲቱ ከአስቸኳይ ምልክት ጋር ተልኳል፦ ${formatTriggerReasons(escalationReasons, tx)}`
        ),
        'warning'
      );
    } else {
      showToast(tx('Audit submitted successfully.', 'ኦዲቱ በተሳካ ሁኔታ ተልኳል።'), 'success');
    }
  };

  return (
    <main className={styles.page}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <header className={`tibeb-border ${styles.hero}`}>
          <div className={styles.heroHeading}>
            <p className={styles.kicker}>{tx('Field Enumerator Workspace', 'የመስክ ኦዲተር ስርዓት')}</p>
            <h1>{tx('Audit Submission Form', 'የኦዲት ማስገቢያ ቅጽ')}</h1>
            <p>
              {tx(
                'Mobile-first capture with outlet assignment, mandatory geo-tagged photo validation, and escalation trigger logic.',
                'ለሞባይል የተመቻቸ ማስገቢያ፣ የመሸጫ ምደባ፣ አስገዳጅ የGPS ፎቶ ማረጋገጫ እና የአስቸኳይ ጉዳይ መነሻ ህግ ያካትታል።'
              )}
            </p>
          </div>
          <div className={styles.statusRow}>
            <span className="status-badge status-badge--compliant">{tx('RLS-ready outlet selection', 'ለRLS የተዘጋጀ የመሸጫ ምርጫ')}</span>
            <span className="status-badge status-badge--warning">{tx('Supervisor sign-off request on submit', 'ከማስገባት በኋላ የተቆጣጣሪ ፊርማ ጥያቄ')}</span>
          </div>
        </header>

        <section className={styles.panel}>
          <h2>{tx('Outlet Assignment', 'የመሸጫ ምደባ')}</h2>
          <label className={styles.field}>
            <span>{tx('Select outlet', 'መሸጫ ይምረጡ')}</span>
            <select value={selectedOutletId} onChange={(event) => setSelectedOutletId(event.target.value)}>
              {assignedOutlets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.metaGrid}>
            <article>
              <h3>{tx('Outlet', 'መሸጫ')}</h3>
              <p>{outlet?.name}</p>
            </article>
            <article>
              <h3>{tx('Zone', 'ዞን')}</h3>
              <p>{outlet?.zone}</p>
            </article>
            <article>
              <h3>{tx('Supervisor', 'ተቆጣጣሪ')}</h3>
              <p>{outlet?.supervisor}</p>
            </article>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>{tx('1. Promotion Visibility', '1. የፕሮሞሽን ታይነት')}</h2>
          <div className={styles.twoCol}>
            <label className={styles.field}>
              <span>{tx('POSM placement', 'የPOSM አቀማመጥ')}</span>
              <select value={formState.posmPlacement} onChange={updateField('posmPlacement')}>
                <option value="">{tx('Select', 'ይምረጡ')}</option>
                <option value="yes">{tx('Yes', 'አዎ')}</option>
                <option value="no">{tx('No', 'አይ')}</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>{tx('Branded material condition (1-5)', 'የብራንድ እቃ ሁኔታ (1-5)')}</span>
              <input
                type="number"
                min="1"
                max="5"
                value={formState.brandedMaterialCondition}
                onChange={updateField('brandedMaterialCondition')}
              />
            </label>
          </div>
          <label className={styles.field}>
            <span>{tx('Table presence vs brief', 'የጠረጴዛ አቀማመጥ ከብሪፉ ጋር')}</span>
            <select value={formState.tablePresence} onChange={updateField('tablePresence')}>
              <option value="">{tx('Select', 'ይምረጡ')}</option>
              <option value="yes">{tx('Yes', 'አዎ')}</option>
              <option value="no">{tx('No', 'አይ')}</option>
            </select>
          </label>
          <div className={styles.photoGrid}>
            <PhotoField
              id="posmPhoto"
              label={tx('POSM photo', 'የPOSM ፎቶ')}
              photoValue={formState.posmPhoto}
              isCapturingGps={gpsCaptureState.posmPhoto}
              onChange={(file) => handlePhotoChange('posmPhoto', file)}
              warningCopy={gpsWarnings.posmPhoto}
              errorCopy={photoErrors.posmPhoto}
              tx={tx}
            />
            <PhotoField
              id="brandedMaterialPhoto"
              label={tx('Branded material condition photo', 'የብራንድ እቃ ሁኔታ ፎቶ')}
              photoValue={formState.brandedMaterialPhoto}
              isCapturingGps={gpsCaptureState.brandedMaterialPhoto}
              onChange={(file) => handlePhotoChange('brandedMaterialPhoto', file)}
              warningCopy={gpsWarnings.brandedMaterialPhoto}
              errorCopy={photoErrors.brandedMaterialPhoto}
              tx={tx}
            />
          </div>
        </section>

        <section className={styles.panel}>
          <h2>{tx('2. Price Execution', '2. የዋጋ አፈጻጸም')}</h2>
          <label className={styles.field}>
            <span>{tx('Correct retail price for promo SKUs', 'ለፕሮሞ ምርቶች ትክክለኛ የችርቻሮ ዋጋ')}</span>
            <select value={formState.retailPriceCorrect} onChange={updateField('retailPriceCorrect')}>
              <option value="">{tx('Select', 'ይምረጡ')}</option>
              <option value="yes">{tx('Yes', 'አዎ')}</option>
              <option value="no">{tx('No', 'አይ')}</option>
            </select>
          </label>
          <PhotoField
            id="retailPricePhoto"
            label={tx('Price board photo', 'የዋጋ ሰሌዳ ፎቶ')}
            photoValue={formState.retailPricePhoto}
            isCapturingGps={gpsCaptureState.retailPricePhoto}
            onChange={(file) => handlePhotoChange('retailPricePhoto', file)}
            warningCopy={gpsWarnings.retailPricePhoto}
            errorCopy={photoErrors.retailPricePhoto}
            tx={tx}
          />
        </section>

        <section className={styles.panel}>
          <h2>{tx('3. SKU Availability', '3. የምርት አቅርቦት')}</h2>
          <div className={styles.twoCol}>
            <label className={styles.field}>
              <span>{tx('Promo SKUs in stock', 'የፕሮሞ ምርት በክምችት ላይ')}</span>
              <select value={formState.promoSkuInStock} onChange={updateField('promoSkuInStock')}>
                <option value="">{tx('Select', 'ይምረጡ')}</option>
                <option value="yes">{tx('Yes', 'አዎ')}</option>
                <option value="no">{tx('No', 'አይ')}</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>{tx('Free product inventory count', 'የነፃ ምርት ብዛት')}</span>
              <input
                type="number"
                min="0"
                value={formState.freeProductUnits}
                onChange={updateField('freeProductUnits')}
              />
            </label>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>{tx('4. Promoter Presence', '4. የፕሮሞተር መገኘት')}</h2>
          <div className={styles.twoCol}>
            <label className={styles.field}>
              <span>{tx('Promoter on site during activation window', 'ፕሮሞተር በተወሰነው ሰዓት በቦታው ነበር?')}</span>
              <select value={formState.promoterPresent} onChange={updateField('promoterPresent')}>
                <option value="">{tx('Select', 'ይምረጡ')}</option>
                <option value="yes">{tx('Yes', 'አዎ')}</option>
                <option value="no">{tx('No', 'አይ')}</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>{tx('Hours logged', 'የተመዘገበ ሰዓት')}</span>
              <input type="time" value={formState.promoterHours} onChange={updateField('promoterHours')} />
            </label>
          </div>
          <PhotoField
            id="promoterPhoto"
            label={tx('Promoter presence photo', 'የፕሮሞተር መገኘት ፎቶ')}
            photoValue={formState.promoterPhoto}
            isCapturingGps={gpsCaptureState.promoterPhoto}
            onChange={(file) => handlePhotoChange('promoterPhoto', file)}
            warningCopy={gpsWarnings.promoterPhoto}
            errorCopy={photoErrors.promoterPhoto}
            tx={tx}
          />
        </section>

        <section className={styles.panel}>
          <h2>{tx('5. Staff Awareness', '5. የሰራተኛ ግንዛቤ')}</h2>
          <div className={styles.twoCol}>
            <label className={styles.field}>
              <span>{tx('Staff awareness score (1-5)', 'የሰራተኛ ግንዛቤ ውጤት (1-5)')}</span>
              <input
                type="number"
                min="1"
                max="5"
                value={formState.staffAwarenessScore}
                onChange={updateField('staffAwarenessScore')}
              />
            </label>
            <label className={styles.field}>
              <span>{tx('Prize structure knowledge', 'የሽልማት አወቃቀር እውቀት')}</span>
              <select value={formState.staffPrizeKnowledge} onChange={updateField('staffPrizeKnowledge')}>
                <option value="">{tx('Select', 'ይምረጡ')}</option>
                <option value="yes">{tx('Yes', 'አዎ')}</option>
                <option value="no">{tx('No', 'አይ')}</option>
              </select>
            </label>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>{tx('6. Customer Awareness', '6. የደንበኛ ግንዛቤ')}</h2>
          <label className={styles.field}>
            <span>{tx('Sampled customer aware of promotion', 'የተጠየቀው ደንበኛ ፕሮሞሽኑን ያውቃል?')}</span>
            <select value={formState.customerAwareness} onChange={updateField('customerAwareness')}>
              <option value="">{tx('Select', 'ይምረጡ')}</option>
              <option value="yes">{tx('Yes', 'አዎ')}</option>
              <option value="partially">{tx('Partially', 'በከፊል')}</option>
              <option value="no">{tx('No', 'አይ')}</option>
            </select>
          </label>
        </section>

        <section className={styles.panel}>
          <h2>{tx('7. Winner / Prize Verification', '7. የአሸናፊ እና ሽልማት ማረጋገጫ')}</h2>
          <div className={styles.twoCol}>
            <label className={styles.field}>
              <span>{tx('Winner name', 'የአሸናፊ ስም')}</span>
              <input value={formState.winnerName} onChange={updateField('winnerName')} />
            </label>
            <label className={styles.field}>
              <span>{tx('Winner phone', 'የአሸናፊ ስልክ')}</span>
              <input type="tel" value={formState.winnerPhone} onChange={updateField('winnerPhone')} />
            </label>
          </div>
          <div className={styles.photoGrid}>
            <PhotoField
              id="redemptionSlipPhoto"
              label={tx('Signed redemption slip photo', 'የተፈረመ መስጫ ሰነድ ፎቶ')}
              photoValue={formState.redemptionSlipPhoto}
              isCapturingGps={gpsCaptureState.redemptionSlipPhoto}
              onChange={(file) => handlePhotoChange('redemptionSlipPhoto', file)}
              warningCopy={gpsWarnings.redemptionSlipPhoto}
              errorCopy={photoErrors.redemptionSlipPhoto}
              tx={tx}
            />
            <PhotoField
              id="winnerPhoto"
              label={tx('Winner photo', 'የአሸናፊ ፎቶ')}
              photoValue={formState.winnerPhoto}
              isCapturingGps={gpsCaptureState.winnerPhoto}
              onChange={(file) => handlePhotoChange('winnerPhoto', file)}
              warningCopy={gpsWarnings.winnerPhoto}
              errorCopy={photoErrors.winnerPhoto}
              tx={tx}
            />
          </div>
        </section>

        <section className={styles.panel}>
          <h2>{tx('Escalation and Remarks', 'አስቸኳይ ጉዳይ እና ማብራሪያ')}</h2>
          <label className={styles.field}>
            <span>{tx('Escalation context remarks', 'የአስቸኳይ ጉዳይ ማብራሪያ')}</span>
            <textarea
              rows="4"
              value={formState.remarks}
              onChange={updateField('remarks')}
              placeholder={tx(
                'Describe any field risks, owner feedback, or execution gaps...',
                'የመስክ አደጋዎችን፣ የባለቤት አስተያየትን ወይም አፈጻጸም ክፍተቶችን ይግለጹ...'
              )}
            />
          </label>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={formState.manualEscalation}
              onChange={updateField('manualEscalation')}
            />
            <span>{tx('Manual escalation flag', 'በእጅ የተነሳ አስቸኳይ ጉዳይ')}</span>
          </label>

          <div className={styles.warningPanel}>
            <p>
              {tx('Escalation preview', 'የአስቸኳይ ጉዳይ ቅድመ እይታ')}: {projectedEscalations.length > 0 ? formatTriggerReasons(projectedEscalations, tx) : tx('No escalation currently triggered.', 'በአሁኑ ጊዜ የተነሳ አስቸኳይ ጉዳይ የለም።')}
            </p>
          </div>
        </section>

        {validationErrors.length > 0 && (
          <section className={styles.errorPanel}>
            <h3>{tx('Missing required inputs', 'አስፈላጊ መረጃዎች አልተሟሉም')}</h3>
            <ul>
              {validationErrors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {submitSummary && (
          <section className={styles.resultPanel}>
            <h3>{tx('Submission Ready for Supervisor Sign-off', 'ማስገቢያው ለተቆጣጣሪ ፊርማ ዝግጁ ነው')}</h3>
            <p>
              {tx('Compliance score', 'የተግባር ተገዢነት ውጤት')}: {submitSummary.complianceScore}%
            </p>
            <p>
              {tx('Escalation', 'አስቸኳይ ጉዳይ')}: {submitSummary.escalationFlag ? tx('Yes', 'አዎ') : tx('No', 'አይ')}
              {submitSummary.escalationReasons.length > 0
                ? ` (${submitSummary.escalationReasons.join(', ')})`
                : ''}
            </p>
          </section>
        )}

        <div className={styles.actions}>
          <Button type="submit" size="lg" loading={isSubmitting}>
            {tx('Submit Audit and Request Supervisor Sign-off', 'ኦዲቱን አስገብተው የተቆጣጣሪ ፊርማ ይጠይቁ')}
          </Button>
        </div>
      </form>
    </main>
  );
}

export default AuditForm;
