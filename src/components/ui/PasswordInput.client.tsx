'use client'

import React, { useState } from 'react'

import { cx } from './layout'

// A password control with «Показати / Сховати» inside the frame (SYSTEM.md §4.4). Put it inside `<Field variant="box">`.
export function PasswordInput({ className, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [shown, setShown] = useState(false)
  return (
    <div className="ui-pw">
      <input {...rest} type={shown ? 'text' : 'password'} className={cx('ui-control', className)} />
      <button type="button" className="ui-pw-btn" aria-pressed={shown} aria-label={shown ? 'Сховати пароль' : 'Показати пароль'} onClick={() => setShown(!shown)}>
        {shown ? 'Сховати' : 'Показати'}
      </button>
    </div>
  )
}
