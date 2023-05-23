# OpenBureau Plugins
You can place your plugin modules in this directory. This will ensure that your TypeScript modules will be built along with the rest of the project. After adding your new plugins, you'll need to rebuild OpenBureau by running `npm run build`. To make OpenBureau load a plugin, you'll need to add your plugin's filename to the `PLUGINS` config property, excluding the extension.

Example: `PLUGINS=["MyPlugin1", "MyCoolPlugin"]`

Your modules don't need to be a single file; you can create a directory with `index.ts` (which will be used as the entry point) and add other modules inside that folder as you please.

Each module must export an object that implements the Plugin interface in `../bureau`.
- The `init` function will be called when the plugin is first enabled.
- The `uninit` function will be called when the plugin is disabled or the bureau shuts down.

Note that plugins only run in individual bureaus and does not support running directly in WLS. However, you can retrieve the current world's name by retrieving the config value of `WORLD_NAME` (which will be set upon launch by WLS, or you can set it manually when not running in WLS).