<script>
  import Button, { Label } from '@smui/button';
  import { BaseDialog } from '@modheader/core';
  import Textfield from '@smui/textfield';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  export let selectedHeader;
  export let title;
  export let nameLabel;
  export let valueLabel;
  let dialogVisible;

  export function open() {
    dialogVisible = true;
  }

  function saveHeader() {
    dispatch('save', selectedHeader);
  }

  $: !dialogVisible && saveHeader();
</script>

{#if dialogVisible}
  <BaseDialog bind:open={dialogVisible} {title}>
    <div class="expand-header-dialog-content">
      {#if selectedHeader}
        <Textfield
          textarea
          fullwidth
          class="expand-header-dialog-textfield"
          bind:value={selectedHeader.name}
          label={nameLabel}
        />
        <Textfield
          textarea
          fullwidth
          class="expand-header-dialog-textfield"
          bind:value={selectedHeader.value}
          label={valueLabel}
        />
        <Textfield
          textarea
          fullwidth
          class="expand-header-dialog-textfield"
          bind:value={selectedHeader.comment}
          label="Comment"
        />
      {/if}
    </div>
    <svelte:fragment slot="footer">
      <Button on:click={() => (dialogVisible = false)}>
        <Label>Done</Label>
      </Button>
    </svelte:fragment>
  </BaseDialog>
{/if}

<style module>
  .expand-header-dialog-content {
    padding-top: 5px;
  }

  .expand-header-dialog-textfield {
    margin: 5px;
    width: 90%;
  }
</style>
