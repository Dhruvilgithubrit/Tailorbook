export default function Input({
  label,
  error,
  hint,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  autoComplete = 'off',
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-[#374151]">
          {label}
          {required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className={`w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] transition-colors focus:outline-none focus:border-[#4F46E5] disabled:bg-[#F8F7F4] disabled:text-[#9CA3AF] disabled:cursor-not-allowed ${
          error ? 'border-[#DC2626]' : 'border-[#E5E3DE]'
        }`}
        {...props}
      />
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
      {hint && !error && <p className="text-xs text-[#6B7280]">{hint}</p>}
    </div>
  )
}
