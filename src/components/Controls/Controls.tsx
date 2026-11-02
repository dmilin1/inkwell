import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

interface StepperProps {
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    format?: (value: number) => string,
    onChange: (value: number) => void,
}

/** A labelled −/value/+ control. */
export function Stepper({ label, value, min, max, step, format, onChange }: StepperProps) {
    // Snap to the step without floating point noise (0.1 + 0.2), within bounds.
    const decimals = (String(step).split('.')[1] ?? '').length;
    const set = (next: number) => onChange(Math.min(max, Math.max(min, +(Math.round(next / step) * step).toFixed(decimals))));
    const shown = format ? format(value) : value.toFixed(decimals);

    return (
        <div className='flex-row items-center justify-between min-h-[3rem]'>
            <div className='text-[0.95rem]'>{label}</div>
            <div className='flex-row items-center rounded-full bg-bg-tertiary'>
                <button
                    type='button'
                    aria-label={`Decrease ${label}`}
                    className='pressable w-11 h-10 flex items-center justify-center disabled:opacity-30'
                    disabled={value <= min}
                    onClick={() => set(value - step)}
                >
                    <FontAwesomeIcon icon={faMinus} className='text-sm' />
                </button>
                <div className='min-w-[3.5rem] text-center tabular-nums text-[0.95rem]'>{shown}</div>
                <button
                    type='button'
                    aria-label={`Increase ${label}`}
                    className='pressable w-11 h-10 flex items-center justify-center disabled:opacity-30'
                    disabled={value >= max}
                    onClick={() => set(value + step)}
                >
                    <FontAwesomeIcon icon={faPlus} className='text-sm' />
                </button>
            </div>
        </div>
    );
}

interface SegmentedProps<T extends string> {
    /** Shown to the left of the control. */
    label?: string,
    /** Accessible name when there's no visible label. */
    ariaLabel?: string,
    value: T,
    options: { value: T, name: string }[],
    onChange: (value: T) => void,
    size?: 'md' | 'sm',
}

/** A row of mutually exclusive options. */
export function Segmented<T extends string>({ label, ariaLabel, value, options, onChange, size = 'md' }: SegmentedProps<T>) {
    const control = (
        <div className='flex-row rounded-full bg-bg-tertiary p-[3px]' role='radiogroup' aria-label={label ?? ariaLabel}>
            {options.map(option =>
                <button
                    type='button'
                    role='radio'
                    aria-checked={option.value === value}
                    key={option.value}
                    className={`pressable flex-1 rounded-full whitespace-nowrap transition-colors ${
                        size === 'sm' ? 'h-7 px-2.5 text-xs' : `h-9 ${options.length >= 4 ? 'px-2' : 'px-3'} text-[0.9rem]`
                    } ${
                        option.value === value
                            ? 'bg-text-primary text-bg-primary font-semibold'
                            : 'text-text-secondary'
                    }`}
                    onClick={() => onChange(option.value)}
                >
                    {option.name}
                </button>
            )}
        </div>
    );
    if (!label) {
        return control;
    }
    // On narrow screens the control drops below its label rather than overflowing.
    return (
        <div className='flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 min-h-[3rem] py-1'>
            <div className='text-[0.95rem] shrink-0'>{label}</div>
            <div className='ml-auto max-w-full'>{control}</div>
        </div>
    );
}

interface ToggleProps {
    label: string,
    description?: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
}

/** A labelled on/off switch. */
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
    return (
        <button
            type='button'
            role='switch'
            aria-checked={checked}
            className='pressable flex flex-row items-center justify-between gap-4 min-h-[3rem] w-full text-left'
            onClick={() => onChange(!checked)}
        >
            <span className='flex flex-col'>
                <span className='text-[0.95rem]'>{label}</span>
                {description && <span className='text-xs text-text-secondary'>{description}</span>}
            </span>
            <span className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-bg-tertiary'}`}>
                <span
                    className='absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-text-primary shadow transition-transform'
                    style={{ transform: checked ? 'translateX(1.25rem)' : 'none' }}
                />
            </span>
        </button>
    );
}
