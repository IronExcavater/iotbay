import type {
    ProductFieldErrors,
    ProductFormValues,
} from '@features/products/form';
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
    onSubmit,
    priceInput,
    submitLabel,
    values,
}: ProductFormDialogProps) {
    if (!isOpen) {
        return null;
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
