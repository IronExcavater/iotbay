import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ProductRowProps {
    code?: string;
    imageUrl: string;
    middle?: ReactNode;
    name: string;
    onImageClick?: () => void;
    productId: string;
    right?: ReactNode;
}

export function ProductRow({
    code,
    imageUrl,
    middle,
    name,
    onImageClick,
    productId,
    right,
}: ProductRowProps) {
    const thumb = imageUrl || '/iotbay_icon_themed.svg';
    const hasRight = right !== undefined;

    return (
        <div
            className={`grid items-stretch ${hasRight ? 'grid-cols-[5rem_minmax(0,1fr)_auto]' : 'grid-cols-[5rem_minmax(0,1fr)]'}`}
        >
            {onImageClick ? (
                <button
                    aria-label={`View ${name}`}
                    className="focus-visible:ring-ui-900 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset"
                    onClick={onImageClick}
                    type="button"
                >
                    <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={thumb}
                    />
                </button>
            ) : (
                <Link
                    className="focus-visible:ring-ui-900 block overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset"
                    to={`/products/${productId}`}
                >
                    <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={thumb}
                    />
                </Link>
            )}

            <div className="grid min-w-0 content-start gap-0.5 px-4 py-3.5">
                {code && (
                    <span className="text-ui-500 font-mono text-xs">
                        {code}
                    </span>
                )}
                <Link
                    className="text-ui-900 w-fit font-medium underline-offset-4 outline-none hover:underline focus-visible:underline"
                    to={`/products/${productId}`}
                >
                    {name}
                </Link>
                {middle}
            </div>

            {hasRight && (
                <div className="flex items-center gap-2 px-4 py-3.5">
                    {right}
                </div>
            )}
        </div>
    );
}
