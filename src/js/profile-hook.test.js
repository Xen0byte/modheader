import { jest } from '@jest/globals';

const PROFILE_VERSION = 2;

const mockTabs = {};
const mockProfiles = {};
const mockColor = {
  generateBackgroundColor: () => '#000',
  generateTextColor: () => '#000'
};
const mockUtils = {
  takeRight: (v) => v[v.length - 1]
};
jest.doMock('@modheader/core', () => ({
  color: mockColor,
  profile: mockProfiles,
  tabs: mockTabs,
  utils: mockUtils
}));

const { fixProfileHook, exportProfileHook } = require('./profile-hook.js');

describe('profile', () => {
  test('Fix profiles - Do not mutate good profile', () => {
    const profile = {
      version: PROFILE_VERSION,
      backgroundColor: '#000000',
      urlFilters: [],
      excludeUrlFilters: [],
      resourceFilters: [],
      tabFilters: [],
      tabGroupFilters: [],
      windowFilters: [],
      timeFilters: [],
      headers: [
        {
          comment: '',
          enabled: true,
          name: '',
          value: ''
        }
      ],
      hideComment: true,
      respHeaders: [],
      cookieHeaders: [],
      setCookieHeaders: [],
      cspHeaders: [],
      shortTitle: '1',
      textColor: '#ffffff',
      title: 'Profile 1',
      urlReplacements: []
    };
    const isMutated = fixProfileHook({ profile, index: 0 });

    expect(profile).toEqual({
      version: PROFILE_VERSION,
      backgroundColor: '#000000',
      urlFilters: [],
      excludeUrlFilters: [],
      resourceFilters: [],
      tabFilters: [],
      tabGroupFilters: [],
      windowFilters: [],
      timeFilters: [],
      headers: [
        {
          comment: '',
          enabled: true,
          name: '',
          value: ''
        }
      ],
      hideComment: true,
      respHeaders: [],
      cookieHeaders: [],
      setCookieHeaders: [],
      cspHeaders: [],
      shortTitle: '1',
      textColor: '#ffffff',
      title: 'Profile 1',
      urlReplacements: []
    });
    expect(isMutated).toEqual(false);
  });

  test('Fix profiles - populate missing properties', () => {
    const profile = {};
    const isMutated = fixProfileHook({ profile, index: 0 });

    expect(profile).toEqual({
      version: PROFILE_VERSION,
      backgroundColor: expect.any(String),
      urlFilters: [],
      excludeUrlFilters: [],
      resourceFilters: [],
      tabFilters: [],
      tabGroupFilters: [],
      windowFilters: [],
      timeFilters: [],
      headers: [
        {
          comment: '',
          enabled: true,
          name: '',
          value: ''
        }
      ],
      hideComment: true,
      respHeaders: [],
      cookieHeaders: [],
      setCookieHeaders: [],
      cspHeaders: [],
      shortTitle: '1',
      textColor: expect.any(String),
      title: 'Profile 1',
      urlReplacements: []
    });
    expect(isMutated).toEqual(true);
  });

  test('Fix profiles - fix append mode', () => {
    const profile = {
      appendMode: true,
      headers: [
        {
          comment: '',
          enabled: true,
          name: '',
          value: ''
        }
      ]
    };
    const isMutated = fixProfileHook({ profile, index: 0 });

    expect(profile).toEqual(
      expect.objectContaining({
        headers: [
          {
            appendMode: 'append',
            comment: '',
            enabled: true,
            name: '',
            value: ''
          }
        ]
      })
    );
    expect(isMutated).toEqual(true);
  });

  test('Fix profiles - fix send empty header', () => {
    const profile = {
      sendEmptyHeader: true,
      headers: [
        {
          comment: '',
          enabled: true,
          name: '',
          value: ''
        }
      ]
    };
    const isMutated = fixProfileHook({ profile, index: 0 });

    expect(profile).toEqual(
      expect.objectContaining({
        headers: [
          {
            sendEmptyHeader: true,
            comment: '',
            enabled: true,
            name: '',
            value: ''
          }
        ]
      })
    );
    expect(isMutated).toEqual(true);
  });

  test('Fix profiles - restore default fields', () => {
    const profile = {
      version: PROFILE_VERSION,
      title: 'Local Profile',
      shortTitle: '1',
      headers: [
        { enabled: true, name: 'test name 1', value: 'test value 1', comment: 'test comment' },
        { enabled: false, name: 'test name 2', value: 'test value 2' }
      ],
      headersAutocomplete: {
        autocompleteName: ['test1', 'test2'],
        autocompleteValue: []
      }
    };
    fixProfileHook({ profile, index: 0 });
    expect(profile).toEqual({
      version: PROFILE_VERSION,
      title: 'Local Profile',
      shortTitle: '1',
      backgroundColor: expect.any(String),
      textColor: expect.any(String),
      hideComment: true,
      headers: [
        { enabled: true, name: 'test name 1', value: 'test value 1', comment: 'test comment' },
        { enabled: false, name: 'test name 2', value: 'test value 2', comment: '' }
      ],
      headersAutocomplete: {
        autocompleteName: ['test1', 'test2'],
        autocompleteValue: []
      },
      respHeaders: [],
      cookieHeaders: [],
      setCookieHeaders: [],
      cspHeaders: [],
      urlReplacements: [],
      tabFilters: [],
      tabGroupFilters: [],
      windowFilters: [],
      timeFilters: [],
      urlFilters: [],
      excludeUrlFilters: [],
      resourceFilters: []
    });
  });

  test('Export profiles - Drop default fields', () => {
    const profile = {
      version: PROFILE_VERSION,
      title: 'Local Profile',
      shortTitle: '1',
      backgroundColor: '#000',
      textColor: '#fff',
      hideComment: true,
      headers: [
        { enabled: true, name: 'test name 1', value: 'test value 1', comment: 'test comment' },
        { enabled: false, name: 'test name 2', value: 'test value 2', comment: '' }
      ],
      headersAutocomplete: {
        autocompleteName: ['test1', 'test2'],
        autocompleteValue: []
      },
      respHeaders: [],
      respHeadersAutocomplete: {
        autocompleteName: [],
        autocompleteValue: []
      }
    };
    const exportedProfile = exportProfileHook(profile);
    expect(exportedProfile).toEqual({
      version: PROFILE_VERSION,
      title: 'Local Profile',
      shortTitle: '1',
      headers: [
        { enabled: true, name: 'test name 1', value: 'test value 1', comment: 'test comment' },
        { enabled: false, name: 'test name 2', value: 'test value 2' }
      ],
      headersAutocomplete: {
        autocompleteName: ['test1', 'test2'],
        autocompleteValue: []
      }
    });
  });

  test('Export profiles - Retain styles', () => {
    const profile = {
      version: PROFILE_VERSION,
      title: 'Local Profile',
      shortTitle: '1',
      backgroundColor: '#000',
      textColor: '#fff',
      hideComment: true
    };
    const exportedProfiles = exportProfileHook(profile, { keepStyles: true });
    expect(exportedProfiles).toEqual({
      version: PROFILE_VERSION,
      title: 'Local Profile',
      shortTitle: '1',
      backgroundColor: '#000',
      textColor: '#fff'
    });
  });
});
