window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('folder-config-container');
  const folderConfig = createFolderConfig();
  container.appendChild(folderConfig);

  const startBtn = document.getElementById('start-organizing');
  startBtn.addEventListener('click', async () => {
    try {
      console.log('Requesting Finder access...');
      const finderAccess = await window.electronAPI.requestFinderAccess();
      console.log('Finder access response:', finderAccess);

      if (!finderAccess.granted) {
        if (!finderAccess.openedSettings) {
          alert(
            'Please enable Full Disk Access in System Settings, then restart the app'
          );
          return;
        }
        alert('Finder access is required to organize files');
        return;
      }

      const configs = [];
      const directoryOrganize = await window.electronAPI.requestDirectory();
      document.querySelectorAll('.folder-group').forEach((group) => {
        const folderName = group.querySelector('.folder-name-input').value;
        const extensions = parseExtensions(
          group.querySelector('.extensions-input').value
        );

        if (folderName && extensions.length > 0) {
          configs.push({ folderName, extensions });
        }
      });

      if (configs.length === 0) {
        alert('Please add at least one folder configuration');
        return;
      }

      console.log('Starting file organization with configs:', configs);
      await window.electronAPI.organizeFiles(
        directoryOrganize.directory,
        configs
      );
    } catch (error) {
      console.error('Error during organization:', error);
      alert('An error occurred while organizing files');
    }
  });
});

// for extension dropdown/search
// window.addEventListener('DOMContentLoaded', async () => {
//   try {
//     const container = document.getElementById('extension-search-container');
//     const selectedContainer = document.getElementById('selected-extensions');
//     const { dropdown, searchInput } = await createExtensionDropdown();

//     container.appendChild(searchInput);
//     container.appendChild(dropdown);
//   } catch (error) {
//     console.error('Failed to initialize:', error);
//   }
// });

function parseExtensions(input) {
  return input
    .replace(/[,;]/g, ' ')
    .split(/\s+/)
    .map((ext) => ext.trim().toLowerCase().replace(/^\.+/, ''))
    .filter((ext) => ext);
}

async function createExtensionDropdown() {
  try {
    const sortedExtensions = await window.electronAPI.getMimeTypes();

    const container = document.createElement('div');
    container.className = 'extension-select-container';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search extensions... (e.g., pdf, doc)';
    searchInput.className = 'extension-search';

    const dropdown = document.createElement('select');
    dropdown.id = 'extension-select';
    dropdown.size = 10; // Show 10 items at once

    updateDropdownOptions(dropdown, sortedExtensions, '');

    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      updateDropdownOptions(dropdown, sortedExtensions, searchTerm);
    });

    return { dropdown, searchInput, extensions: sortedExtensions };
  } catch (error) {
    console.error('Failed to create extension dropdown:', error);
    throw error;
  }
}

function updateDropdownOptions(dropdown, extensions, searchTerm) {
  const filteredExtensions = extensions.filter((ext) =>
    ext.toLowerCase().includes(searchTerm)
  );

  dropdown.innerHTML = `
      <option value="">Select file extension...</option>
      ${filteredExtensions
        .map((ext) => `<option value=".${ext}">.${ext}</option>`)
        .join('')}
  `;

  if (filteredExtensions.length === 0) {
    const noResults = document.createElement('option');
    noResults.disabled = true;
    noResults.textContent = 'No extensions found';
    dropdown.appendChild(noResults);
  }
}

function createFolderConfig() {
  const container = document.createElement('div');
  container.className = 'folder-configs';

  const addButton = document.createElement('button');
  addButton.textContent = '+ Add New Folder';
  addButton.className = 'add-folder-btn';

  const folderConfigs = [];

  addButton.addEventListener('click', () => {
    createNewFolderInput(container, folderConfigs);
  });

  container.appendChild(addButton);
  createNewFolderInput(container, folderConfigs);
  return container;
}

async function createNewFolderInput(container, folderConfigs) {
  const folderGroup = document.createElement('div');
  folderGroup.className = 'folder-group';

  // Folder name input with suggestion button
  const nameContainer = document.createElement('div');
  nameContainer.className = 'folder-name-container';

  const folderNameInput = document.createElement('input');
  folderNameInput.type = 'text';
  folderNameInput.placeholder = 'Folder name';
  folderNameInput.className = 'folder-name-input';

  const suggestButton = document.createElement('button');
  suggestButton.textContent = '✨ AI Suggest';
  suggestButton.className = 'suggest-name-btn';
  suggestButton.title = 'Get AI suggestion based on extensions';

  nameContainer.appendChild(folderNameInput);
  nameContainer.appendChild(suggestButton);

  // Extensions input (old)
  // const extensionsInput = document.createElement('select');
  // extensionsInput.placeholder = 'Extensions (e.g., pdf, doc, docx)';
  // const options = await window.electronAPI.getMimeTypes();
  // options.forEach((ext) => {
  //   const option = document.createElement('option');
  //   option.value = ext;
  //   option.textContent = ext;
  //   extensionsInput.appendChild(option);
  // })
  // extensionsInput.className = 'extensions-input';

  // Create the search input box
  const searchInput = document.createElement('input');
  searchInput.placeholder = 'Search extensions...';
  searchInput.className = 'search-input';
  document.body.appendChild(searchInput); 

  // Create a container for the list
  const listContainer = document.createElement('div');
  document.body.appendChild(listContainer); 

  const options = await window.electronAPI.getMimeTypes();

  options.forEach((ext) => {
    const listItem = document.createElement('p');
    listItem.textContent = ext;
    listContainer.appendChild(listItem);
  });

  if(searchInput.value === '') {
    listContainer.style.display = 'none'; 
  }

  // Filter the list based on the input
  searchInput.addEventListener('input', (e) => {
    listContainer.style.display = 'block'; 
    const query = e.target.value.toLowerCase();
    const listItems = listContainer.getElementsByTagName('p');

    Array.from(listItems).forEach((item) => {
      const match = item.textContent.toLowerCase().includes(query);
      item.style.display = match ? '' : 'none'; 
    });
  });


  // AI suggestion handler
  suggestButton.addEventListener('click', async () => {
    const extensions = parseExtensions(searchInput.value);

    if (extensions.length === 0) {
      alert('Please enter some extensions first');
      return;
    }

    suggestButton.disabled = true;
    suggestButton.textContent = '⏳ Thinking...';

    try {
      const suggestion = await window.electronAPI.suggestFolderNames(
        extensions
      );
      if (suggestion) {
        folderNameInput.value = suggestion;
      }
    } catch (error) {
      console.error('Failed to get suggestion:', error);
    } finally {
      suggestButton.disabled = false;
      suggestButton.textContent = '✨ AI Suggest';
    }
  });
  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '×';
  removeBtn.className = 'remove-folder-btn';
  removeBtn.addEventListener('click', () => {
    folderGroup.remove();
    const index = folderConfigs.indexOf(folderGroup);
    if (index > -1) {
      folderConfigs.splice(index, 1);
    }
  });

  folderGroup.appendChild(nameContainer);
  folderGroup.appendChild(searchInput);
  folderGroup.appendChild(searchInput);
  folderGroup.appendChild(removeBtn);

  container.insertBefore(folderGroup, container.lastChild);
  folderConfigs.push(folderGroup);
}
