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
    // Avoid floating point drift (0.1 + 0.2) and keep within bounds.
    const set = (next: number) => onChange(Math.min(max, Math.max(min, Math.round(next / step) * step)));
    const decimals = (String(step).split('.')[1] ?? '').length;
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
                        size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3 text-[0.9rem]'
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
    return (
        <div className='flex-row items-center justify-between gap-4 min-h-[3rem]'>
            <div className='text-[0.95rem] shrink-0'>{label}</div>
            {control}
        </div>
    );
}
