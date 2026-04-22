import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

const brandMarkStyle = {
    backgroundColor: 'currentColor',
    WebkitMask: 'url("/iotbay_icon.svg") center / contain no-repeat',
    mask: 'url("/iotbay_icon.svg") center / contain no-repeat',
} satisfies CSSProperties;

export function BrandLink() {
    return (
        <Link
            className="group text-ui-950 relative -mx-2 inline-flex w-fit min-w-0 items-center gap-3 justify-self-start rounded px-2 py-1 text-base font-semibold tracking-[0.2em] uppercase transition-transform duration-200 ease-out outline-none hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:outline-none"
            to="/"
        >
            <span
                aria-hidden="true"
                className="inline-block size-8 shrink-0"
                style={brandMarkStyle}
            />
            <span className="truncate transition-[letter-spacing,transform] duration-200 ease-out group-hover:tracking-[0.24em] group-focus-visible:-translate-y-0.5 group-focus-visible:tracking-[0.24em]">
                IoTBay
            </span>
            <span
                aria-hidden="true"
                className="absolute right-3 bottom-0 left-12 h-0.5 origin-left scale-x-0 rounded-full bg-current transition-transform duration-200 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
            />
        </Link>
    );
}
