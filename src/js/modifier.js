import lodashCloneDeep from 'lodash/cloneDeep.js';
import lodashIsEqual from 'lodash/isEqual.js';
import cookie from 'cookie';
import { parse as parseSetCookie } from 'set-cookie-parser';
import { passFilters } from './filter.js';
import { redirectUrl } from './url-redirect.js';
import { evaluateValue } from './utils.js';
import { toCspString } from './csp.js';
import { AppendMode } from './append-mode.js';

function isEnabled(chromeLocal) {
  return !chromeLocal.isPaused;
}

function findAllMatchingKeys(src, map) {
  if (src.regexEnabled) {
    return Object.keys(map).filter((k) => new RegExp(src.name, 'g').test(k));
  } else {
    if (map.hasOwnProperty(src.name)) {
      return [src.name];
    }
  }
  return [];
}

export function modifyRequestUrls({ chromeLocal, activeProfiles, details }) {
  if (isEnabled(chromeLocal)) {
    let newUrl = details.url;
    for (const currentProfile of activeProfiles) {
      if (
        passFilters({
          url: newUrl,
          type: details.type,
          tabId: details.tabId,
          profile: currentProfile
        })
      ) {
        newUrl = redirectUrl({ urlRedirects: currentProfile.urlReplacements, url: newUrl });
      }
    }
    if (newUrl !== details.url) {
      return { redirectUrl: newUrl };
    }
  }
}

function handleAppendMode({ appendMode, originalValue, newValue }) {
  switch (appendMode) {
    case AppendMode.COMMA_SEPARATED_APPEND:
      if (originalValue) {
        return originalValue + ',' + newValue;
      }
      return newValue;
    case AppendMode.APPEND:
      return originalValue + newValue;
    default:
      return newValue;
  }
}

function modifyHeader(url, currentProfile, source, dest) {
  if (!source || !source.length) {
    return;
  }
  // Create an index map so that we can more efficiently override
  // existing header.
  const indexMap = {};
  for (let index = 0; index < dest.length; index++) {
    const header = dest[index];
    indexMap[header.name.toLowerCase()] = index;
  }
  for (const header of source) {
    const normalizedHeaderName = header.name.toLowerCase();
    const index = indexMap[normalizedHeaderName];
    if (!header.value) {
      if (index !== undefined && !header.sendEmptyHeader) {
        dest[index].needRemoval = true;
        continue;
      }
    }
    const headerValue = evaluateValue({
      value: header.value,
      url,
      oldValue: index !== undefined ? dest[index].value : undefined
    });
    if (index !== undefined) {
      dest[index].value = handleAppendMode({
        appendMode: header.appendMode,
        originalValue: dest[index].value,
        newValue: headerValue
      });
    } else {
      dest.push({ name: header.name, value: headerValue });
      indexMap[normalizedHeaderName] = dest.length - 1;
    }
  }
}

function modifyCookie(url, currentProfile, source, dest) {
  if (!source || !source.length) {
    return;
  }
  const existingCookie = dest.find((header) => header.name.toLowerCase() === 'cookie');
  const parsedCookie = cookie.parse(existingCookie ? existingCookie.value : '');
  for (const cookieHeader of source) {
    const matchedKeys = findAllMatchingKeys(cookieHeader, parsedCookie);
    if (matchedKeys.length === 0 && !cookieHeader.regexEnabled) {
      parsedCookie[cookieHeader.name] = evaluateValue({
        value: cookieHeader.value,
        oldValue: '',
        url
      });
    }
    for (const key of matchedKeys) {
      if (!cookieHeader.value) {
        if (parsedCookie.hasOwnProperty(key) && !cookieHeader.sendEmptyHeader) {
          delete parsedCookie[key];
          continue;
        }
      }
      parsedCookie[key] = evaluateValue({
        value: cookieHeader.value,
        oldValue: parsedCookie[key],
        url
      });
    }
  }
  const finalCookieHeader = Object.entries(parsedCookie)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('; ');
  if (existingCookie) {
    existingCookie.value = finalCookieHeader;
    if (!finalCookieHeader) {
      existingCookie.needRemoval = true;
    }
  } else {
    const entry = { name: 'cookie', value: finalCookieHeader };
    if (!finalCookieHeader) {
      entry.needRemoval = true;
    }
    dest.push(entry);
  }
}

