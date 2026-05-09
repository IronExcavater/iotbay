import { useState } from 'react';
import {
    FaArrowUpFromBracket,
    FaImage,
    FaLink,
    FaTrashCan,
} from 'react-icons/fa6';

import type {
    ProductFieldErrors,
    ProductFormValues,
} from '@features/products/form';
import {
    PRODUCT_TYPE_OPTIONS,
    normalizeProductType,
    type ProductType,
} from '@features/products/types';
import {
    compressImageToDataUrl,
    isSupportedImage,
} from '@shared/services/media';
import { Button } from '@shared/ui/form/Button';
import { Field } from '@shared/ui/form/Field';
import { Input } from '@shared/ui/form/Input';
import { MenuSelect } from '@shared/ui/form/MenuSelect';
import { MoneyField } from '@shared/ui/form/MoneyField';
import { OverlayDialog } from '@shared/ui/overlay/OverlayDialog';

interface ProductFormDialogProps {
    codeInput: {
        handleChange: React.ChangeEventHandler<HTMLInputElement>;
        inputRef: React.Ref<HTMLInputElement>;
    };
    fieldErrors: ProductFieldErrors;
    formTitle: string;
    isOpen: boolean;
    isSubmitting: boolean;
    nameInput: {
        handleChange: React.ChangeEventHandler<HTMLInputElement>;
        inputRef: React.Ref<HTMLInputElement>;
    };
    onClose: () => void;
    onMediaUrlsChange: (value: string[]) => void;
    onStockChange: (value: string) => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onTypeChange: (value: ProductType) => void;
    priceInput: {
        handleChange: React.ChangeEventHandler<HTMLInputElement>;
        inputRef: React.Ref<HTMLInputElement>;
    };
    submitLabel: string;
    values: ProductFormValues;
}

export function ProductFormDialog({
    codeInput,
    fieldErrors,
    formTitle,
    isOpen,
    isSubmitting,
    nameInput,
    onClose,
    onMediaUrlsChange,
    onStockChange,
    onSubmit,
    onTypeChange,
    priceInput,
    submitLabel,
    values,
}: ProductFormDialogProps) {
    if (!isOpen) {
        return null;
    }

    function updateImage(index: number, value: string) {
        onMediaUrlsChange(
            values.mediaUrls.map((image, currentIndex) =>
                currentIndex === index ? value : image
            )
        );
    }

    async function replaceImage(index: number, file: File | null | undefined) {
        if (!file || !isSupportedImage(file)) return;
        updateImage(index, await compressImageToDataUrl(file, 1200, 0.82));
    }

    function removeImage(index: number) {
        onMediaUrlsChange(
            values.mediaUrls.filter((_, currentIndex) => currentIndex !== index)
        );
    }

    function addImage(value: string) {
        if (values.mediaUrls.length >= 6) return;
        onMediaUrlsChange([...values.mediaUrls, value]);
    }

    async function addFiles(files: FileList | null) {
        if (!files) return;
        const selectedFiles = Array.from(files)
            .filter(isSupportedImage)
            .slice(0, 6 - values.mediaUrls.length);
        if (selectedFiles.length === 0) return;
        const urls = await Promise.all(
            selectedFiles.map((file) =>
                compressImageToDataUrl(file, 1200, 0.82)
            )
        );
        onMediaUrlsChange([...values.mediaUrls, ...urls].slice(0, 6));
    }

    return (
        <OverlayDialog onClose={onClose} title={formTitle}>
            <form className="grid gap-4" onSubmit={onSubmit}>
                <Field error={fieldErrors.name} label="Name" required>
                    <Input
                        hasError={Boolean(fieldErrors.name)}
                        onChange={nameInput.handleChange}
                        placeholder="Smart Light Bulb"
                        ref={nameInput.inputRef}
                        value={values.name}
                    />
                </Field>

                <Field error={fieldErrors.code} label="Code" required>
                    <Input
                        hasError={Boolean(fieldErrors.code)}
                        onChange={codeInput.handleChange}
                        placeholder="SKU-001"
                        ref={codeInput.inputRef}
                        value={values.code}
                    />
                </Field>

                <MoneyField
                    error={fieldErrors.price}
                    hint={
                        fieldErrors.price
                            ? undefined
                            : 'Enter Australian dollars'
                    }
                    inputRef={priceInput.inputRef}
                    label="Price"
                    onChange={priceInput.handleChange}
                    required
                    value={values.price}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    <MenuSelect
                        error={fieldErrors.type}
                        label="Device type"
                        onChange={(value) => {
                            onTypeChange(normalizeProductType(value));
                        }}
                        options={PRODUCT_TYPE_OPTIONS.map((option) => ({
                            ...option,
                            description: `IoT ${option.label.toLowerCase()} device`,
                        }))}
                        required
                        value={values.type}
                    />

                    <Field error={fieldErrors.stock} label="Stock" required>
                        <Input
                            hasError={Boolean(fieldErrors.stock)}
                            inputMode="numeric"
                            onChange={(event) =>
                                onStockChange(event.target.value)
                            }
                            placeholder="0"
                            value={values.stock}
                        />
                    </Field>
                </div>

                <ProductImagesEditor
                    images={values.mediaUrls}
                    onAddFile={(files) => {
                        void addFiles(files);
                    }}
                    onAddUrl={addImage}
                    onRemove={removeImage}
                    onReplace={(index, file) => {
                        void replaceImage(index, file);
                    }}
                    onUpdate={updateImage}
                />

                <div className="grid gap-3 pt-2">
                    <Button
                        disabled={isSubmitting}
                        loading={isSubmitting}
                        type="submit"
                        variant="primary"
                    >
                        {submitLabel}
                    </Button>
                </div>
            </form>
        </OverlayDialog>
    );
}

