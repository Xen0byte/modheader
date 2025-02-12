<script>
  import IconButton from '@smui/icon-button';
  import Menu from '@smui/menu';
  import List, { Separator, Item, Label, Text } from '@smui/list';
  import {
    mdiCommentCheckOutline,
    mdiCommentRemoveOutline,
    mdiContentCopy,
    mdiArrowExpand,
    mdiDotsVertical,
    mdiClose,
    mdiArrowUp,
    mdiArrowDown
  } from '@mdi/js';
  import lodashOmit from 'lodash/omit.js';
  import lodashClone from 'lodash/clone.js';
  import { createEventDispatcher } from 'svelte';
  import { profile, MdiIcon } from '@modheader/core';
  import ExpandHeaderDialog from './ExpandHeaderDialog.svelte';
  import { AppendMode } from '../js/append-mode.js';

  const { selectedProfile } = profile;
  const dispatch = createEventDispatcher();

  function expandEditor() {
    selectedHeader = lodashClone(selectedHeader);
    dialog.open();
  }

  function dispatchUpdate(header) {
    dispatch('update', { headerIndex: selectedHeaderIndex, header });
    moreHeaderMenu.setOpen(false);
  }

  function dispatchSwap({ index1, index2 }) {
    dispatch('swap', { index1, index2 });
    moreHeaderMenu.setOpen(false);
  }

  export let modifierHandler;
  export let selectedHeaderIndex;
  export let selectedHeader;
  export let modifiers;
  let dialog;
  let moreHeaderMenu;
</script>

<ExpandHeaderDialog
  bind:this={dialog}
  nameLabel={modifierHandler.nameLabel}
  on:save={(event) => dispatchUpdate(event.detail)}
  {selectedHeader}
  title={modifierHandler.title}
  valueLabel={modifierHandler.valueLabel}
/>

<div>
  <IconButton
    aria-label="Expand"
    class="small-icon-button data-table-cell flex-fixed-icon"
    dense
    on:click={() => {
      moreHeaderMenu.setOpen(true);
    }}
  >
    <MdiIcon color="#666" icon={mdiDotsVertical} size="24" />
  </IconButton>

  <Menu bind:this={moreHeaderMenu}>
    <List>
      <Item on:SMUI:action={() => expandEditor()}>
        <MdiIcon class="icon-with-text" color="#666" icon={mdiArrowExpand} size="24" />
        <Text>Expand</Text>
      </Item>
      <Item on:SMUI:action={() => dispatch('copy', selectedHeaderIndex)}>
        <MdiIcon class="icon-with-text" color="#666" icon={mdiContentCopy} size="24" />
        <Text>Duplicate</Text>
      </Item>
      <Item on:SMUI:action={() => dispatchUpdate({ ...selectedHeader, value: '' })}>
        <MdiIcon class="icon-with-text" color="#666" icon={mdiClose} size="24" />
        <Text>Clear value</Text>
      </Item>
      <Item
        on:SMUI:action={() => {
          profile.updateProfile({
            hideComment: !$selectedProfile.hideComment
          });
        }}
      >
        <MdiIcon
          class="icon-with-text"
          size="24"
          icon={$selectedProfile.hideComment ? mdiCommentCheckOutline : mdiCommentRemoveOutline}
          color="#666"
        />
        {$selectedProfile.hideComment ? 'Show comment' : 'Hide comment'}
      </Item>

      <Separator nav />
      <Item
        on:SMUI:action={() =>
          dispatchSwap({ index1: selectedHeaderIndex, index2: selectedHeaderIndex + 1 })}
        disabled={modifiers.length === 0 || selectedHeaderIndex >= modifiers.length - 1}
      >
        <MdiIcon class="icon-with-text" color="#666" icon={mdiArrowDown} size="24" />
        <Text>Move down</Text>
      </Item>
      <Item
        on:SMUI:action={() =>
          dispatchSwap({ index1: selectedHeaderIndex, index2: selectedHeaderIndex - 1 })}
        disabled={modifiers.length === 0 || selectedHeaderIndex === 0}
      >
        <MdiIcon class="icon-with-text" color="#666" icon={mdiArrowUp} size="24" />
        <Text>Move up</Text>
      </Item>
      {#if modifierHandler.supportAppendMode}
        <Separator nav />
        {#if selectedHeader.appendMode}
          <Item on:SMUI:action={() => dispatchUpdate(lodashOmit(selectedHeader, ['appendMode']))}>
            <Label>Clear append mode</Label>
          </Item>
        {:else}
          <Item
            on:SMUI:action={() =>
              dispatchUpdate({ ...selectedHeader, appendMode: AppendMode.APPEND })}
          >
            <Label>Append instead of override</Label>
          </Item>
        {/if}
      {/if}
    </List>
  </Menu>
</div>

<style module>
  .icon-with-text {
    margin-right: 4px;
  }
</style>
