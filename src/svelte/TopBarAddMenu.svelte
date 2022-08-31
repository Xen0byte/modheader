<script>
  import MenuSurface from '@smui/menu-surface';
  import List, { Item, Separator } from '@smui/list';
  import IconButton from '@smui/icon-button';
  import { mdiPlus } from '@mdi/js';
  import { dialog, identity, profile, tabs, LockIcon, MdiIcon } from '@modheader/core';
  import { addHeader } from '../js/header.js';
  import { addUrlRedirect } from '../js/url-redirect.js';
  import {
    addUrlFilter,
    addResourceFilter,
    addTabFilter,
    addTabGroupFilter,
    addWindowFilter,
    addTimeFilter
  } from '../js/filter.js';

  const { selectedProfile, updateProfile, buttonColor } = profile;
  const { isProUser, signedInUser } = identity;
  const { showUpgradeRequired } = dialog;

  async function updateProfileAndClose(profile) {
    await updateProfile(profile);
    addMenu.setOpen(false);
  }

  let addMenu;
</script>

<div>
  <IconButton dense on:click={() => addMenu.setOpen(true)} title="Add" id="add-button">
    <MdiIcon size="24" icon={mdiPlus} color={$buttonColor} />
  </IconButton>
  <MenuSurface
    bind:this={addMenu}
    class="add-menu"
    quickOpen={true}
    anchor={true}
    anchorMargin={{ top: 48, right: 0, bottom: 0, left: $signedInUser ? -223 : -233 }}
  >
    <div class="add-menu-container">
      <List>
        <Item
          id="add-request-header"
          on:SMUI:action={() =>
            updateProfileAndClose({
              headers: addHeader($selectedProfile.headers)
            })}
        >
          Request header
        </Item>
        <Item
          id="add-response-header"
          on:SMUI:action={() =>
            updateProfileAndClose({
              respHeaders: addHeader($selectedProfile.respHeaders)
            })}
        >
          Response header
        </Item>
        <Item
          id="add-cookie-modifier"
          on:SMUI:action={() => {
            if ($isProUser) {
              updateProfileAndClose({
                cookieHeaders: addHeader($selectedProfile.cookieHeaders)
              });
            } else {
              showUpgradeRequired(
                'Upgrade to Pro to modify individual cookies in the request and response'
              );
            }
          }}
        >
          Cookie request
          <LockIcon />
        </Item>
        <Item
          id="add-set-cookie-modifier"
          on:SMUI:action={() => {
            if ($isProUser) {
              updateProfileAndClose({
                setCookieHeaders: addHeader($selectedProfile.setCookieHeaders)
              });
            } else {
              showUpgradeRequired(
                'Upgrade to Pro to modify individual cookies in the request and response'
              );
            }
          }}
        >
          Set-Cookie response
          <LockIcon />
        </Item>
        <Item
          id="add-csp-modifier"
          on:SMUI:action={() => {
            if ($isProUser) {
              updateProfileAndClose({
                cspHeaders: addHeader($selectedProfile.cspHeaders)
              });
            } else {
              showUpgradeRequired('Upgrade to Pro to modify content security policy header');
            }
          }}
        >
          Content security policy
          <LockIcon />
        </Item>
        <Item
          id="add-url-replacement"
          on:SMUI:action={async () =>
            updateProfileAndClose({
              urlReplacements: await addUrlRedirect($selectedProfile.urlReplacements)
            })}
        >
          Redirect URL
        </Item>
        <Separator />
        <div class="caption fst-italic mx-1 mt-2">Want more modifications?</div>
        <Item on:SMUI:action={() => tabs.openUrl({ path: '/modresponse' })}
          ><img src="images/modresponse.png" alt="" class="me-1" width="24" height="24" /> Try ModResponse</Item
        >
      </List>
      <div class="grid-border" />
      <List>
        <Item
          id="add-tab-filter"
          on:SMUI:action={async () =>
            updateProfileAndClose({
              tabFilters: await addTabFilter($selectedProfile.tabFilters)
            })}>Tab filter</Item
        >
        <Item
          id="add-tab-group-filter"
          disabled={['firefox', 'opera'].includes(process.env.BROWSER)}
          title={['firefox', 'opera'].includes(process.env.BROWSER)
            ? 'Tab group is not yet supported in this browser'
            : ''}
          on:SMUI:action={async () => {
            if ($isProUser) {
              await updateProfileAndClose({
                tabGroupFilters: await addTabGroupFilter($selectedProfile.tabGroupFilters)
              });
            } else {
              showUpgradeRequired(
                'Upgrade to Pro to enable filtering by tab group, by window, by time, and more!'
              );
            }
          }}
        >
          Tab group filter
          <LockIcon />
        </Item>

        <Item
          id="add-window-filter"
          on:SMUI:action={async () => {
            if ($isProUser) {
              await updateProfileAndClose({
                windowFilters: await addWindowFilter($selectedProfile.windowFilters)
              });
            } else {
              showUpgradeRequired(
                'Upgrade to Pro to enable filtering by window, by tab group, by time, and more!'
              );
            }
          }}
        >
          Window filter
          <LockIcon />
        </Item>
        <Item
          id="add-url-filter"
          on:SMUI:action={async () =>
            updateProfileAndClose({
              urlFilters: await addUrlFilter($selectedProfile.urlFilters)
            })}>URL filter</Item
        >
        <Item
          id="add-exclude-url-filter"
          on:SMUI:action={async () =>
            updateProfileAndClose({
              excludeUrlFilters: await addUrlFilter($selectedProfile.excludeUrlFilters)
            })}>Exclude URL filter</Item
        >
        <Item
          id="add-resource-filter"
          on:SMUI:action={async () =>
            updateProfileAndClose({
              resourceFilters: await addResourceFilter($selectedProfile.resourceFilters)
            })}>Resource filter</Item
        >

        <Item
          id="add-time-filter"
          on:SMUI:action={async () => {
            if ($isProUser) {
              await updateProfileAndClose({
                timeFilters: addTimeFilter($selectedProfile.timeFilters)
              });
            } else {
              showUpgradeRequired(
                'Upgrade to Pro to enable filtering by window, by tab group, by time, and more!'
              );
            }
          }}
        >
          Time filter
          <LockIcon />
        </Item>
      </List>
    </div>
  </MenuSurface>
</div>

<style module>
  .add-menu {
    width: 460px;
  }

  .add-menu-container {
    display: grid;
    grid-template-columns: auto 1px auto;
  }

  .grid-border {
    border-left: 1px solid var(--grid-separator-color);
    margin: 8px 0;
  }
</style>
