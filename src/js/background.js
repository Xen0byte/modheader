import { resetBrowserActions } from './browser-action-manager.js';
import { modifyRequestUrls, modifyRequestHeaders, modifyResponseHeaders } from './modifier.js';
import { loadProfilesFromStorage } from './worker-data-manager.js';
import { onMessageReceived } from './message-handler.js';
import {
  commandHandler,
  contextMenuManager,
  profileSync,
  storage,
  tabs,
  userAgent
} from '@modheader/core';
import {
  addBeforeRequestListener,
  addBeforeSendHeadersListener,
  addHeadersReceivedListener,
  removeBeforeRequestListener,
  removeBeforeSendHeadersListener,
  removeHeadersReceivedListener
} from './web-request.js';
import { initProfileHooks } from './profile-hook.js';

initProfileHooks();
const ALL_URLS_FILTER = ['<all_urls>'];

const CHECK_LIVE_PROFILE_ALARM = 'checkLiveProfileAlarm';

let chromeLocal = {
  isPaused: true
};
let selectedActiveProfile;
let activeProfiles = [];

function modifyRequestHandler_(details) {
  return modifyRequestUrls({ chromeLocal, activeProfiles, details });
}

function modifyRequestHeaderHandler_(details) {
  return modifyRequestHeaders({ chromeLocal, activeProfiles, details });
}

function modifyResponseHeaderHandler_(details) {
  return modifyResponseHeaders({ chromeLocal, activeProfiles, details });
}

function webdriverOnBeforeRequestHandler_(details) {
  if (
    details.url.includes('//webdriver.modheader.com/') ||
    details.url.includes('//webdriver.bewisse.com/') ||
    details.url.includes('//bewisse.com/')
  ) {
    const parsedUrl = new URL(details.url);
    if (
      parsedUrl.pathname === '/add' ||
      parsedUrl.pathname === '/clear' ||
      parsedUrl.pathname === '/load'
    ) {
      chrome.tabs.update(null, {
        url: chrome.runtime.getURL(parsedUrl.pathname + '.html' + parsedUrl.search)
      });
      return {
        cancel: true
      };
    }
  }
}

function setupHeaderModListener() {
  if (activeProfiles.find((p) => p.urlReplacements.length > 0)) {
    addBeforeRequestListener(modifyRequestHandler_, ALL_URLS_FILTER);
  } else {
    removeBeforeRequestListener(modifyRequestHandler_);
  }
  if (activeProfiles.find((p) => p.headers.length > 0 || p.cookieHeaders.length > 0)) {
    addBeforeSendHeadersListener(modifyRequestHeaderHandler_, ALL_URLS_FILTER);
  } else {
    removeBeforeSendHeadersListener(modifyRequestHeaderHandler_);
  }
  if (activeProfiles.find((p) => p.respHeaders.length > 0 || p.setCookieHeaders.length > 0)) {
    addHeadersReceivedListener(modifyResponseHeaderHandler_, ALL_URLS_FILTER);
  } else {
    removeHeadersReceivedListener(modifyResponseHeaderHandler_);
  }
}

async function initialize() {
  await tabs.setupTabUpdatedListener();
  await contextMenuManager.initContextMenu();
  await loadProfilesFromStorage(async (params) => {
    chromeLocal = params.chromeLocal;
    activeProfiles = params.activeProfiles;
    selectedActiveProfile = params.selectedActiveProfile;
    setupHeaderModListener();
    await resetBrowserActions({ chromeLocal, activeProfiles, selectedActiveProfile });
    await contextMenuManager.resetContextMenu(chromeLocal);
  });
  if (process.env.WEB_DRIVER) {
    chrome.webRequest.onBeforeRequest.addListener(
      webdriverOnBeforeRequestHandler_,
      { urls: ['<all_urls>'] },
      ['blocking']
    );
  }
  chrome.alarms.create(CHECK_LIVE_PROFILE_ALARM, {
    periodInMinutes: 30,
    when: 1
  });
}

async function messageHandler(request, sendResponse) {
  const response = await onMessageReceived({ chromeLocal, request });
  if (response) {
    sendResponse(response);
  }
}

if (!userAgent.isChromiumBasedBrowser()) {
  // Firefox does not allow web pages to directly communicate with background page, so we need to
  // expose a function via content script that can post internal message to background page.
  // See https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    messageHandler(request, sendResponse);
    return true;
  });
} else {
  chrome.runtime.onMessageExternal.addListener(async (request, sender, sendResponse) => {
    if (sender.origin && !sender.origin.startsWith(process.env.URL_BASE)) {
      sendResponse({ error: 'Unsupported origin' });
      return;
    }
    await messageHandler(request, sendResponse);
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  await commandHandler.onCommandReceived(chromeLocal, command);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CHECK_LIVE_PROFILE_ALARM && !chromeLocal.isPaused && chromeLocal.profiles) {
    await profileSync.reloadAllLiveProfile(chromeLocal.profiles);
  }
});

window.saveToStorage = function (items) {
  return storage.setLocal(items);
};

initialize();

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' && !process.env.WEB_DRIVER) {
    setTimeout(() => {
      if (!chromeLocal.managedProfiles || chromeLocal.managedProfiles.length === 0) {
        tabs.openUrl({ path: '/modheader/welcome', autoClose: false });
      }
    }, 1000);
  }
});
