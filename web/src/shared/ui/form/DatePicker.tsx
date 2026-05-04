import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
    FaCalendarDays,
    FaChevronLeft,
    FaChevronRight,
    FaXmark,
} from 'react-icons/fa6';

import { Button } from '@shared/ui/form/Button';
import { AnchoredPopover } from '@shared/ui/overlay/AnchoredPopover';

interface DatePickerProps {
    ariaLabel: string;
    className?: string;
    onChange: (value: string) => void;
    placeholder: string;
    value: string;
}

export function DatePicker({
    ariaLabel,
    className,
    onChange,
    placeholder,
    value,
}: DatePickerProps) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() =>
        monthStart(value ? parseDate(value) : new Date())
    );
    const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

    function selectDate(date: Date) {
        onChange(toDateValue(date));
        setOpen(false);
    }

    return (
        <div
            className={clsx('relative w-full sm:w-36', className)}
            ref={rootRef}
        >
            <button
                aria-label={ariaLabel}
                className="bg-ui-0 text-ui-700 ring-ui-300 hover:bg-ui-50 focus-visible:ring-ui-900 flex h-10 w-full items-center justify-between gap-3 rounded px-3 text-sm ring-1 transition-[background-color,box-shadow,color] outline-none focus-visible:ring-2"
                onClick={() => setOpen((current) => !current)}
                type="button"
            >
                <span className={value ? 'text-ui-900' : 'text-ui-500'}>
                    {value || placeholder}
                </span>
                <FaCalendarDays
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                />
            </button>

            <AnchoredPopover
                align="right"
                anchorRef={rootRef}
                className="w-72 p-3"
                onClose={() => setOpen(false)}
                open={open}
            >
                <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            aria-label="Previous month"
                            className="size-8 rounded-full p-0"
                            onClick={() =>
                                setVisibleMonth((current) =>
                                    addMonths(current, -1)
                                )
                            }
                            type="button"
                            variant="ghost"
                        >
                            <FaChevronLeft
                                aria-hidden="true"
                                className="size-3"
                            />
                        </Button>
                        <span className="text-ui-900 text-sm font-semibold">
                            {visibleMonth.toLocaleDateString(undefined, {
                                month: 'long',
                                year: 'numeric',
                            })}
                        </span>
                        <Button
                            aria-label="Next month"
                            className="size-8 rounded-full p-0"
                            onClick={() =>
                                setVisibleMonth((current) =>
                                    addMonths(current, 1)
                                )
                            }
                            type="button"
                            variant="ghost"
                        >
                            <FaChevronRight
                                aria-hidden="true"
                                className="size-3"
                            />
                        </Button>
                    </div>

                    <div className="text-ui-500 grid grid-cols-7 gap-1 text-center text-xs">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                            <span key={day}>{day}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days.map((date) => {
                            const dateValue = toDateValue(date);
                            const selected = dateValue === value;
                            const inMonth =
                                date.getMonth() === visibleMonth.getMonth();

                            return (
                                <button
                                    className={`focus-visible:ring-ui-900 flex size-8 items-center justify-center rounded text-sm outline-none focus-visible:ring-2 ${
                                        selected
                                            ? 'bg-ui-950 text-ui-0'
                                            : inMonth
                                              ? 'text-ui-800 hover:bg-ui-100'
                                              : 'text-ui-300 hover:bg-ui-50'
                                    }`}
                                    key={dateValue}
                                    onClick={() => selectDate(date)}
                                    type="button"
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex justify-between gap-2">
                        <Button
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                                onChange('');
                                setOpen(false);
                            }}
                            type="button"
                            variant="ghost"
                        >
                            <FaXmark aria-hidden="true" className="size-3" />
                            Clear
                        </Button>
                        <Button
                            className="h-7 px-2 text-xs"
                            onClick={() => selectDate(new Date())}
                            type="button"
                            variant="secondary"
                        >
                            Today
                        </Button>
                    </div>
                </div>
            </AnchoredPopover>
        </div>
    );
}

function parseDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function monthStart(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function calendarDays(month: Date) {
    const start = new Date(month);
    start.setDate(1 - start.getDay());

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}

function toDateValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
