import { HTMLElementContainer } from './HTMLElementContainer.js';
import SettingsMenu from './SettingsMenu.js';
import ChapterSelect from './ChapterSelect.js';
import { StatusBarTint } from '../../components/StatusBar/StatusBarTint.js';



export default function Reader() {

  return (
    <div>
      <StatusBarTint/>
      <ChapterSelect/>
      <SettingsMenu/>
      <HTMLElementContainer/>
    </div>
  )
}