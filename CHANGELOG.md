# Change Log

### 0.2.0

-   Large refactor of both the commands and the templates ready for future extensions.
-   New settings for each type of file
    -   `rmg.{FileType}.include`: Enable/disable the addition of a {FileType} file.
        -   Note `rmg.component.include` isn't a thing as it is a special case.
    -   `rmg.{FileType}.imports`: A list of imports, eg `import * as React from "react";`
    -   `rmg.{FileType}.export.type`: How we will export and then import your file.
    -   `rmg.{FileType}.export.extension`: Enable/disable the file extension when importing.
    -   `rmg.{FileType}.export.alias`: The name used when importing the {FileType}, we fallback to `{FileType}`.
    -   `rmg.{FileType}.file.name`: The name given to your {FileType}'s file, we fallback to `index` then to the module's name.
    -   `rmg.{FileType}.file.extension`: The type of file you are creating, we fallback to `.ts`.
-   New FileTypes:
    -   `barrel`: A interface file for your module.
    -   `component`: A functional React component.
    -   `style`: Created with `.css` | `.less` | `.scss` files in mind.
    -   `test`: A Jest / React Testing Library test file.
    -   `translation`: A internationalization file.
-   Renamed `rmg.endOfLineSequence` to `rmg.global.endOfLineSequence` for clearer usage / namespace.
-   `rmg.{FileType}.file.name` accepts `{{moduleName}}` as a template for the module's name.
-   If `rmg.{FileType}.file.name` includes `/` or `\` it will create sub folders.
-   Auto opening the component once the module is created, this might become a setting in future.

### 0.1.0

Minor bump due to removal of settings, in future this will be a Major bump but until we hit `1.0.0` breaking changes are more likely.

-   Removed `rmg.createExplorer` in favour of `rmg.create`.
-   Removed `rmg.addExplorer` in favour of `rmg.add`.
-   Removed `defaultModuleName`.
-   Removed `defaultImports` in favour of extendable template methods.
-   Added auto opening created file, I might add to settings.
-   Added `includeStyle` setting.
-   Added `includeTranslation` setting.
-   Added `includeTest` setting.
-   Added run time setting checkboxes.
-   Added folder picker for use outside of explorer, I might always show this in future if requested or if it annoys me!
-   Renamed `fileExtensions` to `includeFileExtension`.

### 0.0.1

Initial release of RMG, features added:

-   Press `cmd | crtl` + `p` then type `RMG: Create`, which will ask you your new modules name and which directory to place it.
-   Explorer context menu, `RMG: Create`, which will ask you your new modules name and will place it in the directory of the file or directory you selected.
-   Explorer context menu on an existing module, `RMG: Add`, which will ask you your new modules name and add it to the existing module.
