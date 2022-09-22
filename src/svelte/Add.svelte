<script>
  import { storage, storageWriter } from '@modheader/core';

  let isDone = false;
  let errorCaught;
  let addedHeaders = [];
  let headerInputs = [];

  function getUrl(headers) {
    const url = new URL('https://webdriver.modheader.com/add');
    for (const { name, value } of headers) {
      url.searchParams.set(name, value);
    }
    return url.href;
  }

  async function run() {
    let chromeLocal;
    try {
      chromeLocal = await storage.getLocal(['profiles', 'selectedProfile']);
    } catch (err) {
      console.log('Failed to load storage', err);
      throw err;
    }
    try {
      const params = new URL(document.location).searchParams;
      addedHeaders = [];
      for (const entry of params.entries()) {
        addedHeaders.push({
          name: entry[0],
          value: entry[1],
          enabled: true
        });
      }
    } catch (err) {
      console.log('Failed to parse URL params', err);
      throw err;
    }
    if (addedHeaders.length > 0) {
      try {
        console.log('chromeLocal', chromeLocal);
        const selectedProfile = chromeLocal.profiles[chromeLocal.selectedProfile];
        console.log('selectedProfile', selectedProfile);
        selectedProfile.headers.push(...addedHeaders);
        await storageWriter.setProfiles(chromeLocal.profiles);
        headerInputs = [...addedHeaders];
      } catch (err) {
        console.log('Failed to save to storage', err);
        throw err;
      }
    } else {
      headerInputs = [
        {
          name: 'Test',
          value: '1'
        },
        {
          name: 'User-Agent',
          value: 'My test user agent'
        }
      ];
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
  <h1>Add headers</h1>
  {#if isDone}
    {#if addedHeaders.length > 0}
      <h2>Headers added</h2>
      <ul>
        {#each addedHeaders as header}
          <li>{header.name}: {header.value}</li>
        {/each}
      </ul>
    {/if}

    <h2>API</h2>
    <p>
      To add headers to webdriver, navigate to this URL: <code
        >{`https://webdriver.modheader.com/add?{name1}={value1}&{name2}={value2}&...`}</code
      >
    </p>
    <p>
      <strong>IMPORTANT</strong>: Please be sure to URL encoded the parameters so they can be
      correctly parsed.
    </p>

    <p>
      To make sure that the headers are correctly added, please wait for the document title to equal
      <code>Done</code>.
    </p>

    <h2>API Helper</h2>
    <p>Use the tool below to help you generate a add header URL:</p>
    {#each headerInputs as header, i}
      <div>
        <input bind:value={header.name} />: <input bind:value={header.value} />
        <button
          on:click={() => {
            headerInputs.splice(i, 1);
            headerInputs = [...headerInputs];
          }}>Delete</button
        >
      </div>
    {/each}
    <button on:click={() => (headerInputs = [...headerInputs, { name: '', value: '' }])}
      >Add header</button
    >

    <div style="margin-top: .5rem;">
      <code>{getUrl(headerInputs)}</code>
    </div>
    <div>
      <button on:click={() => navigator.clipboard.writeText(getUrl(headerInputs))}>Copy URL</button>
    </div>

    <h2>Clear all modifications</h2>
    <p>
      To clear all modifications, go to:
      <br />
      <code>https://webdriver.modheader.com/clear</code>
    </p>

    <h2>Load a profile</h2>
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
