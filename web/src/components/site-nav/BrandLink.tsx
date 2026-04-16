import { Link } from 'react-router-dom';

export function BrandLink() {
    return (
        <Link
            className="group relative -mx-2 inline-flex w-fit min-w-0 items-center gap-3 justify-self-start rounded px-2 py-1 text-base font-semibold tracking-[0.2em] text-slate-950 uppercase transition-transform duration-200 ease-out outline-none hover:scale-[1.02] focus-visible:scale-[1.02] focus-visible:outline-none"
            to="/"
        >
            <img
                alt="IoTBay icon"
                className="h-8 w-auto shrink-0"
                loading="eager"
                src="/iotbay_icon_themed.svg"
            />
            <span className="truncate transition-[letter-spacing,transform] duration-200 ease-out group-hover:tracking-[0.24em] group-focus-visible:-translate-y-0.5 group-focus-visible:tracking-[0.24em]">
                IoTBay
            </span>
            <span
                aria-hidden="true"
                className="absolute right-3 bottom-0 left-12 h-0.5 origin-left scale-x-0 rounded-full bg-slate-900 transition-transform duration-200 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
            />
        </Link>
    );
}
