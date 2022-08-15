import { storageWriter, profile, profileSync } from '@modheader/core';
import { PROFILE_VERSION } from './profile-hook.js';

export const MessageType = {
  EXISTS: 'EXISTS',
  IMPORT: 'IMPORT',
  IMPORT_AUTO_SYNC: 'IMPORT_AUTO_SYNC',
  SWITCH_TO_LATEST: 'SWITCH_TO_LATEST',
  PROFILES: 'PROFILES'
};

export async function onMessageReceived({ chromeLocal, request }) {
  console.log('Received message', request);
  switch (request.type) {
    case MessageType.EXISTS: {
      const manifest = chrome.runtime.getManifest();
      return {
        success: true,
        maxSupportedProfileVersion: PROFILE_VERSION,
        canImportWithAutoSync: true,
        modHeaderVersion: manifest.version
      };
    }
    case MessageType.IMPORT: {
      const importedProfiles = [JSON.parse(request.profile)];
      profile.fixProfiles(importedProfiles);
      const newProfiles = [...chromeLocal.profiles, ...importedProfiles];
      await storageWriter.setProfilesAndIndex(newProfiles, newProfiles.length - 1);
      return { success: true };
    }
    case MessageType.IMPORT_AUTO_SYNC: {
      const newProfile = await profileSync.reloadLiveProfile({
        liveProfileUrl: request.profileUrl
      });
      const newProfiles = [...chromeLocal.profiles, newProfile];
      await storageWriter.setProfilesAndIndex(newProfiles, newProfiles.length - 1);
      return { success: true };
    }
    case MessageType.SWITCH_TO_LATEST:
      await storageWriter.setSelectedProfileIndex(chromeLocal.profiles.length - 1);
      return { success: true };
    case MessageType.PROFILES:
      return {
        success: true,
        profiles: chromeLocal.profiles,
        selectedProfileIndex: chromeLocal.selectedProfile,
        managedProfiles: chromeLocal.managedProfiles
      };
    default:
      return undefined;
  }
}
