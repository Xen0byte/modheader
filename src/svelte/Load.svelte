<script>
  import lodashIsArray from 'lodash/isArray.js';
  import { profile, storageWriter } from '@modheader/core';
  import { initProfileHooks } from '../js/profile-hook.js';

  initProfileHooks();
  let isDone;
  let errorCaught;
  let loadedProfile;
  let profileJson = '{}';

  function getUrl(profile) {
    const url = new URL('https://webdriver.modheader.com/load');
    try {
      url.searchParams.set('profile', JSON.stringify(JSON.parse(profile)));
    } catch (err) {
      console.error(err);
      // Ignore
    }
    return url.href;
  }

  function isValid(profile) {
    try {
      JSON.parse(profile);
      return true;
    } catch (err) {
      return false;
    }
  }

  async function run() {
    const params = new URL(document.location).searchParams;
    const encodedProfile = params.get('profile');
    if (encodedProfile) {
      const importedProfile = JSON.parse(encodedProfile);
      const importedProfiles = lodashIsArray(importedProfile) ? importedProfile : [importedProfile];
      profile.fixProfiles(importedProfiles);
      await storageWriter.setProfilesAndIndex(importedProfiles, importedProfiles.length - 1);
      loadedProfile = JSON.stringify(importedProfile, null, 2);
      profileJson = loadedProfile;
    }
    isDone = true;
  }

  run().catch((err) => {
    errorCaught = err;
    console.error(err);
  });
</script>

<svelte:head>
  <title>{isDone ? 'Done' : 'Loading'}</title>
</svelte:head>

<main>
  <h1>Load profile</h1>

  {#if isDone}
    {#if loadedProfile}
      <h2>Loaded profile</h2>
      <pre><code>{loadedProfile}</code></pre>
    {/if}
    <h2>API</h2>
    <p>
      To load an exported profile, go to:
      <br />
      <code>{`https://webdriver.modheader.com/load?profile={exported_profile_in_json}`}</code>
    </p>

    <p>
      To clear all modifications, go to:
      <br />
      <code>https://webdriver.modheader.com/clear</code>
    </p>

    <p>
      To add headers to webdriver, navigate to this URL: <code
        >{`https://webdriver.modheader.com/add?{name1}={value1}&{name2}={value2}&...`}</code
      >
    </p>

    <h2>API tool</h2>
    <p>Use the following tool to get the correctly encoded load profile URL</p>
    <textarea rows="10" style="width: 400px;" bind:value={profileJson} />
    {#if !isValid(profileJson)}
      <div style="color: #9e0000">Profile JSON is invalid</div>
    {/if}

    <div style="margin-top: .5rem;">
      <code style="word-break: break-all">{getUrl(profileJson)}</code>
    </div>
    <div>
      <button on:click={() => navigator.clipboard.writeText(getUrl(profileJson))}>Copy URL</button>
    </div>
  {:else if errorCaught}
    <h2>Error while adding header</h2>
    <p>{errorCaught}</p>
  {:else}
    <h2>Processing</h2>
  {/if}
</main>
