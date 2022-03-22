import { writable, get } from 'svelte/store';
import lodashCloneDeep from 'lodash/cloneDeep';
import lodashIsEqual from 'lodash/isEqual';
import lodashIsUndefined from 'lodash/isUndefined';
import { hideMessage } from './toast';
import { getLocal, setLocal, removeLocal } from './storage';
import { signedInUser } from './identity';
import {
  undoChange,
  commit,
  setChangeField,
  stopIgnoringChange,
  startIgnoringChange
} from './change-stack';

export const profiles = writable([]);
export const selectedProfileIndex = writable(0);
export const isPaused = writable(false);
export const isLocked = writable(false);
export const isInitialized = writable(false);

profiles.subscribe(($profiles) => {
  setChangeField('profiles', $profiles);
});
selectedProfileIndex.subscribe(($selectedProfileIndex) => {
  setChangeField('selectedProfileIndex', $selectedProfileIndex);
});
isPaused.subscribe(async ($isPaused) => {
  setChangeField('isPaused', $isPaused);
  if (get(isInitialized)) {
    if ($isPaused) {
      await setLocal({ isPaused: true });
    } else {
      await removeLocal('isPaused');
    }
  }
});
isLocked.subscribe(async ($isLocked) => {
  setChangeField('isLocked', $isLocked);
  if (get(isInitialized)) {
    if ($isLocked) {
      const { activeTabId } = await getLocal('activeTabId');
      await setLocal({ lockedTabId: activeTabId });
    } else {
      await removeLocal('lockedTabId');
    }
  }
});
isInitialized.subscribe(($isInitialized) => {
  if ($isInitialized) {
    stopIgnoringChange();
  } else {
    startIgnoringChange();
  }
});

export function undo() {
  let lastChange = undoChange();
  if (!lastChange) {
    return;
  }
  const currentProfiles = get(profiles);
  const currentSelectedProfileIndex = get(selectedProfileIndex);
  const currentIsLocked = get(isLocked);
  const currentIsPaused = get(isPaused);
  while (lastChange) {
    if (
      !lodashIsUndefined(lastChange.profiles) &&
      !lodashIsEqual(lastChange.profiles, currentProfiles)
    ) {
      break;
    }
    if (
      !lodashIsUndefined(lastChange.selectedProfileIndex) &&
      lastChange.selectedProfileIndex !== currentSelectedProfileIndex
    ) {
      break;
    }
    if (!lodashIsUndefined(lastChange.isLocked) && lastChange.isLocked !== currentIsLocked) {
      break;
    }
    if (!lodashIsUndefined(lastChange.isPaused) && lastChange.isPaused !== currentIsPaused) {
      break;
    }
    lastChange = undoChange();
  }
  commitData({
    newProfiles: lastChange.profiles || currentProfiles,
    newIndex: lastChange.selectedProfileIndex,
    newIsLocked: lastChange.isLocked,
    newIsPaused: lastChange.isPaused
  });
  hideMessage();
}

export function commitData({ newProfiles, newIndex, newIsLocked, newIsPaused } = {}) {
  commit(() => {
    newIndex = Math.max(0, Math.min(newProfiles.length - 1, newIndex));
    if (!lodashIsUndefined(newIsLocked)) {
      newIsLocked = get(isLocked);
    }
    if (lodashIsUndefined(newIsPaused)) {
      newIsPaused = get(isPaused);
    }
    profiles.set(newProfiles);
    selectedProfileIndex.set(newIndex);
    isLocked.set(newIsLocked);
    isPaused.set(newIsPaused);
    return {
      profiles: lodashCloneDeep(newProfiles),
      selectedProfileIndex: newIndex,
      isLocked: newIsLocked,
      isPaused: newIsPaused
    };
  });
}

export async function init() {
  const chromeLocal = await getLocal([
    'profiles',
    'selectedProfile',
    'signedInUser',
    'lockedTabId',
    'isPaused'
  ]);
  signedInUser.set(chromeLocal.signedInUser);
  commitData({
    newProfiles: chromeLocal.profiles,
    newIndex: chromeLocal.selectedProfile,
    newIsLocked: !!chromeLocal.lockedTabId,
    newIsPaused: !!chromeLocal.isPaused
  });
  isInitialized.set(true);
}