function modifySetCookie(url, currentProfile, source, dest) {
  if (!source || !source.length) {
    return;
  }
  // Create an index map so that we can more efficiently override
  // existing header.
  const setCookieHeaderIndices = [];
  let cookieMap = {};
  for (let index = 0; index < dest.length; index++) {
    const header = dest[index];
    if (header.name.toLowerCase() === 'set-cookie') {
      const cookies = parseSetCookie(header.value);
      for (const c of cookies) {
        cookieMap[c.name] = c;
      }
      setCookieHeaderIndices.push(index);
    }
  }
  for (const cookie of source) {
    if (!cookie.value) {
      const matchedKeys = findAllMatchingKeys(cookie, cookieMap);
      if (matchedKeys.length > 0) {
        for (const key of matchedKeys) {
          if (cookie.retainExistingCookie) {
            cookieMap[key] = {
              ...cookie,
              value: evaluateValue({
                value: cookieMap[key].value,
                oldValue: cookieMap[key].value,
                url
              })
            };
          } else {
            cookieMap[key].value = '';
          }
        }
      }
    } else {
      const matchedKeys = findAllMatchingKeys(cookie, cookieMap);
      if (matchedKeys.length === 0 && !cookie.regexEnabled) {
        cookieMap[cookie.name] = {
          ...cookie,
          value: evaluateValue({
            value: cookie.value,
            oldValue: '',
            url
          })
        };
      } else {
        for (const key of matchedKeys) {
          const cookieValue = evaluateValue({
            value: cookie.value,
            oldValue: cookieMap[key].value,
            url
          });
          if (cookie.attributeOverride) {
            cookieMap[key] = {
              ...cookie,
              value: cookieValue
            };
          } else {
            cookieMap[key].value = cookieValue;
          }
        }
      }
    }
  }
  setCookieHeaderIndices.reverse();
  for (const [name, value] of Object.entries(cookieMap)) {
    const serializedCookieHeader = cookie.serialize(name, value.value, value);
    if (setCookieHeaderIndices.length > 0) {
      const index = setCookieHeaderIndices.pop();
      dest[index].value = serializedCookieHeader;
    } else {
      dest.push({ name: 'set-cookie', value: serializedCookieHeader });
    }
  }
}

function modifyCsp(url, currentProfile, source, dest) {
  if (!source || !source.length) {
    return;
  }
  let cspIndex = -1;
  for (let index = 0; index < dest.length; index++) {
    const header = dest[index];
    if (header.name.toLowerCase() === 'content-security-policy') {
      cspIndex = index;
      break;
    }
  }
  let cspMap = {};
  for (const policy of source) {
    cspMap[policy.name] = policy.value;
  }
  const csp = toCspString(cspMap);
  if (cspIndex >= 0) {
    dest[cspIndex].value = csp;
  } else {
    dest.push({ name: 'content-security-policy', value: csp });
  }
}

export function modifyRequestHeaders({ chromeLocal, activeProfiles, details }) {
  if (isEnabled(chromeLocal) && activeProfiles.length > 0) {
    for (const currentProfile of activeProfiles) {
      if (
        passFilters({
          url: details.url,
          type: details.type,
          tabId: details.tabId,
          profile: currentProfile
        })
      ) {
        modifyHeader(details.url, currentProfile, currentProfile.headers, details.requestHeaders);
        modifyCookie(
          details.url,
          currentProfile,
          currentProfile.cookieHeaders,
          details.requestHeaders
        );
        details.requestHeaders = details.requestHeaders.filter((entry) => !entry.needRemoval);
      }
    }
    return {
      requestHeaders: details.requestHeaders
    };
  }
}

export function modifyResponseHeaders({ chromeLocal, activeProfiles, details }) {
  if (isEnabled(chromeLocal) && activeProfiles.length > 0) {
    const originalResponseHeaders = details.responseHeaders || [];
    let responseHeaders;
    for (const currentProfile of activeProfiles) {
      if (
        passFilters({
          url: details.url,
          type: details.type,
          tabId: details.tabId,
          profile: currentProfile
        })
      ) {
        if (!responseHeaders) {
          responseHeaders = lodashCloneDeep(originalResponseHeaders);
        }
        modifyHeader(details.url, currentProfile, currentProfile.respHeaders, responseHeaders);
        modifySetCookie(
          details.url,
          currentProfile,
          currentProfile.setCookieHeaders,
          responseHeaders
        );
        modifyCsp(details.url, currentProfile, currentProfile.cspHeaders, responseHeaders);
        responseHeaders = responseHeaders.filter((entry) => !entry.needRemoval);
      }
    }
    if (responseHeaders && !lodashIsEqual(responseHeaders, originalResponseHeaders)) {
      return {
        responseHeaders
      };
    }
  }
}
