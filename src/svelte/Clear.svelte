<script>
  import { profile, storageWriter } from '@modheader/core';
  import { initProfileHooks } from '../js/profile-hook.js';

  initProfileHooks();

  let isDone;
  let errorCaught;

  async function run() {
    await storageWriter.setProfilesAndIndex([profile.createProfile()], 0);
    isDone = 'Done';
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
  <h1>Clear all modifications</h1>

  {#if isDone}
    <h2>All modified request headers are cleared</h2>

    <p>
      To add headers to webdriver, navigate to this URL: <code
        >{`https://webdriver.modheader.com/add?{name1}={value1}&{name2}={value2}&...`}</code
      >
    </p>

    <p>
      To load an exported profile, go to:
      <br />
      <code>{`https://webdriver.modheader.com/load?profile={exported_profile_in_json}`}</code>
    </p>
  {:else if errorCaught}
    <h2>Error while adding header</h2>
    <p>{errorCaught}</p>
  {:else}
    <h2>Processing</h2>
  {/if}
</main>
