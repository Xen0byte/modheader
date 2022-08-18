import { v4 as uuidv4 } from 'uuid';

function getDynamicValue({ command, url, oldValue }) {
  switch (command) {
    case 'uuid':
      return uuidv4();
    case 'url':
      return url;
    case 'url_origin':
      return new URL(url).origin;
    case 'url_hostname':
      return new URL(url).hostname;
    case 'url_path':
      return new URL(url).pathname;
    case 'existing_value':
      return oldValue;
    case 'timestamp':
      return Date.now();
    default:
      return '';
  }
}

export function evaluateValue({ value, url, oldValue }) {
  let subStartIndex = value.indexOf('{{');
  if (value && subStartIndex >= 0) {
    let subEndIndex = value.indexOf('}}');
    if (subEndIndex > subStartIndex) {
      const command = value.substring(subStartIndex + 2, subEndIndex);
      const subValue = getDynamicValue({ command, url, oldValue });
      return evaluateValue({
        value: `${value.substring(0, subStartIndex)}${subValue}${value.substring(subEndIndex + 2)}`,
        url,
        oldValue
      });
    }
  }
  return value;
}
