import { tabs, utils } from '@modheader/core';
import lodashIsEmpty from 'lodash/isEmpty.js';
import lodashCloneDeep from 'lodash/cloneDeep.js';
import { evaluateValue } from './utils.js';

export async function addUrlRedirect(urlRedirects) {
  let name = '';
  let value = '';
  const tab = await tabs.getActiveTab();
  if (tab && !lodashIsEmpty(tab.url)) {
    const url = new URL(tab.url);
    const { host, origin } = url;
    if (!lodashIsEmpty(host) && host !== 'null') {
      name = `.*://${host}/.*`;
    }
    if (!lodashIsEmpty(origin) && origin !== 'null') {
      value = origin;
    }
  }
  return [
    ...urlRedirects,
    {
      enabled: true,
      name,
      value,
      comment: ''
    }
  ];
}

export function removeUrlRedirect(urlRedirects, replacementIndex) {
  urlRedirects = lodashCloneDeep(urlRedirects);
  urlRedirects.splice(replacementIndex, 1);
  return urlRedirects;
}

export function optimizeUrlRedirects(urlRedirects) {
  return utils.filterEnabled(urlRedirects).map((redirect) => ({
    ...redirect,
    name: new RegExp(redirect.name)
  }));
}

export function redirectUrl({ urlRedirects, url }) {
  if (urlRedirects) {
    for (const replacement of urlRedirects) {
      // Avoid infinite replacement
      const replacementValue = evaluateValue({ value: replacement.value, url, oldValue: url });
      if (!url.includes(replacementValue)) {
        url = url.replace(replacement.name, replacementValue);
      }
    }
  }
  return url;
}
