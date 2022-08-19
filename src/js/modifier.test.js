import { jest } from '@jest/globals';
import { AppendMode } from './append-mode.js';

const mockTabs = {
  lookupTabInfo: jest.fn()
};
jest.doMock('@modheader/core', () => ({
  tabs: mockTabs
}));
jest.doMock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid')
}));

const { FilterType } = require('./filter.js');
const { modifyRequestUrls, modifyRequestHeaders, modifyResponseHeaders } = require('./modifier.js');

const PROFILE_VERSION = 2;

const EMPTY_PROFILE = {
  version: PROFILE_VERSION,
  title: 'Test profile',
  headers: [],
  respHeaders: [],
  urlReplacements: [],
  setCookieHeaders: [],
  urlFilters: [],
  excludeUrlFilters: [],
  resourceFilters: [],
  tabFilters: [],
  tabGroupFilters: [],
  windowFilters: [],
  timeFilters: []
};

describe('modifier', () => {
  describe('Modify request urls', () => {
    test('Nothing changed', () => {
      const chromeLocal = {};
      const activeProfiles = [EMPTY_PROFILE];
      const details = {};
      const actual = modifyRequestUrls({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual(undefined);
    });

    test('Redirect to new url', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          urlReplacements: [
            {
              name: new RegExp('bewisse.com'),
              value: 'modheader.com'
            }
          ]
        }
      ];
      const details = {
        url: 'https://bewisse.com/'
      };
      const actual = modifyRequestUrls({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({ redirectUrl: 'https://modheader.com/' });
    });

    test('Redirect to new url - dynamic value', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          urlReplacements: [
            {
              name: new RegExp('.*'),
              value: 'https://modheader.com{{url_path}}'
            }
          ]
        }
      ];
      const details = {
        url: 'https://bewisse.com/test'
      };
      const actual = modifyRequestUrls({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({ redirectUrl: 'https://modheader.com/test' });
    });

    test('Paused profile', () => {
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          urlReplacements: [
            {
              name: new RegExp('bewisse.com'),
              value: 'modheader.com'
            }
          ]
        }
      ];
      const details = {
        url: 'https://bewisse.com/'
      };
      const actualUnchanged = modifyRequestUrls({
        chromeLocal: { isPaused: true },
        activeProfiles,
        details
      });
      expect(actualUnchanged).toEqual(undefined);

      const actualChanged = modifyRequestUrls({
        chromeLocal: { isPaused: false },
        activeProfiles,
        details
      });
      expect(actualChanged).toEqual({ redirectUrl: 'https://modheader.com/' });
    });

    test('Filtering matched', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          urlReplacements: [
            {
              name: new RegExp('bewisse.com'),
              value: 'modheader.com'
            }
          ],
          filters: [
            {
              type: FilterType.URLS,
              urlRegex: new RegExp('bewisse.com')
            }
          ]
        }
      ];
      const details = {
        url: 'https://bewisse.com/'
      };

      const actual = modifyRequestUrls({ chromeLocal, activeProfiles, details });
      expect(actual).toEqual({ redirectUrl: 'https://modheader.com/' });
    });

    test('Filtering not matched', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          urlReplacements: [
            {
              name: new RegExp('bewisse.com'),
              value: 'modheader.com'
            }
          ],
          urlFilters: [
            {
              urlRegex: new RegExp('modheader.com')
            }
          ]
        }
      ];
      const details = {
        url: 'https://bewisse.com/'
      };

      const actual = modifyRequestUrls({ chromeLocal, activeProfiles, details });
      expect(actual).toEqual(undefined);
    });
  });

  describe('Modify request headers', () => {
    test('Modify header - Override value, ignore header case', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          headers: [
            {
              name: 'foo',
              value: 'Test bar'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Test bar'
          }
        ]
      });
    });

    test('Modify header - dynamic value', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          headers: [
            {
              name: 'foo',
              value: 'foo-{{uuid}}'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'Foo',
            value: 'foo-test-uuid'
          }
        ]
      });
    });

    test('Modify header - Append mode', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          headers: [
            {
              name: 'foo',
              value: 'Test bar',
              appendMode: AppendMode.APPEND
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'Foo',
            value: 'BarTest bar'
          }
        ]
      });
    });

    test('Modify header - Comma append mode', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          headers: [
            {
              name: 'foo',
              value: 'Test bar',
              appendMode: AppendMode.COMMA_SEPARATED_APPEND
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Bar,Test bar'
          }
        ]
      });
    });

    test('Modify header - Add new header', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          headers: [
            {
              name: 'foo',
              value: 'Test bar'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: []
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'foo',
            value: 'Test bar'
          }
        ]
      });
    });

    test('Modify header - Remove header', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          headers: [
            {
              name: 'foo',
              value: ''
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: []
      });
    });

    test('Modify header - Send empty header', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          headers: [
            {
              name: 'foo',
              value: '',
              sendEmptyHeader: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'Foo',
            value: ''
          }
        ]
      });
    });

    test('Modify header - Multiple profiles', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          headers: [
            {
              name: 'foo',
              value: 'Test Profile 1'
            }
          ]
        },
        {
          ...EMPTY_PROFILE,
          headers: [
            {
              name: 'Foo',
              value: 'Test Profile 2',
              appendMode: AppendMode.COMMA_SEPARATED_APPEND
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Test Profile 1,Test Profile 2'
          }
        ]
      });
    });

    test('Modify header - No modifications', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          headers: []
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      });
    });
  });

  describe('Modify response headers', () => {
    test('Modify header - Override value, ignore header case', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          respHeaders: [
            {
              name: 'foo',
              value: 'Test bar'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'Foo',
            value: 'Test bar'
          }
        ]
      });
    });

    test('Modify header - Append mode', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          respHeaders: [
            {
              name: 'foo',
              value: 'Test bar',
              appendMode: AppendMode.APPEND
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'Foo',
            value: 'BarTest bar'
          }
        ]
      });
    });

    test('Modify header - Comma append mode', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          respHeaders: [
            {
              name: 'foo',
              value: 'Test bar',
              appendMode: AppendMode.COMMA_SEPARATED_APPEND
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'Foo',
            value: 'Bar,Test bar'
          }
        ]
      });
    });

    test('Modify header - Add new header', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          respHeaders: [
            {
              name: 'foo',
              value: 'Test bar'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: []
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'foo',
            value: 'Test bar'
          }
        ]
      });
    });

    test('Modify header - Remove header', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          respHeaders: [
            {
              name: 'foo',
              value: ''
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: []
      });
    });

    test('Modify header - Send empty header', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          respHeaders: [
            {
              name: 'foo',
              value: '',
              sendEmptyHeader: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'Foo',
            value: ''
          }
        ]
      });
    });

    test('Modify header - Multiple profiles', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          respHeaders: [
            {
              name: 'foo',
              value: 'Test Profile 1'
            }
          ]
        },
        {
          ...EMPTY_PROFILE,
          respHeaders: [
            {
              name: 'Foo',
              value: 'Test Profile 2',
              appendMode: AppendMode.COMMA_SEPARATED_APPEND
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'Foo',
            value: 'Test Profile 1,Test Profile 2'
          }
        ]
      });
    });

    test('Modify header - No modifications', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          respHeaders: []
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'Foo',
            value: 'Bar'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual(undefined);
    });
  });

  describe('Modify cookie headers', () => {
    test('Modify cookie header - Override value', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          cookieHeaders: [
            {
              name: 'foo',
              value: 'Test'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Original'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Test'
          }
        ]
      });
    });

    test('Modify cookie header - regex enabled - Override value', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          cookieHeaders: [
            {
              name: 'fo.*',
              value: 'Test',
              regexEnabled: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Original'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Test'
          }
        ]
      });
    });

    test('Modify cookie header - Override value previously created by request headers', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          headers: [{ name: 'cookie', value: 'foo=Original' }],
          cookieHeaders: [
            {
              name: 'foo',
              value: 'Test'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: []
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Test'
          }
        ]
      });
    });

    test('Modify cookie header - regex enabled - Override value previously created by request headers', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          headers: [{ name: 'cookie', value: 'foo=Original' }],
          cookieHeaders: [
            {
              name: 'fo.*',
              value: 'Test',
              regexEnabled: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: []
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Test'
          }
        ]
      });
    });

    test('Modify cookie header - Add new header', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          cookieHeaders: [
            {
              name: 'foo',
              value: 'Test'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: []
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Test'
          }
        ]
      });
    });

    test('Modify cookie header - multiple cookies', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          cookieHeaders: [
            {
              name: 'foo',
              value: 'Test'
            },
            {
              name: 'foo2',
              value: 'Test2'
            },
            {
              name: 'foo3',
              value: 'Test3'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Original'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Test; foo2=Test2; foo3=Test3'
          }
        ]
      });
    });

    test('Modify cookie header - dynamic value', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          cookieHeaders: [
            {
              name: 'foo',
              value: 'bar-{{uuid}}'
            },
            {
              name: 'foo2',
              value: 'Test2'
            },
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Original'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=bar-test-uuid; foo2=Test2'
          }
        ]
      });
    });

    test('Modify cookie header - regex enabled - multiple cookies', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          cookieHeaders: [
            {
              name: 'fo.*',
              value: 'Test',
              regexEnabled: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Original; foo2=Original2; foo3=Original3'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Test; foo2=Test; foo3=Test'
          }
        ]
      });
    });


    test('Modify cookie header - regex enabled - dynamic value', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          cookieHeaders: [
            {
              name: 'fo.*',
              value: 'bar-{{uuid}}',
              regexEnabled: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Original; foo2=Original2; foo3=Original3'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=bar-test-uuid; foo2=bar-test-uuid; foo3=bar-test-uuid'
          }
        ]
      });
    });

    test('Modify cookie header - Remove header', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          cookieHeaders: [
            {
              name: 'foo',
              value: ''
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Original'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: []
      });
    });

    test('Modify cookie header - regex enabled - Remove header', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          cookieHeaders: [
            {
              name: 'fo.*',
              value: '',
              regexEnabled: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Original'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: []
      });
    });

    test('Modify cookie header - Multiple profiles', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          cookieHeaders: [
            {
              name: 'foo',
              value: 'Profile1'
            }
          ]
        },
        // Last profile modification wins
        {
          ...EMPTY_PROFILE,
          cookieHeaders: [
            {
              name: 'foo',
              value: 'Profile2'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Original'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Profile2'
          }
        ]
      });
    });

    test('Modify cookie header - No modifications', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          cookieHeaders: []
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Original'
          }
        ]
      };
      const actual = modifyRequestHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        requestHeaders: [
          {
            name: 'cookie',
            value: 'foo=Original'
          }
        ]
      });
    });
  });

  describe('Modify set cookie headers', () => {
    test('Modify set cookie header - Override value without changing attribute', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'foo',
              value: 'Test',
              path: '/_/test'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Test; Path=/'
          }
        ]
      });
    });

    test('Modify set cookie header - regex mode - Override value without changing attribute', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'fo.*',
              value: 'Test',
              path: '/_/test',
              regexEnabled: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Test; Path=/'
          }
        ]
      });
    });

    test('Modify set cookie header - Override value and attribute', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'foo',
              value: 'Test',
              path: '/_/test',
              httpOnly: true,
              attributeOverride: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/; Secure'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Test; Path=/_/test; HttpOnly'
          }
        ]
      });
    });

    test('Modify set cookie header - dynamic value', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'foo',
              value: 'bar-{{uuid}}',
              path: '/_/test',
              httpOnly: true,
              attributeOverride: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/; Secure'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=bar-test-uuid; Path=/_/test; HttpOnly'
          }
        ]
      });
    });

    test('Modify set cookie header - regex enabled - Override value and attribute', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'fo.*',
              value: 'Test',
              path: '/_/test',
              regexEnabled: true,
              httpOnly: true,
              attributeOverride: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/; Secure'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Test; Path=/_/test; HttpOnly'
          }
        ]
      });
    });

    test('Modify set cookie header - regex enabled - dynamic value', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'fo.*',
              value: 'bar-{{uuid}}',
              path: '/_/test',
              regexEnabled: true,
              httpOnly: true,
              attributeOverride: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/; Secure'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=bar-test-uuid; Path=/_/test; HttpOnly'
          }
        ]
      });
    });

    test('Modify set-cookie header - Add new header', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'foo',
              value: 'Test'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: []
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Test'
          }
        ]
      });
    });

    test('Modify set-cookie header - Add new header - dynamic value', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'foo',
              value: 'bar-{{uuid}}'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: []
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=bar-test-uuid'
          }
        ]
      });
    });

    test('Modify set-cookie header - regex enabled - new header not added', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'fo.*',
              value: 'Test',
              regexEnabled: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: []
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual(undefined);
    });

    test('Modify set cookie header - multiple cookies', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'foo',
              value: 'Test'
            },
            {
              name: 'foo2',
              value: 'Test2'
            },
            {
              name: 'foo3',
              value: 'Test3'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Test; Path=/'
          },
          {
            name: 'set-cookie',
            value: 'foo2=Test2'
          },
          {
            name: 'set-cookie',
            value: 'foo3=Test3'
          }
        ]
      });
    });

    test('Modify set cookie header - regex enabled - multiple cookies', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'foo.*',
              value: 'Test',
              path: '/',
              attributeOverride: true,
              regexEnabled: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original'
          },
          {
            name: 'set-cookie',
            value: 'foo2=Original2'
          },
          {
            name: 'set-cookie',
            value: 'foo3=Original3'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Test; Path=/'
          },
          {
            name: 'set-cookie',
            value: 'foo2=Test; Path=/'
          },
          {
            name: 'set-cookie',
            value: 'foo3=Test; Path=/'
          }
        ]
      });
    });

    test('Modify set cookie header - Remove cookie', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'foo',
              value: ''
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=; Path=/'
          }
        ]
      });
    });

    test('Modify set cookie header - regex enabled - Remove cookie', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'fo.*',
              value: '',
              regexEnabled: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=; Path=/'
          }
        ]
      });
    });

    test('Modify set cookie header - Retain cookie, modify attributes', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'foo',
              value: '',
              httpOnly: true,
              retainExistingCookie: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; HttpOnly'
          }
        ]
      });
    });

    test('Modify set cookie header - regex enabled - Retain cookie, modify attributes', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'fo.*',
              value: '',
              httpOnly: true,
              regexEnabled: true,
              retainExistingCookie: true
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; HttpOnly'
          }
        ]
      });
    });

    test('Modify set-cookie header - Multiple profiles', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'foo',
              value: 'Profile1'
            }
          ]
        },
        // Last profile modification wins
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: [
            {
              name: 'foo',
              value: 'Profile2'
            }
          ]
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual({
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Profile2; Path=/'
          }
        ]
      });
    });

    test('Modify set-cookie header - No modifications', () => {
      const chromeLocal = {};
      const activeProfiles = [
        {
          ...EMPTY_PROFILE,
          setCookieHeaders: []
        }
      ];
      const details = {
        url: 'https://modheader.com/',
        responseHeaders: [
          {
            name: 'set-cookie',
            value: 'foo=Original; Path=/'
          }
        ]
      };
      const actual = modifyResponseHeaders({ chromeLocal, activeProfiles, details });

      expect(actual).toEqual(undefined);
    });
  });
});
