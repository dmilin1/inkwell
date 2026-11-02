import { useContext, useState } from 'react';
import { Settings, SettingsContext } from '../../contexts/SettingsContext';
import { EbookContext } from '../../contexts/EbookContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faListUl } from '@fortawesome/free-solid-svg-icons'
import { ChapterContext } from '../../contexts/ChapterContext';
import { StatusBarMode } from '../../utils/StatusBar';
import { FaderTransition } from '../../components/FaderTransition/FaderTransition';
import { useBackHandler } from '../../utils/BackButton';
import { Segmented, Stepper } from '../../components/Controls/Controls';
import { READER_FONTS, fontStack } from '../../resources/fonts/fonts';
import { READER_THEMES, matchingTheme } from '../../utils/Themes';

type Tab = 'text' | 'page' | 'theme';

const FONT_WEIGHTS: { [weight: number]: string } = {
  100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium',
  600: 'Semibold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black',
};

/** Spacing settings are stored as steps from "normal" (1). */
const formatOffset = (value: number) => value === 1 ? 'Normal' : `${value > 1 ? '+' : '−'}${Math.abs(value - 1)}`;

export default function SettingsMenu() {
  const { settings, changeSettings, isSettingsOpen, setIsSettingsOpen } = useContext(SettingsContext);
  const { metadata, closeEbook } = useContext(EbookContext);
  const { setChapterSelectOpen, chapters, chapterIndex } = useContext(ChapterContext);

  const [tab, setTab] = useState<Tab>('text');

  useBackHandler(isSettingsOpen, () => setIsSettingsOpen(false));

  const set = <K extends keyof Settings>(key: K) => (value: Settings[K]) => changeSettings({ [key]: value });
  const chapterTitle = chapterIndex !== undefined ? chapters?.index(chapterIndex)?.title : undefined;
  const percent = Math.round((metadata?.progress.percentComplete ?? 0) * 100);

  return (
    <div className='w-full h-full absolute z-30 pointer-events-none select-none'>
      <FaderTransition shouldShow={isSettingsOpen} speed={200} style={{
        width: '100%',
        height: '100%',
      }}>
        <div className='w-full h-full justify-between'>
          <div className='pointer-events-auto bg-bg-primary padding-safe-area-top shadow-[0_1px_0_rgba(244,241,234,0.08)]'>
            <div className='flex-row items-center h-14 px-1'>
              <button
                type='button'
                aria-label='Back to library'
                className='pressable w-12 h-12 flex items-center justify-center'
                onClick={() => {
                  setIsSettingsOpen(false);
                  closeEbook();
                }}
              >
                <FontAwesomeIcon className='text-xl' icon={faChevronLeft} />
              </button>
              <div className='flex-1 min-w-0 items-center px-2'>
                <div className='font-display text-[1.05rem] font-semibold truncate max-w-full'>{metadata?.title}</div>
                <div className='flex-row max-w-full text-xs text-text-secondary whitespace-nowrap'>
                  {chapterTitle && <span className='truncate'>{chapterTitle}</span>}
                  <span className='shrink-0 tabular-nums'>{chapterTitle ? '  ·  ' : ''}{percent}%</span>
                </div>
              </div>
              <button
                type='button'
                aria-label='Contents'
                className='pressable w-12 h-12 flex items-center justify-center'
                onClick={() => setChapterSelectOpen(true)}
              >
                <FontAwesomeIcon className='text-xl' icon={faListUl} />
              </button>
            </div>
            <div className='h-[2px] bg-line'>
              <div className='h-full bg-accent transition-[width]' style={{ width: `${percent}%` }}/>
            </div>
          </div>

          <div className='pointer-events-auto w-full max-w-xl self-center bg-bg-primary rounded-t-2xl padding-safe-area-bottom shadow-[0_-1px_0_rgba(244,241,234,0.08),0_-12px_32px_rgba(0,0,0,0.35)]'>
            <div className='px-4 pt-4 pb-2'>
              <Segmented<Tab>
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'text', name: 'Text' },
                  { value: 'page', name: 'Page' },
                  { value: 'theme', name: 'Theme' },
                ]}
              />
            </div>
            <div className='overflow-y-auto max-h-[40vh] px-5 pb-4'>
              {tab === 'text' && <>
                <div className='flex-row gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 py-3'>
                  {READER_FONTS.map(font =>
                    <button
                      type='button'
                      key={font.value}
                      aria-pressed={settings.fontFamily === font.value}
                      className={`pressable shrink-0 h-10 px-4 rounded-full text-[0.95rem] ${
                        settings.fontFamily === font.value
                          ? 'bg-text-primary text-bg-primary'
                          : 'bg-bg-tertiary'
                      }`}
                      style={{ fontFamily: fontStack(font.value) }}
                      onClick={() => changeSettings({ fontFamily: font.value })}
                    >
                      {font.name}
                    </button>
                  )}
                </div>
                <Stepper label='Size' value={settings.fontSize} min={10} max={40} step={1} onChange={set('fontSize')} />
                <Stepper
                  label='Weight'
                  value={Number(settings.fontWeight) || 400}
                  min={100}
                  max={900}
                  step={100}
                  format={weight => FONT_WEIGHTS[weight] ?? String(weight)}
                  onChange={weight => changeSettings({ fontWeight: String(weight) })}
                />
              </>}

              {tab === 'page' && <>
                <Segmented
                  label='Mode'
                  value={settings.readingMode}
                  onChange={set('readingMode')}
                  options={[
                    { value: 'scrolling', name: 'Scroll' },
                    { value: 'paginated', name: 'Pages' },
                  ]}
                />
                <Stepper
                  label='Line spacing'
                  value={settings.lineSpacing}
                  min={1}
                  max={2.5}
                  step={0.05}
                  format={value => `${+value.toFixed(2)}×`}
                  onChange={set('lineSpacing')}
                />
                <Stepper
                  label='Paragraph spacing'
                  value={settings.paragraphSpacing}
                  min={0}
                  max={40}
                  step={2}
                  onChange={set('paragraphSpacing')}
                />
                <Stepper
                  label='Indent'
                  value={settings.paragraphIndentation}
                  min={0}
                  max={4}
                  step={0.5}
                  onChange={set('paragraphIndentation')}
                />
                <Stepper label='Side margins' value={settings.horizontalMargins} min={0} max={96} step={4} onChange={set('horizontalMargins')} />
                <Stepper label='Top & bottom margins' value={settings.verticalMargins} min={0} max={96} step={4} onChange={set('verticalMargins')} />
                <Stepper label='Word spacing' value={settings.wordSpacing} min={0} max={9} step={1} format={formatOffset} onChange={set('wordSpacing')} />
                <Stepper label='Letter spacing' value={settings.letterSpacing} min={0} max={9} step={1} format={formatOffset} onChange={set('letterSpacing')} />
                <Segmented
                  label='Status bar'
                  value={settings.statusBar === StatusBarMode.Hidden ? 'hide' : 'show'}
                  onChange={value => changeSettings({ statusBar: value === 'hide' ? StatusBarMode.Hidden : StatusBarMode.Dark })}
                  options={[
                    { value: 'show', name: 'Show' },
                    { value: 'hide', name: 'Hide' },
                  ]}
                />
                {settings.readingMode === 'scrolling' &&
                  <Segmented
                    label='Scroll bar'
                    value={settings.scrollBar}
                    onChange={set('scrollBar')}
                    options={[
                      { value: 'visible', name: 'Show' },
                      { value: 'untouchable', name: 'While scrolling' },
                      { value: 'hidden', name: 'Hide' },
                    ]}
                  />
                }
              </>}

              {tab === 'theme' && <ThemeSettings />}
            </div>
          </div>
        </div>
      </FaderTransition>
    </div>
  )
}

