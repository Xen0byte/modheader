import chrome from 'selenium-webdriver/chrome';
import { Builder, Key } from 'selenium-webdriver';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import cookie from 'cookie';
import Bluebird from 'bluebird';
import 'chromedriver';
import { startServer, stopServer, getHeaders, getTestServerOrigin } from './utils/test-server.js';
import { packageExtension } from './utils/package-selenium.js';
import { PopupPage, ModifierType, FilterType } from './pages/popup-page.js';

expect.extend({ toMatchImageSnapshot });

jest.retryTimes(1);

describe('e2e test', () => {
  let driver;
  let baseUrl = 'chrome-extension://genoeibpchidkjfhbibobgbfkhefjfaj';
  let popupUrl;

  const INIT_PROFILE = {
    profiles: [
      {
        appendMode: false,
        backgroundColor: '#da3053',
        filters: [],
        headers: [{ enabled: true, name: '', value: '', comment: '' }],
        hideComment: true,
        respHeaders: [],
        shortTitle: '1',
        textColor: '#ffffff',
        title: 'Profile 1',
        urlReplacements: []
      }
    ]
  };

  beforeAll(async () => {
    startServer();
    const extensionPath = await packageExtension();
    const options = new chrome.Options()
      .addArguments('--window-size=800,600')
        .addArguments('--headless=chrome')
      .addExtensions(extensionPath);
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    popupUrl = `${baseUrl}/app.html`;
  });

  beforeEach(async () => {
    // Setup an initial profile
    await driver.get(`${baseUrl}/images/icon.png`);
    await driver.executeScript(`chrome.storage.local.set(${JSON.stringify(INIT_PROFILE)});`);
    await driver.executeScript(`localStorage.hideAddButtonTooltip = true;`);
    await Bluebird.delay(100);
  });

  afterAll(async () => {
    stopServer();
    if (driver) {
      await driver.quit();
    }
  });

  async function compareScreenshot(customSnapshotIdentifier) {
    await driver.actions().sendKeys(Key.ESCAPE);
    await driver.executeScript(`document.activeElement.blur()`);
    await Bluebird.delay(200);
    expect(await driver.takeScreenshot()).toMatchImageSnapshot({
      customSnapshotIdentifier,
      comparisonMethod: 'ssim',
      failureThreshold: 0.01,
      failureThresholdType: 'percent'
    });
  }

  describe('modifiers', () => {
    test('Extension successfully loaded', async () => {
      await driver.get(popupUrl);

      await compareScreenshot('successfully-loaded');
    });

    test('Add request header', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.setModifier({
        modifierType: ModifierType.REQUEST_HEADER,
        name: 'test',
        value: 'hello world'
      });
      await popupPage.addModifier(ModifierType.REQUEST_HEADER);
      await popupPage.setModifier({
        modifierType: ModifierType.REQUEST_HEADER,
        index: 1,
        name: 'test2',
        value: 'hello world 2'
      });

      await compareScreenshot('request-headers');

      const headers = await getHeaders(driver);
      expect(headers.requestHeaders.test).toEqual('hello world');
      expect(headers.requestHeaders.test2).toEqual('hello world 2');
    });

    test('Add response header', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.addModifier(ModifierType.RESPONSE_HEADER);
      await popupPage.setModifier({
        modifierType: ModifierType.RESPONSE_HEADER,
        name: 'test',
        value: 'hello world'
      });
      await popupPage.addModifier(ModifierType.RESPONSE_HEADER);
      await popupPage.setModifier({
        modifierType: ModifierType.RESPONSE_HEADER,
        index: 1,
        name: 'test2',
        value: 'hello world 2'
      });

      await compareScreenshot('response-headers');

      const headers = await getHeaders(driver);
      expect(headers.responseHeaders.test).toEqual('hello world');
      expect(headers.responseHeaders.test2).toEqual('hello world 2');
    });

    test('Add cookie modifier', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.addModifier(ModifierType.COOKIE_MODIFIER);
      await popupPage.setModifier({
        modifierType: ModifierType.COOKIE_MODIFIER,
        name: 'test',
        value: 'test-cookie-1'
      });
      await popupPage.addModifier(ModifierType.COOKIE_MODIFIER);
      await popupPage.setModifier({
        modifierType: ModifierType.COOKIE_MODIFIER,
        index: 1,
        name: 'test2',
        value: 'test-cookie-2'
      });

      await compareScreenshot('cookies');

      const headers = await getHeaders(driver);
      const parsedRequestCookie = cookie.parse(headers.requestHeaders.cookie);
      expect(parsedRequestCookie).toEqual(
        expect.objectContaining({
          test: 'test-cookie-1',
          test2: 'test-cookie-2'
        })
      );
    });

    test('Add set cookie modifier', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.addModifier(ModifierType.SET_COOKIE_MODIFIER);
      await popupPage.setModifier({
        modifierType: ModifierType.SET_COOKIE_MODIFIER,
        name: 'test',
        value: 'test-cookie-1'
      });
      await popupPage.addModifier(ModifierType.SET_COOKIE_MODIFIER);
      await popupPage.setModifier({
        modifierType: ModifierType.SET_COOKIE_MODIFIER,
        index: 1,
        name: 'test2',
        value: 'test-cookie-2'
      });

      await compareScreenshot('set-cookies');

      const headers = await getHeaders(driver);
      expect(headers.cookies.test).toEqual(expect.objectContaining({ value: 'test-cookie-1' }));
      expect(headers.cookies.test2).toEqual(expect.objectContaining({ value: 'test-cookie-2' }));
    });

    test('Add set cookie modifier - with attributes', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.addModifier(ModifierType.SET_COOKIE_MODIFIER);
      await popupPage.setModifier({
        modifierType: ModifierType.SET_COOKIE_MODIFIER,
        name: 'test3',
        value: 'test-cookie-3'
      });
      await popupPage.addCookieAttribute({ attributeName: 'domain' });
      await popupPage.addCookieAttribute({ attributeName: 'maxAge' });
      await popupPage.setCookieAttribute({ attributeName: 'maxAge', value: '3600' });
      await popupPage.addCookieAttribute({ attributeName: 'path' });
      await popupPage.setCookieAttribute({ attributeName: 'path', value: '/headers' });
      await popupPage.addCookieAttribute({ attributeName: 'secure' });
      await popupPage.addCookieAttribute({ attributeName: 'httpOnly' });
      await popupPage.addCookieAttribute({ attributeName: 'priority' });
      await popupPage.addCookieAttribute({ attributeName: 'sameSite' });

      await compareScreenshot('set-cookies-with-attributes');

      const headers = await getHeaders(driver);
      expect(headers.cookies.test3).toEqual({
        domain: 'localhost',
        expiry: expect.any(Number),
        httpOnly: true,
        name: 'test3',
        path: '/headers',
        sameSite: 'Strict',
        secure: true,
        value: 'test-cookie-3'
      });
    });

    test('Add url replacement', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.addModifier(ModifierType.URL_REPLACEMENT);
      await popupPage.setModifier({
        modifierType: ModifierType.URL_REPLACEMENT,
        name: 'https://bewisse.com/test',
        value: 'https://modheader.com/test'
      });
      await popupPage.addModifier(ModifierType.URL_REPLACEMENT);
      await popupPage.setModifier({
        modifierType: ModifierType.URL_REPLACEMENT,
        index: 1,
        name: 'https://bewisse.com/second-test',
        value: 'https://modheader.com/second-test'
      });

      await compareScreenshot('url-replacements');

      await driver.get('https://bewisse.com/test');
      expect(await driver.getCurrentUrl()).toEqual('https://modheader.com/test');
    });
  });

  describe('filters', () => {
    test('Add URL filter - URL matched', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.setModifier({
        modifierType: ModifierType.REQUEST_HEADER,
        name: 'request',
        value: 'test-request-header'
      });

      await popupPage.addModifier(ModifierType.RESPONSE_HEADER);
      await popupPage.setModifier({
        modifierType: ModifierType.RESPONSE_HEADER,
        name: 'response',
        value: 'test-response-header'
      });
      await popupPage.addFilter(FilterType.URL_FILTER);
      await popupPage.setFilter({
        filterType: FilterType.URL_FILTER,
        index: 0,
        urlRegex: `${getTestServerOrigin()}/*`
      });

      await compareScreenshot('request-headers-with-url-filter-matched');

      const headers = await getHeaders(driver);
      expect(headers.requestHeaders.request).toEqual('test-request-header');
      expect(headers.responseHeaders.response).toEqual('test-response-header');
    });

    test('Add URL filter - URL not matched', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.setModifier({
        modifierType: ModifierType.REQUEST_HEADER,
        name: 'request',
        value: 'test-request-header'
      });

      await popupPage.addModifier(ModifierType.RESPONSE_HEADER);
      await popupPage.setModifier({
        modifierType: ModifierType.RESPONSE_HEADER,
        name: 'response',
        value: 'test-response-header'
      });
      await popupPage.addFilter(FilterType.URL_FILTER);
      await popupPage.setFilter({
        filterType: FilterType.URL_FILTER,
        index: 0,
        urlRegex: `${getTestServerOrigin()}/unknown`
      });

      await compareScreenshot('request-headers-with-url-filter-not-matched');

      const headers = await getHeaders(driver);
      expect(headers.requestHeaders.request).toEqual(undefined);
      expect(headers.responseHeaders.response).toEqual(undefined);
    });

    test('Add exclude URL filter - Exclude URL matched', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.setModifier({
        modifierType: ModifierType.REQUEST_HEADER,
        name: 'request',
        value: 'test-request-header'
      });

      await popupPage.addModifier(ModifierType.RESPONSE_HEADER);
      await popupPage.setModifier({
        modifierType: ModifierType.RESPONSE_HEADER,
        name: 'response',
        value: 'test-response-header'
      });
      await popupPage.addFilter(FilterType.EXCLUDE_URL_FILTER);
      await popupPage.setFilter({
        filterType: FilterType.EXCLUDE_URL_FILTER,
        index: 0,
        urlRegex: `${getTestServerOrigin()}/*`
      });

      await compareScreenshot('request-headers-with-excluded-url-filter-matched');

      const headers = await getHeaders(driver);
      expect(headers.requestHeaders.request).toBeUndefined();
      expect(headers.responseHeaders.response).toBeUndefined();
    });

    test('Add exclude URL filter - Exclude URL not matched', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.setModifier({
        modifierType: ModifierType.REQUEST_HEADER,
        name: 'request',
        value: 'test-request-header'
      });

      await popupPage.addModifier(ModifierType.RESPONSE_HEADER);
      await popupPage.setModifier({
        modifierType: ModifierType.RESPONSE_HEADER,
        name: 'response',
        value: 'test-response-header'
      });
      await popupPage.addFilter(FilterType.EXCLUDE_URL_FILTER);
      await popupPage.setFilter({
        filterType: FilterType.EXCLUDE_URL_FILTER,
        index: 0,
        urlRegex: `${getTestServerOrigin()}/unknown`
      });

      await compareScreenshot('request-headers-with-excluded-url-filter-not-matched');

      const headers = await getHeaders(driver);
      expect(headers.requestHeaders.request).toEqual('test-request-header');
      expect(headers.responseHeaders.response).toEqual('test-response-header');
    });

    test('Add resource type filter - matched', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.setModifier({
        modifierType: ModifierType.REQUEST_HEADER,
        name: 'request',
        value: 'test-request-header'
      });

      await popupPage.addModifier(ModifierType.RESPONSE_HEADER);
      await popupPage.setModifier({
        modifierType: ModifierType.RESPONSE_HEADER,
        name: 'response',
        value: 'test-response-header'
      });
      await popupPage.addFilter(FilterType.RESOURCE_FILTER);
      await popupPage.setFilter({
        filterType: FilterType.RESOURCE_FILTER,
        index: 0,
        resourceTypes: ['xmlhttprequest']
      });

      await compareScreenshot('request-headers-with-resource-type-filter-matched');

      const headers = await getHeaders(driver);
      expect(headers.requestHeaders.request).toEqual('test-request-header');
      expect(headers.responseHeaders.response).toEqual('test-response-header');
    });

    test('Add resource type filter - not matched', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.setModifier({
        modifierType: ModifierType.REQUEST_HEADER,
        name: 'request',
        value: 'test-request-header'
      });

      await popupPage.addModifier(ModifierType.RESPONSE_HEADER);
      await popupPage.setModifier({
        modifierType: ModifierType.RESPONSE_HEADER,
        name: 'response',
        value: 'test-response-header'
      });
      await popupPage.addFilter(FilterType.RESOURCE_FILTER);
      await popupPage.setFilter({
        filterType: FilterType.RESOURCE_FILTER,
        index: 0,
        resourceTypes: ['main_frame']
      });

      await compareScreenshot('request-headers-with-resource-type-filter-not-matched');

      const headers = await getHeaders(driver);
      expect(headers.requestHeaders.request).toBeUndefined();
      expect(headers.responseHeaders.response).toBeUndefined();
    });

    test('Add tab filter', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.setModifier({
        modifierType: ModifierType.REQUEST_HEADER,
        name: 'request',
        value: 'test-request-header'
      });

      await popupPage.addModifier(ModifierType.RESPONSE_HEADER);
      await popupPage.setModifier({
        modifierType: ModifierType.RESPONSE_HEADER,
        name: 'response',
        value: 'test-response-header'
      });
      await popupPage.addFilter(FilterType.TAB_FILTER);

      await compareScreenshot('request-headers-with-tab-filter-matched');

      const matchedHeaders = await getHeaders(driver);
      expect(matchedHeaders.requestHeaders.request).toEqual('test-request-header');
      expect(matchedHeaders.responseHeaders.response).toEqual('test-response-header');

      const originalWindow = await driver.getWindowHandle();
      await driver.switchTo().newWindow('tab');
      const unmatchedHeaders = await getHeaders(driver);
      expect(unmatchedHeaders.requestHeaders.request).toBeUndefined();
      expect(unmatchedHeaders.responseHeaders.response).toBeUndefined();
      await driver.close();
      await driver.switchTo().window(originalWindow);
    });

    test('Add window filter', async () => {
      await driver.get(popupUrl);

      const popupPage = new PopupPage(driver);
      await popupPage.setModifier({
        modifierType: ModifierType.REQUEST_HEADER,
        name: 'request',
        value: 'test-request-header'
      });

      await popupPage.addModifier(ModifierType.RESPONSE_HEADER);
      await popupPage.setModifier({
        modifierType: ModifierType.RESPONSE_HEADER,
        name: 'response',
        value: 'test-response-header'
      });
      await popupPage.addFilter(FilterType.WINDOW_FILTER);

      await compareScreenshot('request-headers-with-window-filter-matched');

      const matchedHeaders = await getHeaders(driver);
      expect(matchedHeaders.requestHeaders.request).toEqual('test-request-header');
      expect(matchedHeaders.responseHeaders.response).toEqual('test-response-header');

      const originalWindow = await driver.getWindowHandle();
      await driver.switchTo().newWindow('tab');
      const matchedHeadersInDifferentTab = await getHeaders(driver);
      expect(matchedHeadersInDifferentTab.requestHeaders.request).toEqual('test-request-header');
      expect(matchedHeadersInDifferentTab.responseHeaders.response).toEqual('test-response-header');
      await driver.close();
      await driver.switchTo().window(originalWindow);

      await driver.switchTo().newWindow('window');
      const unmatchedHeaders = await getHeaders(driver);
      expect(unmatchedHeaders.requestHeaders.request).toBeUndefined();
      expect(unmatchedHeaders.responseHeaders.response).toBeUndefined();
      await driver.close();
      await driver.switchTo().window(originalWindow);
    });
  });
});
