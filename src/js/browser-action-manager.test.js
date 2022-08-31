import { jest } from '@jest/globals';

const mockBrowserAction = {
  setBrowserAction: jest.fn()
};
jest.doMock('./browser-action.js', () => mockBrowserAction);

const { resetBrowserActions, __testing__ } = require('./browser-action-manager.js');

describe('browser-action-manager', () => {
  afterEach(() => {
    __testing__.currentSettings = undefined;
  });

  test('Show paused', async () => {
    const chromeLocal = { isPaused: true };
    const activeProfiles = [];
    const selectedActiveProfile = {};
    await resetBrowserActions({ chromeLocal, activeProfiles, selectedActiveProfile });

    expect(mockBrowserAction.setBrowserAction).toHaveBeenCalledTimes(1);
    expect(mockBrowserAction.setBrowserAction).toHaveBeenCalledWith({
      icon: __testing__.DISABLED_ICON,
      text: __testing__.PAUSED_TEXT,
      color: '#666'
    });
  });

  test('Show no modifications', async () => {
    const chromeLocal = {};
    const activeProfiles = [];
    const selectedActiveProfile = {};
    await resetBrowserActions({ chromeLocal, activeProfiles, selectedActiveProfile });

    expect(mockBrowserAction.setBrowserAction).toHaveBeenCalledTimes(1);
    expect(mockBrowserAction.setBrowserAction).toHaveBeenCalledWith({
      icon: __testing__.DISABLED_ICON,
      text: '',
      color: '#fff'
    });
  });

  test('Show number of modifications', async () => {
    const chromeLocal = {};
    const activeProfiles = [
      {
        headers: [{ name: 'foo', value: 'bar' }],
        respHeaders: [],
        cookieHeaders: [],
        setCookieHeaders: [],
        cspHeaders: [],
        urlReplacements: []
      }
    ];
    const selectedActiveProfile = {
      backgroundColor: '#123456'
    };
    await resetBrowserActions({ chromeLocal, activeProfiles, selectedActiveProfile });

    expect(mockBrowserAction.setBrowserAction).toHaveBeenCalledTimes(1);
    expect(mockBrowserAction.setBrowserAction).toHaveBeenCalledWith({
      icon: __testing__.REGULAR_ICON,
      text: '1',
      color: '#123456'
    });
  });

  test('Call only once on same setting', async () => {
    const chromeLocal = { isPaused: true };
    const activeProfiles = [];
    const selectedActiveProfile = {};
    await resetBrowserActions({ chromeLocal, activeProfiles, selectedActiveProfile });
    await resetBrowserActions({ chromeLocal, activeProfiles, selectedActiveProfile });

    expect(mockBrowserAction.setBrowserAction).toHaveBeenCalledTimes(1);
    expect(mockBrowserAction.setBrowserAction).toHaveBeenCalledWith({
      icon: __testing__.DISABLED_ICON,
      text: __testing__.PAUSED_TEXT,
      color: '#666'
    });
  });
});
