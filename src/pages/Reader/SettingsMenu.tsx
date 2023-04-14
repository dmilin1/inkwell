import { useContext, useState } from 'react';
import { Settings, SettingsContext } from '../../contexts/SettingsContext';
import { EbookContext } from '../../contexts/EbookContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faListUl } from '@fortawesome/free-solid-svg-icons'
import { KeyboardWrapper } from '../../contexts/KeyboardContext';
import { ChapterContext } from '../../contexts/ChapterContext';
import { StatusBarMode } from '../../utils/StatusBar';

interface SettingType {
  id: keyof Settings,
  name: string,
  type: string,
  bounds?: [number?, number?],
  list?: {
    name: string,
    value: string | number,
  }[]
}

const textSettings: SettingType[] = [{
  id: 'fontFamily',
  name: 'Font Name',
  type: 'list',
  list: [{
    name: 'Roboto',
    value: 'Roboto',
  }, {
    name: 'Open Sans',
    value: 'OpenSans',
  }, {
    name: 'Times New Roman',
    value: 'Times New Roman',
  }, {
    name: 'Arial',
    value: 'Arial',
  }, {
    name: 'Verdana',
    value: 'Verdana',
  }, {
    name: 'Tahoma',
    value: 'Tahoma',
  }, {
    name: 'Trebuchet MS',
    value: 'Trebuchet MS',
  }, {
    name: 'Georgia',
    value: 'Georgia',
  }, {
    name: 'Courier New',
    value: 'Courier New',
  }]
}, {
  id: 'fontSize',
  name: 'Font Size (px)',
  type: 'number',
  bounds: [1, 100],
}, {
  id: 'fontWeight',
  name: 'Font Weight',
  type: 'list',
  list: [{
    name: 'Thin',
    value: '100',
  }, {
    name: 'Light',
    value: '300',
  }, {
    name: 'Regular',
    value: '400',
  }, {
    name: 'Medium',
    value: '500',
  }, {
    name: 'Semi-Bold',
    value: '600',
  }, {
    name: 'Bold',
    value: '700',
  }, {
    name: 'Extra Bold',
    value: '800',
  }, {
    name: 'Black',
    value: '900',
  }]
}];

const layoutSettings: SettingType[] = [{
  id: 'lineSpacing',
  name: 'Line Spacing (px)',
  type: 'number',
  bounds: [0.5, 5],
}, {
  id: 'wordSpacing',
  name: 'Word Spacing',
  type: 'number',
  bounds: [0, 25],
}, {
  id: 'letterSpacing',
  name: 'Letter Spacing',
  type: 'number',
  bounds: [0, 25],
}, {
  id: 'paragraphSpacing',
  name: 'Paragraph Spacing (px)',
  type: 'number',
  bounds: [0, 200],
}, {
  id: 'paragraphIndentation',
  name: 'Paragraph Indentation',
  type: 'number',
  bounds: [0, 10],
}, {
  id: 'verticalMargins',
  name: 'Vertical Margins (px)',
  type: 'number',
  bounds: [0, 150],
}, {
  id: 'horizontalMargins',
  name: 'Horizontal Margins (px)',
  type: 'number',
  bounds: [0, 150],
}, {
  id: 'statusBar',
  name: 'Status Bar (Clock)',
  type: 'list',
  list: [{
    name: 'Light Mode',
    value: StatusBarMode.Light,
  }, {
    name: 'Dark Mode',
    value: StatusBarMode.Dark,
  }, {
    name: 'Hidden',
    value: StatusBarMode.Hidden,
  }]
}];

const themeSettings: SettingType[] = [{
  id: 'fontColor',
  name: 'Font Color',
  type: 'color',
}, {
  id: 'backgroundColor',
  name: 'Background Color',
  type: 'color',
}]

const settingsCategories = [{
  name: 'Font',
  settings: textSettings
}, {
  name: 'Layout',
  settings: layoutSettings
}, {
  name: 'Theme',
  settings: themeSettings
}]

