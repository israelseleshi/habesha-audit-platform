import { useMemo, useState } from 'react';
import Button from '../../components/Button/Button';
import Dropdown from '../../components/Dropdown/Dropdown';
import { useToast } from '../../components/Toast/ToastContext';
import { mockQuestionnaireItems, mockQuestionnaireVersions } from '../../data/mockData';
import { formatQuestionSection, formatResponseType } from '../../i18n/localeText';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './QuestionnaireManager.module.css';

function QuestionnaireManager() {
  const { tx } = useLanguage();
  const { showToast } = useToast();
  const [versions, setVersions] = useState(mockQuestionnaireVersions);
  const [items, setItems] = useState(mockQuestionnaireItems);
  const [selectedVersionId, setSelectedVersionId] = useState(
    mockQuestionnaireVersions.find((item) => item.isActive)?.id || mockQuestionnaireVersions[0].id
  );
  const [newItem, setNewItem] = useState({
    section: 'promotion_visibility',
    itemKey: '',
    questionText: '',
    responseType: 'yes_no',
    photoRequired: false,
  });

  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId),
    [versions, selectedVersionId]
  );
  const isVersionLocked = Boolean(selectedVersion?.approvedAt);

  const versionItems = useMemo(
    () =>
      items
        .filter((item) => item.versionId === selectedVersionId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [items, selectedVersionId]
  );

  const sectionOptions = useMemo(
    () => [
      { value: 'promotion_visibility', label: tx('Promotion Visibility', 'የፕሮሞሽን ታይነት') },
      { value: 'price_execution', label: tx('Price Execution', 'የዋጋ አፈጻጸም') },
      { value: 'sku_availability', label: tx('SKU Availability', 'የምርት አቅርቦት') },
      { value: 'promoter_presence', label: tx('Promoter Presence', 'የፕሮሞተር መገኘት') },
      { value: 'winner_verification', label: tx('Winner Verification', 'የአሸናፊ ማረጋገጫ') },
    ],
    [tx]
  );

  const responseTypeOptions = useMemo(
    () => [
      { value: 'yes_no', label: tx('Yes / No', 'አዎ / አይ') },
      { value: 'score_1_5', label: tx('Score 1-5', 'ውጤት 1-5') },
      { value: 'multiple_choice', label: tx('Multiple Choice', 'ብዙ አማራጮች') },
      { value: 'numeric', label: tx('Numeric', 'ቁጥራዊ') },
      { value: 'text', label: tx('Text', 'ጽሑፍ') },
    ],
    [tx]
  );

  const createVersion = () => {
    const nextVersionNumber = Math.max(...versions.map((version) => version.versionNumber)) + 1;
    const nextVersion = {
      id: `qv-${String(nextVersionNumber).padStart(3, '0')}`,
      versionNumber: nextVersionNumber,
      title: `Questionnaire v${nextVersionNumber}`,
      isActive: false,
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
    };

    setVersions((prev) => [nextVersion, ...prev]);
    setSelectedVersionId(nextVersion.id);
    showToast(
      tx(
        `Version ${nextVersionNumber} created. Add items and submit for approval.`,
        `ስሪት ${nextVersionNumber} ተፈጥሯል። ጥያቄዎችን ያክሉና ለማፅደቅ ያቅርቡ።`
      ),
      'success'
    );
  };

  const activateVersion = (versionId) => {
    const target = versions.find((version) => version.id === versionId);
    if (!target) {
      return;
    }

    if (!target.approvedAt) {
      showToast(tx('Only approved versions can be activated.', 'ፀድቀው የተሰጡ ስሪቶች ብቻ ሊነቁ ይችላሉ።'), 'warning');
      return;
    }

    const confirmed = window.confirm(
      tx(
        'Activate this version for all field teams?',
        'ይህን ስሪት ለሁሉም የመስክ ቡድኖች ንቁ ማድረግ ይፈልጋሉ?'
      )
    );

    if (!confirmed) {
      return;
    }

    setVersions((prev) =>
      prev.map((version) => ({
        ...version,
        isActive: version.id === versionId,
      }))
    );
    setSelectedVersionId(versionId);
    showToast(tx('Selected version is now active for field teams.', 'የተመረጠው ስሪት ለመስክ ቡድን ንቁ ሆኗል።'), 'success');
  };

  const deactivateVersion = (versionId) => {
    const target = versions.find((version) => version.id === versionId);
    if (!target?.isActive) {
      return;
    }

    const confirmed = window.confirm(
      tx(
        'Deactivate this version? No version will remain active until another one is selected.',
        'ይህን ስሪት ንቁ ሁኔታ ከማጥፋት በኋላ ሌላ ስሪት እስኪመረጥ ድረስ ንቁ ስሪት አይኖርም።'
      )
    );

    if (!confirmed) {
      return;
    }

    setVersions((prev) =>
      prev.map((version) => ({
        ...version,
        isActive: version.id === versionId ? false : version.isActive,
      }))
    );
    showToast(tx('Version deactivated.', 'ስሪቱ ንቁ ሁኔታው ተወግዷል።'), 'warning');
  };

  const submitForApproval = () => {
    if (isVersionLocked) {
      showToast(tx('This version is already approved and locked.', 'ይህ ስሪት ቀድሞ ፀድቋል እና ተቆልፏል።'), 'warning');
      return;
    }

    setVersions((prev) =>
      prev.map((version) =>
        version.id === selectedVersionId
          ? {
              ...version,
              approvedBy: 'Tigist Bekele',
              approvedAt: new Date().toISOString(),
            }
          : version
      )
    );

    showToast(tx('Version submitted and approved by client representative.', 'ስሪቱ ተልኮ በደንበኛ ተወካይ ተፅድቋል።'), 'success');
  };

  const addItem = () => {
    if (isVersionLocked) {
      showToast(tx('Approved versions are locked. Create a new version to edit.', 'የፀደቁ ስሪቶች ተቆልፈዋል። ለማሻሻል አዲስ ስሪት ይፍጠሩ።'), 'warning');
      return;
    }

    if (!newItem.itemKey.trim() || !newItem.questionText.trim()) {
      showToast(tx('Item key and question text are required.', 'የጥያቄ ቁልፍ እና የጥያቄ ጽሑፍ ያስፈልጋሉ።'), 'warning');
      return;
    }

    const exists = versionItems.some(
      (item) => item.itemKey.toLowerCase() === newItem.itemKey.trim().toLowerCase()
    );

    if (exists) {
      showToast(
        tx('Item key already exists in this version.', 'ይህ የንጥል ቁልፍ በዚህ ስሪት ውስጥ አስቀድሞ አለ።'),
        'warning'
      );
      return;
    }

    const sortOrder = versionItems.length + 1;
    const created = {
      id: `qi-${Date.now()}`,
      versionId: selectedVersionId,
      section: newItem.section,
      itemKey: newItem.itemKey.trim(),
      questionText: newItem.questionText.trim(),
      responseType: newItem.responseType,
      photoRequired: newItem.photoRequired,
      sortOrder,
    };

    setItems((prev) => [...prev, created]);
    setNewItem({
      section: 'promotion_visibility',
      itemKey: '',
      questionText: '',
      responseType: 'yes_no',
      photoRequired: false,
    });
    showToast(tx('Questionnaire item added successfully.', 'የመጠይቅ ንጥል በተሳካ ሁኔታ ተጨመረ።'), 'success');
  };

  const togglePhotoRequired = (itemId) => {
    if (isVersionLocked) {
      showToast(tx('Approved versions cannot be edited.', 'የፀደቁ ስሪቶች ሊሻሻሉ አይችሉም።'), 'warning');
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              photoRequired: !item.photoRequired,
            }
          : item
      )
    );
  };

  return (
    <main className={styles.page}>
      <section className={`tibeb-border ${styles.hero}`}>
        <div className={styles.heroBody}>
          <p className={styles.kicker}>{tx('Project Manager Controls', 'የፕሮጀክት አስተዳዳሪ ቁጥጥር')}</p>
          <h1>{tx('Questionnaire Manager', 'የመጠይቅ አስተዳዳሪ')}</h1>
          <p>
            {tx(
              'Create, edit, version, approve, and activate audit questionnaire structures for field execution.',
              'የኦዲት መጠይቆችን ለመስክ እንቅስቃሴ ማቅረብ ፣ ማሻሻል ፣ ስሪት ማስተዳደር ፣ ማፅደቅ እና ንቁ ማድረግ ይችላሉ።'
            )}
          </p>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>{tx('Questionnaire Versions', 'የመጠይቅ ስሪቶች')}</h2>
          <Button size="sm" onClick={createVersion}>
            {tx('Create New Version', 'አዲስ ስሪት ፍጠር')}
          </Button>
        </div>

        <div className={styles.versionGrid}>
          {versions.map((version) => (
            <article key={version.id} className={styles.versionCard}>
              <h3>{version.title}</h3>
              <p>
                {tx('Version', 'ስሪት')}: {version.versionNumber}
              </p>
              <p>
                {tx('Approved', 'ፀድቋል')}: {version.approvedAt ? tx('Yes', 'አዎ') : tx('No', 'አይ')}
              </p>
              <div className={styles.versionActions}>
                <Button
                  size="sm"
                  variant={selectedVersionId === version.id ? 'primary' : 'ghost'}
                  onClick={() => setSelectedVersionId(version.id)}
                >
                  {tx('Open', 'ክፈት')}
                </Button>
                {!version.isActive && (
                  <Button size="sm" variant="ghost" onClick={() => activateVersion(version.id)}>
                    {tx('Set Active', 'ንቁ አድርግ')}
                  </Button>
                )}
                {version.isActive && (
                  <Button size="sm" variant="danger" onClick={() => deactivateVersion(version.id)}>
                    {tx('Deactivate', 'ንቁነት አጥፋ')}
                  </Button>
                )}
              </div>
              {version.isActive && <span className="status-badge status-badge--compliant">{tx('Active', 'ንቁ')}</span>}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>
            {tx('Edit Version', 'ስሪት አርትዕ')}: {selectedVersion?.title}
          </h2>
          <Button size="sm" onClick={submitForApproval} disabled={isVersionLocked}>
            {tx('Submit for Client Approval', 'ለደንበኛ ማፅደቅ ላክ')}
          </Button>
        </div>

        {isVersionLocked && (
          <p className={styles.lockedNotice}>
            {tx(
              'This approved version is read-only. Create a new version for edits.',
              'ይህ የፀደቀ ስሪት ለንባብ ብቻ ነው። ለማሻሻያ አዲስ ስሪት ይፍጠሩ።'
            )}
          </p>
        )}

        <div className={styles.formGrid}>
          <Dropdown
            label={tx('Section', 'ክፍል')}
            value={newItem.section}
            onChange={(value) => setNewItem((prev) => ({ ...prev, section: value }))}
            options={sectionOptions}
            disabled={isVersionLocked}
          />

          <label>
            <span>{tx('Item Key', 'የንጥል ቁልፍ')}</span>
            <input
              value={newItem.itemKey}
              onChange={(event) => setNewItem((prev) => ({ ...prev, itemKey: event.target.value }))}
              placeholder={tx('e.g. promoter_present', 'ለምሳሌ promoter_present')}
              disabled={isVersionLocked}
            />
          </label>

          <label>
            <span>{tx('Question Text', 'የጥያቄ ጽሑፍ')}</span>
            <input
              value={newItem.questionText}
              onChange={(event) =>
                setNewItem((prev) => ({
                  ...prev,
                  questionText: event.target.value,
                }))
              }
              placeholder={tx('Enter field question', 'የመስክ ጥያቄውን ያስገቡ')}
              disabled={isVersionLocked}
            />
          </label>

          <Dropdown
            label={tx('Response Type', 'የመልስ አይነት')}
            value={newItem.responseType}
            onChange={(value) => setNewItem((prev) => ({ ...prev, responseType: value }))}
            options={responseTypeOptions}
            disabled={isVersionLocked}
          />

          <label className={styles.toggleField}>
            <input
              type="checkbox"
              checked={newItem.photoRequired}
              onChange={(event) =>
                setNewItem((prev) => ({
                  ...prev,
                  photoRequired: event.target.checked,
                }))
              }
              disabled={isVersionLocked}
            />
            <span>{tx('Photo required', 'ፎቶ ያስፈልጋል')}</span>
          </label>

          <Button size="sm" onClick={addItem} disabled={isVersionLocked}>
            {tx('Add Item', 'ንጥል ጨምር')}
          </Button>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{tx('Section', 'ክፍል')}</th>
                <th>{tx('Item Key', 'ቁልፍ')}</th>
                <th>{tx('Question', 'ጥያቄ')}</th>
                <th>{tx('Type', 'አይነት')}</th>
                <th>{tx('Photo Rule', 'የፎቶ ህግ')}</th>
              </tr>
            </thead>
            <tbody>
              {versionItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.sortOrder}</td>
                  <td>{formatQuestionSection(item.section, tx)}</td>
                  <td>{item.itemKey}</td>
                  <td>{item.questionText}</td>
                  <td>{formatResponseType(item.responseType, tx)}</td>
                  <td>
                    <button
                      className={styles.inlineButton}
                      type="button"
                      onClick={() => togglePhotoRequired(item.id)}
                    >
                      {item.photoRequired ? tx('Required', 'ግዴታ') : tx('Optional', 'አማራጭ')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default QuestionnaireManager;
