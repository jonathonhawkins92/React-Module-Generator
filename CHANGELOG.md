# Change Log

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
-   added includeTest setting
-   added run time setting checkboxes
-   added folder picker for use outside of explorer
    -                         I might always show this in future if requested or if it annoys me!
-   renamed fileExtensions to includeFileExtension
