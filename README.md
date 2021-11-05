# What is React Module Generator (RMG)

RMG was created when I got bored of creating a folder, creating a barrel file and then creating a component file aka a module, so this is a kind of file snippet.

## Features

Create modules, what is a module? A module is a self contained component that exposes it's components via a barrel (index) file, which makes it clear which parts of that folder are ready for consumption, think of everything in the barrel file as a public resource!

## Extension Settings

-   `rmg.typescript`: Enable/disable TypeScript file generation.
-   `rmg.fileExtensions`: Enable/disable file extension in barrel files export.
-   `rmg.includeStyle`: Enable/disable the addition of a style file and importing of said file in component.
-   `rmg.includeTranslation`: Enable/disable the addition of a translation file and importing of said file in component.
-   `rmg.defaultImports`: Any and all imports needed in your module, if you want to disable this set it to an empty array.
-   `rmg.exportType`: What type of export you want to use https://developer.mozilla.org/en-US/docs/web/javascript/reference/statements/export.
-   `rmg.rootDirectory`: The location that we will create your new module in via the command pallet, without this we will attempt to fallback to the workspace root.

## Known Issues

Nothing yet 🤞

## Release Notes

### 0.0.1

Initial release of RMG, features added:

-   cmd | crtl + p, RMG: Create, which will ask you your new modules name and which directory to place it.
-   explorer context menu, RMG: Create, which will ask you your new modules name and will place it in the directory of the file or directory you selected.
-   explorer context menu on an existing module, RMG: Add, which will ask you your new modules name and add it to the existing module.

### 0.1.0

Minor bump due to removal of settings, in future this will be a Major bump but until we hit `1.0.0` breaking changes are more likely.

-   removed rmg.createExplorer in favour of rmg.create
-   removed rmg.addExplorer in favour of rmg.add
-   removed defaultModuleName
-   removed defaultImports in favour of extendable template methods
-   added auto opening created file
    -   might add to settings
-   added includeStyle setting
-   added includeTranslation setting
-   added run time setting checkboxes
-   added folder picker for use outside of explorer
    -   I might always show this in future if requested or if it annoys me!

---

## Contribution

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

-   [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Setup

-   `yarn` | `npm` to install all the things.
-   `f5` to compile and run the app in a new instance of VSCode

**Enjoy!**
