import lodashIsArray from 'lodash/isArray.js';
import lodashCloneDeep from 'lodash/cloneDeep.js';
import { color, profile as profileUtils, storage, utils } from '@modheader/core';
import { createHeader } from './header.js';
import { AppendMode } from './append-mode.js';
import { FilterType } from './filter.js';

export const PROFILE_VERSION = 2;
const ARRAY_FIELDS = [
  'headers',
  'respHeaders',
  'urlReplacements',
  'cookieHeaders',
  'setCookieHeaders',
  'cspHeaders',
  'urlFilters',
  'excludeUrlFilters',
  'resourceFilters',
  'tabFilters',
  'tabGroupFilters',
  'windowFilters',
  'timeFilters'
];

export function fixProfileHook({ profile, index }) {
  let isMutated = false;

  if (!profile.version) {
    upgradeFromProfileVersion1({ profile, index });
    isMutated = true;
  }
  if (profile.hideComment === undefined) {
    profile.hideComment = true;
    isMutated = true;
  }
  if (!profile.backgroundColor) {
    profile.backgroundColor = color.generateBackgroundColor();
    isMutated = true;
  }
  if (!profile.textColor) {
    profile.textColor = color.generateTextColor();
    isMutated = true;
  }
  if (!profile.shortTitle) {
    profile.shortTitle = utils.takeRight(profile.title);
    isMutated = true;
  }
  for (const arrayField of ARRAY_FIELDS) {
    if (profile[arrayField] === undefined || !lodashIsArray(profile[arrayField])) {
      profile[arrayField] = [];
      isMutated = true;
    } else {
      for (const entry of profile[arrayField]) {
        if (entry.comment === undefined) {
          entry.comment = '';
          isMutated = true;
        }
      }
    }
  }
  return isMutated;
}

function upgradeFromProfileVersion1({ profile, index }) {
  profile.version = PROFILE_VERSION;
  if (profile.hideComment === undefined) {
    profile.hideComment = true;
  }
  if (!profile.title) {
    profile.title = 'Profile ' + (index + 1);
  }
  if (!profile.shortTitle) {
    profile.shortTitle = utils.takeRight(index + 1);
  }
  if (!profile.headers || !lodashIsArray(profile.headers)) {
    profile.headers = [createHeader()];
  }
  if (!profile.respHeaders || !lodashIsArray(profile.respHeaders)) {
    profile.respHeaders = [];
  }
  if (!profile.cookieHeaders || !lodashIsArray(profile.cookieHeaders)) {
    profile.cookieHeaders = [];
  }
  if (!profile.setCookieHeaders || !lodashIsArray(profile.setCookieHeaders)) {
    profile.setCookieHeaders = [];
  }
  if (!profile.cspHeaders || !lodashIsArray(profile.cspHeaders)) {
    profile.cspHeaders = [];
  }
  if (!profile.urlReplacements || !lodashIsArray(profile.urlReplacements)) {
    profile.urlReplacements = [];
  }
  let appendMode = AppendMode.OVERRIDE;
  if (profile.appendMode === 'comma') {
    appendMode = AppendMode.COMMA_SEPARATED_APPEND;
  } else if (profile.appendMode === 'true' || profile.appendMode === true) {
    appendMode = AppendMode.APPEND;
  }
  delete profile.appendMode;
  const allHeaders = [...profile.headers, ...profile.respHeaders];
  for (const modifier of allHeaders) {
    modifier.appendMode = appendMode;
  }
  if (profile.sendEmptyHeader) {
    for (const modifier of allHeaders) {
      modifier.sendEmptyHeader = true;
    }
  }
  delete profile.sendEmptyHeader;
  profile.urlFilters = [];
  profile.excludeUrlFilters = [];
  profile.resourceFilters = [];
  profile.tabFilters = [];
  profile.tabGroupFilters = [];
  profile.windowFilters = [];
  profile.timeFilters = [];
  for (const filter of profile.filters || []) {
    const type = filter.type;
    delete filter.type;
    if (!filter.comment) {
      filter.comment = '';
    }
    switch (type) {
      case FilterType.URLS:
        delete filter.resourceType;
        profile.urlFilters.push(filter);
        break;
      case FilterType.EXCLUDE_URLS:
        delete filter.resourceType;
        profile.excludeUrlFilters.push(filter);
        break;
      case FilterType.RESOURCE_TYPES:
        if (!filter.resourceType) {
          filter.resourceType = [];
        }
        delete filter.urlRegex;
        profile.resourceFilters.push(filter);
        break;
    }
  }
  delete profile.filters;

  if (!profile.backgroundColor) {
    profile.backgroundColor = color.generateBackgroundColor();
  }
  if (!profile.textColor) {
    profile.textColor = color.generateTextColor();
  }
}

function createProfileHook({ profileNum }) {
  return {
    version: PROFILE_VERSION,
    title: 'Profile ' + profileNum,
    hideComment: true,
    headers: [createHeader()],
    respHeaders: [],
    urlReplacements: [],
    cookieHeaders: [],
    setCookieHeaders: [],
    cspHeaders: [],
    urlFilters: [],
    excludeUrlFilters: [],
    resourceFilters: [],
    tabFilters: [],
    tabGroupFilters: [],
    windowFilters: [],
    timeFilters: [],
    backgroundColor: color.generateBackgroundColor(),
    textColor: color.generateTextColor(),
    shortTitle: utils.takeRight(profileNum)
  };
}

function cloneProfileHook(profile) {
  return lodashCloneDeep(profile);
}

function removeProfileHook() {
  // Nothing extra to clean up.
}

function importProfileHook() {
  // Nothing special to import
}

export function exportProfileHook(cloneProfile, { keepStyles } = {}) {
  delete cloneProfile.profileId;
  delete cloneProfile.liveProfileUrl;
  delete cloneProfile.liveProfileStatus;
  delete cloneProfile.liveProfileLastSyncTimestamp;
  if (cloneProfile.hideComment) {
    delete cloneProfile.hideComment;
  }
  if (!keepStyles) {
    delete cloneProfile.backgroundColor;
    delete cloneProfile.textColor;
  }
  for (const arrayField of ARRAY_FIELDS) {
    if (!cloneProfile[arrayField] || cloneProfile[arrayField].length === 0) {
      delete cloneProfile[arrayField];
    } else {
      for (const entry of cloneProfile[arrayField]) {
        if (!entry.comment) {
          delete entry.comment;
        }
      }
    }
    const autocompleteField = `${arrayField}Autocomplete`;
    if (
      cloneProfile[autocompleteField] &&
      cloneProfile[autocompleteField].autocompleteName.length === 0 &&
      cloneProfile[autocompleteField].autocompleteValue.length === 0
    ) {
      delete cloneProfile[autocompleteField];
    }
  }
  return cloneProfile;
}

async function saveProfileHook({ profiles, selectedProfileIndex }) {
  try {
    const background = chrome.extension.getBackgroundPage();
    await background.saveToStorage({
      profiles,
      selectedProfile: selectedProfileIndex
    });
  } catch (err) {
    // Firefox's private session cannot access background page, so just set
    // directly to the browser storage.
    await storage.setLocal({
      profiles,
      selectedProfile: selectedProfileIndex
    });
  }
}

export function initProfileHooks() {
  profileUtils.init({
    fixProfileHook,
    cloneProfileHook,
    removeProfileHook,
    createProfileHook,
    exportProfileHook,
    importProfileHook,
    saveProfileHook
  });
}