function ThemeSettings() {
  const { settings, changeSettings } = useContext(SettingsContext);
  const current = matchingTheme(settings.fontColor, settings.backgroundColor);

  const colorInput = (label: string, key: 'fontColor' | 'backgroundColor') => (
    <label className='flex flex-row items-center justify-between min-h-[3rem] cursor-pointer'>
      <span className='text-[0.95rem]'>{label}</span>
      <input
        type='color'
        // Uncontrolled (re-created when the setting changes, e.g. via a preset)
        // so React doesn't reset the picker while it's open.
        key={settings[key]}
        className='w-14 h-9 rounded-lg bg-bg-tertiary cursor-pointer'
        defaultValue={settings[key]}
        // The native `change` event fires once the picker commits a color.
        ref={input => {
          if (input) {
            input.onchange = () => changeSettings({ [key]: input.value });
          }
        }}
      />
    </label>
  );

  return (
    <>
      <div className='grid grid-cols-5 gap-2 py-3'>
        {READER_THEMES.map(theme => {
          const selected = theme === current;
          return (
            <button
              type='button'
              key={theme.name}
              aria-pressed={selected}
              className='pressable flex flex-col items-center gap-1.5'
              onClick={() => changeSettings({ fontColor: theme.fontColor, backgroundColor: theme.backgroundColor })}
            >
              <span
                className={`w-full aspect-square max-w-[3.5rem] rounded-xl flex items-center justify-center text-lg ${
                  selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-primary' : 'ring-1 ring-line'
                }`}
                style={{ backgroundColor: theme.backgroundColor, color: theme.fontColor, fontFamily: fontStack('Literata') }}
              >
                Aa
              </span>
              <span className={`text-xs ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>{theme.name}</span>
            </button>
          );
        })}
      </div>
      <div className='eyebrow text-text-secondary pt-3'>Custom</div>
      {colorInput('Text', 'fontColor')}
      {colorInput('Background', 'backgroundColor')}
    </>
  );
}
