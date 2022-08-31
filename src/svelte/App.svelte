<script>
  import lodashCloneDeep from 'lodash/cloneDeep';
  import Filters from './Filters.svelte';
  import Modifiers from './Modifiers.svelte';
  import CloudBackupDialog from './CloudBackupDialog.svelte';
  import { FilterType } from '../js/filter.js';
  import { ModifierType } from '../js/modifier-type.js';
  import TopBarAddMenu from './TopBarAddMenu.svelte';
  import TopBarMoreMenu from './TopBarMoreMenu.svelte';
  import AdvancedCsp from './AdvancedCsp.svelte';
  import {
    datasource,
    datasourceLoader,
    profile,
    AppLayout,
    ExportDialog,
    ImportDialog,
    LiveProfileUrl,
    LiveProfileUrlDialog,
    SignInRequiredDialog,
    UpgradeDialog,
    TopBar
  } from '@modheader/core';

  const { selectedProfile } = profile;
  const { isPaused } = datasource;

  export let isFullscreen;
</script>

{#await datasourceLoader.init() then initResult}
  <AppLayout {isFullscreen}>
    <div class:disabled={$isPaused} class="main-content">
      <LiveProfileUrl profile={$selectedProfile} />
      {#if $selectedProfile.headers.length > 0}
        <Modifiers
          modifierType={ModifierType.REQUEST_HEADER}
          modifiers={lodashCloneDeep($selectedProfile.headers)}
        />
      {/if}
      {#if $selectedProfile.respHeaders.length > 0}
        <Modifiers
          modifierType={ModifierType.RESPONSE_HEADER}
          modifiers={lodashCloneDeep($selectedProfile.respHeaders)}
        />
      {/if}
      {#if $selectedProfile.cookieHeaders.length > 0}
        <Modifiers
          modifierType={ModifierType.COOKIE_MODIFIER}
          modifiers={lodashCloneDeep($selectedProfile.cookieHeaders)}
        />
      {/if}
      {#if $selectedProfile.setCookieHeaders.length > 0}
        <Modifiers
          modifierType={ModifierType.SET_COOKIE_MODIFIER}
          modifiers={lodashCloneDeep($selectedProfile.setCookieHeaders)}
        />
      {/if}
      {#if $selectedProfile.cspHeaders.length > 0}
        <Modifiers
          modifierType={ModifierType.CSP_MODIFIER}
          modifiers={lodashCloneDeep($selectedProfile.cspHeaders)}
        >
          <AdvancedCsp slot="bottom-slot" />
        </Modifiers>
      {/if}
      {#if $selectedProfile.urlReplacements.length > 0}
        <Modifiers
          modifierType={ModifierType.URL_REPLACEMENT}
          modifiers={lodashCloneDeep($selectedProfile.urlReplacements)}
        />
      {/if}
      {#if $selectedProfile.tabFilters.length || $selectedProfile.tabGroupFilters.length || $selectedProfile.windowFilters.length || $selectedProfile.urlFilters.length || $selectedProfile.excludeUrlFilters.length || $selectedProfile.resourceFilters.length || $selectedProfile.timeFilters.length}
        <div class="filter-background">
          <Filters
            id="tab-filter"
            filters={lodashCloneDeep($selectedProfile.tabFilters)}
            filterType={FilterType.TABS}
            class="extra-gap"
          />
          <Filters
            id="tab-group-filter"
            filters={lodashCloneDeep($selectedProfile.tabGroupFilters)}
            filterType={FilterType.TAB_GROUPS}
            class="extra-gap"
          />
          <Filters
            id="window-filter"
            filters={lodashCloneDeep($selectedProfile.windowFilters)}
            filterType={FilterType.WINDOWS}
            class="extra-gap"
          />
          <Filters
            id="url-filter"
            filters={lodashCloneDeep($selectedProfile.urlFilters)}
            filterType={FilterType.URLS}
            class="extra-gap"
          />
          <Filters
            id="exclude-url-filter"
            filters={lodashCloneDeep($selectedProfile.excludeUrlFilters)}
            filterType={FilterType.EXCLUDE_URLS}
            class="extra-gap"
          />
          <Filters
            id="resource-filter"
            filters={lodashCloneDeep($selectedProfile.resourceFilters)}
            filterType={FilterType.RESOURCE_TYPES}
            class="extra-gap"
          />
          <Filters
            id="time-filter"
            filters={lodashCloneDeep($selectedProfile.timeFilters)}
            filterType={FilterType.TIME}
            class="extra-gap"
          />
        </div>
      {/if}
    </div>

    <TopBar>
      <svelte:fragment slot="add-button"><TopBarAddMenu /></svelte:fragment>
      <svelte:fragment slot="more-button"><TopBarMoreMenu /></svelte:fragment>
    </TopBar>
  </AppLayout>
  <CloudBackupDialog />
  <ExportDialog />
  <ImportDialog />
  <LiveProfileUrlDialog />
  <UpgradeDialog>
    <p>
      With ModHeader Pro, you can have >3 profiles, import auto-sync profile, modify individual
      cookies, create customize autocomplete entries, add tab group, window, and time filters.
    </p>
  </UpgradeDialog>
  <SignInRequiredDialog />
{/await}

<style module>
  .main-content {
    position: absolute;
    top: 48px;
    left: 0;
    right: 0;
  }

  .filter-background {
    background-color: var(--filter-background);
  }

  .extra-gap {
    margin: 2px;
  }
</style>
