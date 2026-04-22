import clsx from 'clsx';

import type { PasswordRule } from '../types/Password';

export function PasswordRuleList({ rules }: { rules: PasswordRule[] }) {
    return (
        <ul
            aria-label="Password requirements"
            className="text-ui-600 grid gap-1.5 text-sm"
        >
            {rules.map((rule) => (
                <li className="flex items-start gap-2" key={rule.label}>
                    <span
                        aria-hidden="true"
                        className={clsx(
                            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] leading-none ring-1',
                            rule.met
                                ? 'bg-green-600 text-white ring-green-600'
                                : 'bg-ui-0 ring-ui-300 text-transparent'
                        )}
                    >
                        {'\u2713'}
                    </span>
                    <span className={clsx(rule.met && 'text-ui-900')}>
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
