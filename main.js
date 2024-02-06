const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const resizeImg = require('resize-img')

// what are the different values of process.platform?
// console.log(process.platform) // darwin, win32, linux

const isDarwin = process.platform === 'darwin'

const { NODE_ENV } = process.env
const isDev = NODE_ENV === 'development' || NODE_ENV === undefined

let mainWindow;

// Create the main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'Image Resizer',
    width: isDev ? 1000 : 500,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'))
}

// Create about window
function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    title: 'About Image Resizer',
    width: 300,
    height: 300,
  })

  aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'))
}

// App is ready
app.whenReady().then(() => {
  createMainWindow();

  // Implement menu

  const mainMenu = Menu.buildFromTemplate(menu)
  Menu.setApplicationMenu(mainMenu)

  // Remove mainWindow from memory on close
  mainWindow.on('closed', () => mainWindow = null)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})


/* const menu = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Quit',
        click: () => app.quit(),
        accelerator: 'CmdOrCtrl+W'
      }
    ]
  }
] */

const menu = [
  ...(isDarwin ? [{
    label: app.name,
    submenu: [
      {
        label: 'About',
        role: 'about'
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        click: () => app.quit(),
        accelerator: 'CmdOrCtrl+Q'
      }
    ]
  }] : []),
  {
    role: 'fileMenu'
  },
  ...(process.platform == 'linux' ? [{
    label: 'Help',
    submenu: [
      {
        label: 'About',
        click: createAboutWindow
      }
    ]
  }] : [])
]

// Respond to ipcRenderer resize
ipcMain.on('image:resize', (e, options) => {
  options.dest = path.join(os.homedir(), 'imageresizer')
  resizeImage(options)
})

// Resize image
async function resizeImage({ imgPath, width, height, dest }) {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height
    })

    // Create filename
    const filename = path.basename(imgPath)

    // Create dest folder if not exists
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest)
    }

    // Write file to dest
    fs.writeFileSync(path.join(dest, filename), newPath)

    // Send success message to render
    mainWindow.webContents.send('image:done')

    // Open dest folder
    shell.openPath(dest)

  } catch (error) {
    console.log(error)
  }
}


app.on('window-all-closed', () => {
  if (!isDarwin) {
    app.quit()
  }
})
