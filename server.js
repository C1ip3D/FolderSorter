import pkg from 'electron';
const { app, BrowserWindow, ipcMain, dialog, systemPreferences } = pkg;
import path from 'path';
import fs from 'fs';
import { extname } from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dirname } from 'path';
import chokidar from 'chokidar';
import mimeTypes from 'mime-types';
import { OpenAI } from 'openai';
import { readdirSync, mkdirSync, existsSync, renameSync } from 'fs';

// Variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const expressApp = express();
const port = process.env.PORT || 5173;
const isDev = process.env.NODE_ENV !== 'production';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || new Error('OpenAI API key not found'),
});

// Express setup
expressApp.use(
  express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, path) => {
      if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
    },
  })
);

expressApp.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'"
  );
  next();
});

expressApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

// Start Express server
expressApp.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// IPC handlers

ipcMain.handle('request-directory-access', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Folder to Organize',
      buttonLabel: 'Select Folder',
    });

    return {
      granted: !result.canceled,
      directory: result.filePaths[0],
    };
  } catch (error) {
    console.error('Dialog error:', error);
    return { granted: false, error: error.message };
  }
});

ipcMain.handle('get-mime-types', () => {
  try {
    const uniqueExtensions = new Set();
    Object.values(
      mimeTypes.extensions[
        ('application/x-msdownload',
        'application/x-sh',
        'application/x-executable',
        'text/html',
        'text/css',
        'application/javascript',
        'application/pdf',
        'application/msword',
        'application/vnd.ms-excel',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'image/webp',
        'image/tiff')
      ]
    ).forEach((exts) => exts.forEach((ext) => uniqueExtensions.add(ext)));
    return Array.from(uniqueExtensions).sort();
  } catch (error) {
    console.error('Error getting mime types:', error);
    throw error;
  }
});

ipcMain.handle('suggest-folder-names', async (event, extensions) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `Suggest a short, descriptive folder name for files with these extensions: ${extensions.join(
            ', '
          )}. Response should be just the folder name, nothing else.`,
        },
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
});

ipcMain.handle('request-finder-access', async () => {
  try {
    if (process.platform !== 'darwin') {
      return { granted: true }; // Non-macOS platforms don't need this check
    }

    // For macOS, try to access Documents folder as a permission test
    try {
      const documentsPath = app.getPath('documents');
      await fs.promises.access(
        documentsPath,
        fs.constants.R_OK | fs.constants.W_OK
      );
      return { granted: true };
    } catch (accessError) {
      // Show permission dialog
      const { response } = await dialog.showMessageBox({
        type: 'question',
        buttons: ['Open Settings', 'Cancel'],
        defaultId: 0,
        title: 'Finder Access Required',
        message: 'Folder Sorter needs access to your files',
        detail:
          'Please enable Full Disk Access in System Settings to continue.',
      });

      if (response === 0) {
        const { shell } = pkg;
        // Use macOS specific URL scheme to open Security & Privacy settings
        await shell.openExternal(
          'x-apple.systempreferences:com.apple.preference.security?Privacy'
        );
        return { granted: false, openedSettings: true };
      }

      return { granted: false, openedSettings: false };
    }
  } catch (error) {
    console.error('Finder access error:', error);
    return { granted: false, error: error.message };
  }
});

ipcMain.handle('organize-files', async (event, directory, folderConfigs) => {
  try {
    if (!directory || !existsSync(directory)) {
      throw new Error("Can't find directory to organize");
    }

    const files = readdirSync(directory);
    const organizedFiles = [];

    for (const file of files) {
      const filePath = path.join(directory, file);

      if (!fs.statSync(filePath).isFile()) continue;

      const fileExt = extname(file).toLowerCase().replace('.', '');
      if (!fileExt) continue;

      const matchingConfig = folderConfigs.find((config) =>
        config.extensions.includes(fileExt)
      );

      if (matchingConfig) {
        const folderPath = path.join(directory, matchingConfig.folderName);
        if (!existsSync(folderPath)) {
          mkdirSync(folderPath, { recursive: true });
        }

        const newFilePath = path.join(folderPath, file);

        try {
          renameSync(filePath, newFilePath);
          organizedFiles.push({
            file,
            from: filePath,
            to: newFilePath,
            folder: matchingConfig.folderName,
          });
        } catch (moveError) {
          console.error(`Error moving file ${file}:`, moveError);
        }
      }
    }

    return {
      success: true,
      organized: organizedFiles,
      message: `Organized ${organizedFiles.length} files`,
    };
  } catch (error) {
    console.error('Error organizing files:', error);
    return {
      success: false,
      error: error.message,
      organized: [],
    };
  }
});

// Electron setup
let mainWindow;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.maximize();
  mainWindow.loadURL(`http://localhost:${port}`);
}

if (isDev) {
  const watcher = chokidar.watch(
    [path.join(__dirname, 'pages'), path.join(__dirname, 'src/css')],
    {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
    }
  );

  watcher.on('change', (path) => {
    if (mainWindow) {
      mainWindow.reload();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