export default function SettingsMenu() {
  const { settings, changeSettings, isSettingsOpen, setIsSettingsOpen } = useContext(SettingsContext);
  const { metadata, changeEbook } = useContext(EbookContext);
  const { setChapterSelectOpen } = useContext(ChapterContext);

  const [categoryIndex, setCategoryIndex] = useState(0);

  return (
    <div
      className='w-full h-full absolute z-[20] transition-opacity justify-between pointer-events-none select-none'
      style={{
        visibility: isSettingsOpen ? 'visible': 'hidden',
        opacity: isSettingsOpen ? '1': '0',
      }}
    >
      <div className='pointer-events-auto bg-bg-primary/95 flex-row padding-safe-area-top justify-between'>
        <div
          className='w-16 text-center justify-center cursor-pointer'
          onClick={() => {
            changeEbook(undefined);
            setIsSettingsOpen(false);
          }}
        >
          <FontAwesomeIcon className='text-2xl' icon={faChevronLeft} />
        </div>
        <div className='h-14 space-b text-center text-lg justify-center'>{metadata?.title}</div>
        <div
          className='w-16 text-center justify-center cursor-pointer'
          onClick={() => {
            setChapterSelectOpen(true);
          }}
        >
          <FontAwesomeIcon className='text-2xl' icon={faListUl} />
        </div>
      </div>
      <KeyboardWrapper>
        <div className='pointer-events-auto bg-bg-primary/95 padding-safe-area-bottom'>
          <div className='flex-row justify-between'>
            <div
              className='w-16 text-center justify-center cursor-pointer'
              onClick={() => setCategoryIndex(categoryIndex > 0 ? categoryIndex - 1 : settingsCategories.length - 1)}
            >
              <FontAwesomeIcon className='text-2xl' icon={faChevronLeft} />
            </div>
            <div className='h-14 space-b text-center text-lg justify-center'>{settingsCategories[categoryIndex].name}</div>
            <div
              className='w-16 text-center justify-center cursor-pointer'
              onClick={() => setCategoryIndex(categoryIndex < settingsCategories.length - 1 ? categoryIndex + 1 : 0)}
            >
              <FontAwesomeIcon className='text-2xl' icon={faChevronRight} />
            </div>
          </div>
          <div className='overflow-auto max-h-[33vh] h-[33vh] md:h-fit'>
            <div className='grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
              {settingsCategories[categoryIndex].settings.map(setting =>
                <div key={setting.id} className='h-fit flex-row items-center justify-between px-4 py-2 md:py-4'>
                  <div className='text-lg'>{setting.name}</div>
                  {setting.type === 'number' &&
                    <input
                      className='text-center w-[35%] rounded-lg bg-bg-secondary h-9'
                      defaultValue={settings[setting.id]}
                      onBlur={e => {
                        const low = setting.bounds?.[0] ?? Number.MIN_SAFE_INTEGER;
                        const high = setting.bounds?.[1] ?? Number.MAX_SAFE_INTEGER;
                        const num = Math.min(high, Math.max(low, Number(e.target.value)));
                        changeSettings({ [setting.id]: num });
                        e.target.value = String(num);
                      }}
                      type='number'
                      inputMode='decimal'
                    />
                  }
                  {setting.type === 'list' &&
                    <select
                      className='text-center pl-2 min-w-[35%] h-9 rounded-lg bg-bg-secondary'
                      value={settings[setting.id]}
                      onChange={e => changeSettings({ [setting.id]: e.target.value })}
                    >
                      {setting.list?.map(option =>
                        <option
                          key={option.value}
                          value={option.value}
                          style={setting.id === 'fontFamily' ? {
                            fontFamily: String(option.value)
                          } : undefined}
                        >
                          {option.name}
                        </option>
                      )}
                    </select>
                  }
                  {setting.type === 'color' &&
                    <input
                      className='w-24 h-9 bg-bg-secondary'
                      defaultValue={settings[setting.id]}
                      onBlur={e => {
                        changeSettings({ [setting.id]: e.target.value });
                      }}
                      type='color'
                    />
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </KeyboardWrapper>
    </div>
  )
}