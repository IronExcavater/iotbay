import clsx from 'clsx';

import type { PasswordRule } from '../types/Password';

export function PasswordRuleList({ rules }: { rules: PasswordRule[] }) {
    return (
        <ul
            aria-label="Password requirements"
            className="grid gap-1.5 text-sm text-slate-600"
        >
            {rules.map((rule) => (
                <li className="flex items-start gap-2" key={rule.label}>
                    <span
                        aria-hidden="true"
                        className={clsx(
                            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none',
                            rule.met
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'bg-surface-0 border-slate-300 text-transparent'
                        )}
                    >
                        {'\u2713'}
                    </span>
                    <span className={clsx(rule.met && 'text-slate-900')}>
                        <span className="sr-only">
                            {rule.met ? 'Met: ' : 'Needed: '}
                        </span>
                        {rule.label}
                    </span>
                </li>
            ))}
        </ul>
    );
}
