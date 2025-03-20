const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  requestDirectory: async () => {
    try {
      const result = await ipcRenderer.invoke('request-directory-access');
      console.log('Directory selection result:', result);
      return result;
    } catch (error) {
      console.error('Failed to request directory:', error);
      throw error;
    }
  },
  getMimeTypes: async () => {
    try {
      return await ipcRenderer.invoke('get-mime-types');
    } catch (error) {
      console.error('Failed to get mime types:', error);
      throw error;
    }
  },

  suggestFolderNames: async (extensions) => {
    try {
      const suggestion = await ipcRenderer.invoke(
        'suggest-folder-names',
        extensions
      );
      console.log('AI suggestion:', suggestion);
      return suggestion;
    } catch (error) {
      console.error('Failed to get folder suggestions:', error);
      throw error;
    }
  },

  organizeFiles: async (directory, folderConfigs) => {
    try {
      const result = await ipcRenderer.invoke(
        'organize-files',
        directory,
        folderConfigs
      );
      console.log('Organized files:', result);
      return result;
    } catch (error) {
      console.error('Failed to organize files:', error);
      throw error;
    }
  },
  requestFinderAccess: async () => {
    try {
      const result = await ipcRenderer.invoke('request-finder-access');
      console.log('Finder access result:', result);
      return result;
    } catch (error) {
      console.error('Failed to request Finder access:', error);
      throw error;
    }
  },
});
