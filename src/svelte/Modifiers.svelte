<script>
  import IconButton from '@smui/icon-button';
  import Checkbox from '@smui/checkbox';
  import { mdiClose, mdiRegex } from '@mdi/js';
  import lodashClone from 'lodash/clone.js';
  import lodashDebounce from 'lodash/debounce.js';
  import { fly } from 'svelte/transition';
  import ModifiersMoreMenu from './ModifiersMoreMenu.svelte';
  import { profile, toast, utils, Autocomplete, MdiIcon } from '@modheader/core';
  import HeaderMoreMenu from './HeaderMoreMenu.svelte';
  import { MODIFIER_TYPES } from '../js/modifier-handler.js';

  const { selectedProfile } = profile;
  export let modifierType;
  export let modifiers;
  let allChecked;
  let allUnchecked;

  function copy(index) {
    modifiers = [
      ...modifiers.slice(0, index),
      lodashClone(modifiers[index]),
      ...modifiers.slice(index)
    ];
    refreshModifiers();
  }

  function refreshModifiers() {
    MODIFIER_TYPES[modifierType].refreshHandler(modifiers);
    allChecked = modifiers.every((h) => h.enabled);
    allUnchecked = modifiers.every((h) => !h.enabled);
  }

  function toggleAll() {
    if (!allChecked) {
      modifiers.forEach((h) => (h.enabled = true));
    } else {
      modifiers.forEach((h) => (h.enabled = false));
    }
    refreshModifiers();
  }

  const refreshModifiersDebounce = lodashDebounce(refreshModifiers, 500, {
    leading: true,
    trailing: true
  });
  $: modifiers, refreshModifiersDebounce();
  $: modifierHandler = MODIFIER_TYPES[modifierType];
  $: customAutocomplete =
    modifierHandler &&
    $selectedProfile &&
    $selectedProfile[modifierHandler.customAutocompleteFieldName];

  selectedProfile.subscribe(() => {
    refreshModifiersDebounce.cancel();
  });
</script>

{#if modifierHandler.autocompleteListId && modifierHandler.autocompleteNames}
  <datalist id={modifierHandler.autocompleteListId}>
    {#if customAutocomplete && customAutocomplete.autocompleteName.length > 0}
      {#each customAutocomplete.autocompleteName as item}
        <option value={item} />
      {/each}
    {/if}
    {#each modifierHandler.autocompleteNames as item}
      <option value={item} />
    {/each}
  </datalist>
{/if}

{#if customAutocomplete && customAutocomplete.autocompleteName}
  <datalist id="{modifierHandler.customAutocompleteFieldName}-name">
    {#each customAutocomplete.autocompleteName as item}
      <option value={item} />
    {/each}
  </datalist>
{/if}

{#if customAutocomplete && customAutocomplete.autocompleteValue}
  <datalist id="{modifierHandler.customAutocompleteFieldName}-value">
    {#each customAutocomplete.autocompleteValue as item}
      <option value={item} />
    {/each}
  </datalist>
{/if}

<div class="data-table extra-gap" id={modifierType} transition:fly>
  <div class="data-table-row data-table-title-row">
    <Checkbox
      class="data-table-cell flex-fixed-icon"
      bind:checked={allChecked}
      indeterminate={!allChecked && !allUnchecked}
      on:click={() => toggleAll()}
      disabled={modifiers.length === 0}
    />
    <div class="data-table-title data-table-cell flex-grow">{modifierHandler.title}</div>
    <div class="data-table-cell" />
    <div class="data-table-cell">
      <ModifiersMoreMenu
        {modifierHandler}
        {modifiers}
        on:refresh={(event) => {
          modifiers = event.detail;
          refreshModifiers();
        }}
      />
    </div>
  </div>
  {#each modifiers as modifier, modifierIndex}
    <div class="data-table-row" class:data-table-row-unchecked={!modifier.enabled}>
      <Checkbox
        class="data-table-cell flex-fixed-icon"
        bind:checked={modifier.enabled}
        on:change={refreshModifiers}
        indeterminate={false}
      />
      <Autocomplete
        name="header-name"
        list={modifier.name
          ? modifierHandler.autocompleteListId
          : `${modifierHandler.customAutocompleteFieldName}-name`}
        bind:value={modifier.name}
        on:change={refreshModifiers}
        selectAllOnFocus={true}
        placeholder={modifierHandler.nameLabel}
      />
      <Autocomplete
        name="header-value"
        list={`${modifierHandler.customAutocompleteFieldName}-value`}
        bind:value={modifier.value}
        on:change={refreshModifiers}
        selectAllOnFocus={true}
        placeholder={modifierHandler.valueLabel}
      />
      {#if !$selectedProfile.hideComment}
        <Autocomplete
          name="header-comment"
          bind:value={modifier.comment}
          on:change={refreshModifiers}
          placeholder="Comment"
        />
      {/if}

      {#if modifierHandler.supportRegexMode}
        <IconButton
          dense
          aria-label="Regex"
          title={modifier.regexEnabled ? 'Regex matching enabled' : 'Regex matching disabled'}
          class="small-icon-button data-table-cell flex-fixed-icon me-1 {modifier.regexEnabled
            ? 'mdc-ripple-upgraded--background-focused mdc-ripple-upgraded--foreground-activation'
            : ''}"
          on:click={async () => {
            modifier.regexEnabled = !modifier.regexEnabled;
            if (modifier.regexEnabled) {
              toast.showMessage('Regex name matching enabled');
            } else {
              toast.showMessage('Regex name matching disabled');
            }
          }}
        >
          <MdiIcon size="24" icon={mdiRegex} color="#666" />
        </IconButton>
      {/if}
      <IconButton
        dense
        aria-label="Delete"
        class="small-icon-button data-table-cell flex-fixed-icon"
        on:click={() => modifierHandler.removeHandler(modifierIndex)}
      >
        <MdiIcon size="24" icon={mdiClose} color="red" />
      </IconButton>
      <HeaderMoreMenu
        {modifierHandler}
        selectedHeaderIndex={modifierIndex}
        selectedHeader={modifier}
        {modifiers}
        on:swap={(e) => {
          const { index1, index2 } = e.detail;
          modifiers = utils.swap(modifiers, index1, index2);
          refreshModifiers();
        }}
        on:copy={(e) => copy(e.detail)}
        on:update={(e) => {
          modifiers[e.detail.headerIndex] = e.detail.header;
          refreshModifiers();
        }}
      />
    </div>
    {#if modifierHandler.advancedComponent}
      <div class:data-table-row-unchecked={!modifier.enabled}>
        <svelte:component
          this={modifierHandler.advancedComponent}
          {modifier}
          on:change={refreshModifiers}
        />
      </div>
    {/if}
  {/each}
  <slot name="bottom-slot" />
</div>
