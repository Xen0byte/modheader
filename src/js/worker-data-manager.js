import lodashCloneDeep from 'lodash/cloneDeep.js';
import lodashIsUndefined from 'lodash/isUndefined.js';
import lodashIsEqual from 'lodash/isEqual.js';
import { profile, storage, storageLoader, storageWriter, utils } from '@modheader/core';
import { optimizeResourceFilters, optimizeFilters, optimizeUrlFilters } from './filter.js';
import { optimizeUrlRedirects } from './url-redirect.js';

const MAX_PROFILES_IN_CLOUD = 20;

export async function loadProfilesFromStorage(dataChangeCallback) {
  let chromeLocal = await storageLoader.initStorage();
  let reloadResponse = reloadActiveProfiles(chromeLocal);
  await dataChangeCallback(reloadResponse);

  storage.addStorageChangeListener(async (changes) => {
    const profilesUpdated = !lodashIsUndefined(changes.profiles);
    if (profilesUpdated) {
      // Profiles need to be upgraded. Convert and resave to localStorage. The change will trigger the storage change
      // listener to get invoked again.
      let newProfiles = changes.profiles.newValue;
      if (lodashIsUndefined(newProfiles)) {
        newProfiles = [];
      }
      if (profile.fixProfiles(newProfiles)) {
        await storageWriter.setProfiles(newProfiles);
        return;
      }
    }
    for (const [key, value] of Object.entries(changes)) {
      chromeLocal[key] = value.newValue;
    }
    if (profilesUpdated || changes.selectedProfile) {
      reloadResponse = reloadActiveProfiles(chromeLocal);
    }
    await dataChangeCallback(reloadResponse);
    if (profilesUpdated) {
      await saveStorageToCloud(chromeLocal);
    }
  });
}

function optimizeProfile(value) {
  const profile = lodashCloneDeep(value);
  profile.headers = utils.filterEnabled(profile.headers);
  profile.respHeaders = utils.filterEnabled(profile.respHeaders);
  profile.cookieHeaders = utils.filterEnabled(profile.cookieHeaders);
  profile.setCookieHeaders = utils.filterEnabled(profile.setCookieHeaders);
  profile.urlReplacements = optimizeUrlRedirects(profile.urlReplacements);
  profile.urlFilters = optimizeUrlFilters(profile.urlFilters);
  profile.excludeUrlFilters = optimizeUrlFilters(profile.excludeUrlFilters);
  profile.resourceFilters = optimizeResourceFilters(profile.resourceFilters);
  profile.tabFilters = optimizeFilters(profile.tabFilters);
  profile.tabGroupFilters = optimizeFilters(profile.tabGroupFilters);
  profile.windowFilters = optimizeFilters(profile.windowFilters);
  profile.timeFilters = optimizeFilters(profile.timeFilters);
  return profile;
}

function reloadActiveProfiles(chromeLocal) {
  const activeProfiles = [];
  let selectedActiveProfile = undefined;
  if (chromeLocal.managedProfiles.length > 0) {
    for (const value of chromeLocal.managedProfiles) {
      const profile = optimizeProfile(value);
      activeProfiles.push(profile);
    }
  }
  if (chromeLocal.profiles) {
    const profiles = chromeLocal.profiles;
    for (const [i, value] of profiles.entries()) {
      if (i !== chromeLocal.selectedProfile && !value.alwaysOn) {
        continue;
      }
      const profile = optimizeProfile(value);
      if (i === chromeLocal.selectedProfile) {
        selectedActiveProfile = profile;
      }
      activeProfiles.push(profile);
    }
  }
  return { chromeLocal, activeProfiles, selectedActiveProfile };
}

async function saveStorageToCloud(chromeLocal) {
  const items = await storage.getSync();
  const keys = items ? Object.keys(items) : [];
  keys.sort();
  if (keys.length >= MAX_PROFILES_IN_CLOUD) {
    await storage.removeSync(keys.slice(0, keys.length - MAX_PROFILES_IN_CLOUD));
  }
  if (keys.length === 0 || !lodashIsEqual(items[keys[keys.length - 1]], chromeLocal.profiles)) {
    const data = {};
    data[Date.now()] = chromeLocal.profiles;
    await storage.setSync(data);
  }
}
