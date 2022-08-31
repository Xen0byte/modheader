<script>
  import { profile } from '@modheader/core';
  import { toCspString } from '../js/csp.js';

  const { selectedProfile } = profile;

  function convertToCspString(cspHeaders) {
    const cspMap = {};
    for (const policy of cspHeaders) {
      if (policy.enabled && policy.value) {
        cspMap[policy.name] = policy.value;
      }
    }
    return toCspString(cspMap);
  }
</script>

<div class="csp-container">
  Content-Security-Policy: <code>{convertToCspString($selectedProfile.cspHeaders)}</code>
</div>

<style module>
  .csp-container {
    margin: 5px;
  }
</style>
