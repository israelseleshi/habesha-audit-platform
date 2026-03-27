import styles from './Dropdown.module.css';

function Dropdown({
  label,
  value,
  onChange,
  options,
  className = '',
  disabled = false,
  id,
  name,
  ariaLabel,
}) {
  return (
    <label className={`${styles.field} ${className}`.trim()}>
      {label && <span>{label}</span>}
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={ariaLabel || label}
      >
        {options.map((option) => (
          <option key={`${name || id || 'opt'}-${option.value}`} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default Dropdown;
