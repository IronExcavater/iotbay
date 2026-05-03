import type {
    ProductFieldErrors,
    ProductFormValues,
} from '@features/products/form';
import { fileToDataUrl, isSupportedImage } from '@shared/services/media';
import { Button } from '@shared/ui/form/Button';
import { Field } from '@shared/ui/form/Field';
import { Input } from '@shared/ui/form/Input';
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
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
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
    onSubmit,
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
        updateImage(index, await fileToDataUrl(file));
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
        const urls = await Promise.all(selectedFiles.map(fileToDataUrl));
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

    return (
        <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-ui-700 text-sm font-medium">Images</span>
                <div className="flex flex-wrap gap-2">
                    <label className="text-ui-700 ring-ui-300 hover:bg-ui-100 relative inline-flex h-9 cursor-pointer items-center rounded px-3 text-sm font-medium ring-1">
                        Upload
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
                        Add URL
                    </Button>
                </div>
            </div>

            <div className="grid gap-3">
                {images.length === 0 && (
                    <p className="text-ui-500 text-sm">
                        Add up to six product images.
                    </p>
                )}
                {images.map((image, index) => (
                    <div
                        className="grid gap-3 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center"
                        key={`${image}-${index}`}
                    >
                        <div className="bg-ui-100 border-ui-200 flex aspect-square items-center justify-center overflow-hidden rounded border">
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
                        <Input
                            onChange={(event) =>
                                onUpdate(index, event.target.value)
                            }
                            placeholder="https://example.com/product.jpg"
                            value={image}
                        />
                        <div className="flex gap-3">
                            <label className="text-ui-600 hover:text-ui-900 relative inline-flex h-9 cursor-pointer items-center text-sm font-medium">
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
                            <Button
                                className="text-ui-600 hover:text-ui-900 h-9 px-0 hover:bg-transparent"
                                onClick={() => onRemove(index)}
                                type="button"
                                variant="ghost"
                            >
                                Remove
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
