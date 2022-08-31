import { By, until } from 'selenium-webdriver';
import Bluebird from 'bluebird';
import 'chromedriver';
import { TestUtils } from '../utils/test-utils.js';

export const ModifierType = {
  REQUEST_HEADER: {
    id: 'request-header'
  },
  RESPONSE_HEADER: {
    id: 'response-header'
  },
  COOKIE_MODIFIER: {
    id: 'cookie-modifier'
  },
  SET_COOKIE_MODIFIER: {
    id: 'set-cookie-modifier'
  },
  CSP_MODIFIER: {
    id: 'csp-modifier'
  },
  URL_REPLACEMENT: {
    id: 'url-replacement'
  }
};

export const FilterType = {
  TAB_FILTER: {
    id: 'tab-filter'
  },
  TAB_GROUP_FILTER: {
    id: 'tab-group-filter'
  },
  WINDOW_FILTER: {
    id: 'window-filter'
  },
  URL_FILTER: {
    id: 'url-filter'
  },
  EXCLUDE_URL_FILTER: {
    id: 'exclude-url-filter'
  },
  RESOURCE_FILTER: {
    id: 'resource-filter'
  }
};

export class PopupPage {
  constructor(driver) {
    this.driver = driver;
    this.testUtils = new TestUtils(this.driver);
  }

  async setModifier({ modifierType, index = 0, name, value }) {
    const modifiersContainer = await this.testUtils.findBy(By.id(modifierType.id));
    if (name) {
      const names = await modifiersContainer.findElements(By.name('header-name'));
      await names[index].sendKeys(name);
    }
    if (value) {
      const values = await modifiersContainer.findElements(By.name('header-value'));
      await values[index].sendKeys(value);
    }
  }

  async addModifier(modifierType) {
    await this.testUtils.clickBy(By.id('add-button'));
    await this.testUtils.clickBy(By.id(`add-${modifierType.id}`));
  }

  async addCookieAttribute({ attributeName }) {
    const modifiersContainer = await this.testUtils.findBy(
      By.id(ModifierType.SET_COOKIE_MODIFIER.id)
    );
    const cookieAttributesButton = await modifiersContainer.findElement(
      By.xpath(`//*[@data-field-name="cookie-attribute"]`)
    );
    await cookieAttributesButton.click();
    await Bluebird.delay(100);
    const attributeButton = await modifiersContainer.findElement(
      By.xpath(`//*[@data-field="${attributeName}"]`)
    );
    await attributeButton.click();
    await Bluebird.delay(100);
  }

  async setCookieAttribute({ attributeName, value }) {
    const modifiersContainer = await this.testUtils.findBy(
      By.id(ModifierType.SET_COOKIE_MODIFIER.id)
    );
    const attributeChip = await modifiersContainer.findElement(
      By.xpath(`//*[@data-field-name="${attributeName}"]`)
    );
    await attributeChip.click();
    await Bluebird.delay(100);
    const input = await modifiersContainer.findElement(
      By.xpath(`//*[@data-field-name='${attributeName}']//input`)
    );
    await this.driver.wait(until.elementIsEnabled(input));
    await input.clear();
    await input.sendKeys(value);
    await input.submit();
    await Bluebird.delay(100);
  }

  async setFilter({ filterType, index = 0, urlRegex, resourceTypes }) {
    const filtersContainer = await this.testUtils.findBy(By.id(filterType.id));
    if (urlRegex) {
      const urlRegexElem = await filtersContainer.findElements(By.name('url-regex'));
      await urlRegexElem[index].sendKeys(urlRegex);
    }
    if (resourceTypes) {
      for (const type of resourceTypes) {
        const resourceTypeButtons = await filtersContainer.findElements(
          By.xpath(`//*[@data-field-name="resource-type"]`)
        );
        await resourceTypeButtons[index].click();
        await Bluebird.delay(100);
        await this.testUtils.clickBy(By.xpath(`//*[@data-resource-type="${type}"]`));
        await Bluebird.delay(100);
      }
    }
  }

  async addFilter(filterType) {
    await this.testUtils.clickBy(By.id('add-button'));
    await this.testUtils.clickBy(By.id(`add-${filterType.id}`));
  }
}
