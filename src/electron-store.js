const Store = require('electron-store')

// In Windows, this is stored at %appdata%\Electron\config.json
const config = new Store()

export default config
