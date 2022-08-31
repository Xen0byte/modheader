<script>
  import Button, { Label } from '@smui/button';
  import { BaseDialog, profile, toast } from '@modheader/core';
  import Textfield from '@smui/textfield';
  import { toCspString } from '../js/csp.js';

  const { selectedProfile } = profile;
  let dialogVisible;
  let parseCspString = '';

  function convertToCspString(cspHeaders) {
    const cspMap = {};
    for (const policy of cspHeaders) {
      if (policy.enabled) {
        cspMap[policy.name] = policy.value;
      }
    }
    return toCspString(cspMap);
  }

  async function convertFromCspString() {
    const cspHeaders = [];
    for (const directive of parseCspString.split(';')) {
      const trimmedDirective = directive.trim();
      const firstSpace = trimmedDirective.indexOf(' ');
      if (firstSpace >= 0) {
        cspHeaders.push({
          enabled: true,
          name: trimmedDirective.slice(0, firstSpace),
          value: trimmedDirective.slice(firstSpace + 1)
        });
      } else {
        cspHeaders.push({
          enabled: true,
          name: trimmedDirective
        });
      }
    }
    await profile.updateProfile({ cspHeaders });
    dialogVisible = false;
  }

  $: cspString = convertToCspString($selectedProfile.cspHeaders);
</script>

<div class="csp-container">
  {#if cspString}Content-Security-Policy: <code>{cspString}</code>{/if}
  <div class="d-flex mt-1">
    <Button
      variant="raised"
      class="me-1"
      on:click={() => {
        navigator.clipboard.writeText(cspString);
        toast.showMessage('Content-Security-Policy value has been copied to your clipboard');
      }}>Copy CSP</Button
    >
    <Button
      variant="raised"
      on:click={() => {
        dialogVisible = true;
        parseCspString = cspString;
      }}>Parse CSP</Button
    >
  </div>
</div>

<BaseDialog bind:open={dialogVisible} title="Content-Security-Policy parser">
  <div class="csp-dialog-content">
    <Textfield
      textarea
      fullwidth
      class="csp-dialog-textfield"
      bind:value={parseCspString}
      label="Content-Security-Policy value"
    />
  </div>
  <svelte:fragment slot="footer">
    <Button on:click={convertFromCspString}>
      <Label>Parse</Label>
    </Button>
  </svelte:fragment>
</BaseDialog>

<style module>
  .csp-container {
    margin: 5px;
  }

  .csp-dialog-content {
    padding-top: 5px;
  }

  .csp-dialog-textfield {
    margin: 5px;
    width: 90%;
  }
</style>
