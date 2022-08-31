import lodashIsEqual from 'lodash/isEqual.js';
import { setBrowserAction } from './browser-action.js';

const DISABLED_ICON = 'images/icon_bw.png';
const REGULAR_ICON = 'images/icon.png';
const PAUSED_TEXT = '\u275A\u275A';
let currentSettings;

export const __testing__ = {
  DISABLED_ICON,
  REGULAR_ICON,
  PAUSED_TEXT,
  currentSettings
};

async function updateBrowserActionIfNeeded(newSettings) {
  if (lodashIsEqual(currentSettings, newSettings)) {
    return;
  }
  currentSettings = newSettings;
  await setBrowserAction(currentSettings);
}

export async function resetBrowserActions({ chromeLocal, activeProfiles, selectedActiveProfile }) {
  if (chromeLocal.isPaused) {
    await updateBrowserActionIfNeeded({
      icon: DISABLED_ICON,
      text: PAUSED_TEXT,
      color: '#666'
    });
  } else {
    let numHeaders = 0;
    for (const currentProfile of activeProfiles) {
      numHeaders +=
        currentProfile.headers.length +
        currentProfile.respHeaders.length +
        currentProfile.cookieHeaders.length +
        currentProfile.setCookieHeaders.length +
        currentProfile.cspHeaders.length +
        currentProfile.urlReplacements.length;
    }
    if (numHeaders === 0) {
      await updateBrowserActionIfNeeded({
        icon: DISABLED_ICON,
        text: '',
        color: '#fff'
      });
    } else {
      await updateBrowserActionIfNeeded({
        icon: REGULAR_ICON,
        text: numHeaders.toString(),
        color: selectedActiveProfile.backgroundColor
      });
    }
  }
}
