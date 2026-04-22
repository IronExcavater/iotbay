import clsx from 'clsx';
import { FaChevronDown } from 'react-icons/fa6';

export function DropdownChevron({
    isOpen,
    className,
}: {
    className?: string;
    isOpen?: boolean;
}) {
    return (
        <FaChevronDown
            aria-hidden="true"
            className={clsx(
                'text-ui-500 size-[0.65rem] transition-transform duration-200 ease-out',
                isOpen && 'rotate-180',
                className
            )}
        />
    );
}
