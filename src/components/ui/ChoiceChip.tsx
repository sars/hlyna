import React from 'react'

// One option of several, as a Chip md that is a real checkbox. Wrap a set of them in a `fieldset` with a `legend`.
export function ChoiceChip({ label, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }) {
  return (
    <label className="ui-cc">
      <input {...rest} type="checkbox" />
      <span>{label}</span>
    </label>
  )
}