function ProductImagesEditor({
    images,
    onAddFile,
    onAddUrl,
    onRemove,
    onReplace,
    onUpdate,
}: {
    images: string[];
    onAddFile: (files: FileList | null) => void;
    onAddUrl: (value: string) => void;
    onRemove: (index: number) => void;
    onReplace: (index: number, file: File | null | undefined) => void;
    onUpdate: (index: number, value: string) => void;
}) {
    const canAdd = images.length < 6;
    const [editingUrlIndex, setEditingUrlIndex] = useState<number | null>(null);

    return (
        <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-ui-700 text-sm font-medium">Images</span>
                <div className="flex flex-wrap gap-2">
                    <label
                        className={`ring-ui-300 hover:bg-ui-100 focus-within:ring-ui-900 relative inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium ring-1 transition-[background-color,box-shadow] focus-within:ring-2 ${
                            canAdd
                                ? 'text-ui-700 cursor-pointer'
                                : 'text-ui-400 cursor-not-allowed'
                        }`}
                    >
                        <FaArrowUpFromBracket
                            aria-hidden="true"
                            className="size-3.5"
                        />
                        Upload images
                        <input
                            accept="image/*"
                            className="sr-only"
                            disabled={!canAdd}
                            multiple
                            onChange={(event) => {
                                onAddFile(event.target.files);
                                event.target.value = '';
                            }}
                            type="file"
                        />
                    </label>
                    <Button
                        className="h-9 px-3"
                        disabled={!canAdd}
                        onClick={() => onAddUrl('')}
                        type="button"
                        variant="secondary"
                    >
                        <FaLink aria-hidden="true" className="size-3.5" />
                        Add URL
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {images.length === 0 && canAdd && (
                    <label className="border-ui-300 bg-ui-50 hover:bg-ui-100 focus-within:ring-ui-900 flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded border border-dashed p-4 text-center transition-[background-color,box-shadow] focus-within:ring-2">
                        <span className="bg-ui-0 text-ui-500 ring-ui-200 inline-flex size-10 items-center justify-center rounded-full ring-1">
                            <FaImage aria-hidden="true" className="size-4" />
                        </span>
                        <span className="grid gap-1">
                            <span className="text-ui-900 text-sm font-medium">
                                Upload product images
                            </span>
                            <span className="text-ui-500 text-xs">
                                Up to six images
                            </span>
                        </span>
                        <input
                            accept="image/*"
                            className="sr-only"
                            multiple
                            onChange={(event) => {
                                onAddFile(event.target.files);
                                event.target.value = '';
                            }}
                            type="file"
                        />
                    </label>
                )}
                {images.map((image, index) => (
                    <div
                        className="border-ui-200 bg-ui-0 overflow-hidden rounded border"
                        key={`${image}-${index}`}
                    >
                        <div className="bg-ui-100 flex aspect-video items-center justify-center overflow-hidden">
                            {image ? (
                                <img
                                    alt=""
                                    className="h-full w-full object-cover"
                                    src={image}
                                />
                            ) : (
                                <span className="text-ui-500 text-xs">
                                    Image
                                </span>
                            )}
                        </div>
                        <div className="grid gap-3 p-3">
                            {editingUrlIndex === index && (
                                <Input
                                    onChange={(event) =>
                                        onUpdate(index, event.target.value)
                                    }
                                    placeholder="https://example.com/product.jpg"
                                    value={image}
                                />
                            )}
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-ui-500 min-w-0 truncate text-xs">
                                    {image
                                        ? imageLabel(image)
                                        : 'No image selected'}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <button
                                        className="text-ui-600 hover:text-ui-900 focus-visible:ring-ui-900 rounded text-sm font-medium outline-none focus-visible:ring-2"
                                        onClick={() =>
                                            setEditingUrlIndex((current) =>
                                                current === index ? null : index
                                            )
                                        }
                                        type="button"
                                    >
                                        URL
                                    </button>
                                    <label className="text-ui-600 hover:text-ui-900 focus-within:ring-ui-900 relative inline-flex cursor-pointer items-center rounded text-sm font-medium outline-none focus-within:ring-2">
                                        Replace
                                        <input
                                            accept="image/*"
                                            className="sr-only"
                                            onChange={(event) => {
                                                onReplace(
                                                    index,
                                                    event.target.files?.[0]
                                                );
                                                event.target.value = '';
                                            }}
                                            type="file"
                                        />
                                    </label>
                                </div>
                            </div>
                            <Button
                                className="text-ui-600 justify-self-start px-0 hover:bg-transparent hover:text-red-700"
                                onClick={() => onRemove(index)}
                                type="button"
                                variant="ghost"
                            >
                                <FaTrashCan
                                    aria-hidden="true"
                                    className="size-3.5"
                                />
                                Remove
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function imageLabel(value: string) {
    if (value.startsWith('data:')) return 'Uploaded image';
    if (value.startsWith('/api/media/')) return 'Saved image';
    return value;
}
