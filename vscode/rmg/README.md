# What is React Module Generator (RMG)

RMG was created when I got bored of creating a folder, creating a barrel file and then creating a component file aka a module, so this is a kind of file snippet.

## Features

Create modules, what is a module? A module is a self contained component that exposes it's components via a barrel (index) file, which makes it clear which parts of that folder are ready for consumption, think of everything in the barrel file as a public resource!

## Extension Settings

### global

-   `rmg.global.endOfLineSequence`: `lf | crlf | cr` What style of end of line character we will use.

### component

-   `rmg.component.imports`: A list of imports, eg `import * as React from \"react\";`
-   `rmg.component.export.type`: How we will export and then import your file.
-   `rmg.component.export.extension`: Enable/disable the file extension when importing.
-   `rmg.component.export.alias`: The name used when importing the component, we fallback to component.
-   `rmg.component.file.name`: The name given to your component's file, we fallback to the module's name.
-   `rmg.component.file.extension`: The type of file you are creating, we fallback to `.tsx`.

### barrel

-   `rmg.barrel.include`: Enable/disable the addition of a barrel file.
-   `rmg.barrel.imports`: A list of imports, eg `import * as React from \"react\";`
-   `rmg.barrel.export.type`: How we will export and then import your file.
-   `rmg.barrel.export.extension`: Enable/disable the file extension when importing.
-   `rmg.barrel.export.alias`: The name used when importing the barrel, we fallback to `barrel`.
-   `rmg.barrel.file.name`: The name given to your barrel's file, we fallback to `index` then to the module's name.
-   `rmg.barrel.file.extension`: The type of file you are creating, we fallback to `.ts`.

### style

-   `rmg.style.include`: Enable/disable the addition of a style file and importing of said file in component.
-   `rmg.style.imports`: A list of imports, eg `import * as React from \"react\";`
-   `rmg.style.export.type`: How we will export and then import your file.
-   `rmg.style.export.extension`: Enable/disable the file extension when importing.
-   `rmg.style.export.alias`: The name used when importing the style, we fallback to `style`.
-   `rmg.style.file.name`: The name given to your style's file, we fallback to the module's name.
-   `rmg.style.file.extension`: The type of file you are creating, we fallback to `.module.css`.

### translation

-   `rmg.translation.include`: Enable/disable the addition of a translation file and importing of said file in component.
-   `rmg.translation.imports`: A list of imports, eg `import * as React from \"react\";`
-   `rmg.translation.export.type`: How we will export and then import your file.
-   `rmg.translation.export.extension`: Enable/disable the file extension when importing.
-   `rmg.translation.export.alias`: The name used when importing the translation, we fallback to `translation`.
-   `rmg.translation.file.name`: The name given to your translation's file, we fallback to the module's name.
-   `rmg.translation.file.extension`: The type of file you are creating, we fallback to `.intl.ts`.

### test

-   `rmg.test.include`: Enable/disable the addition of a test file.
-   `rmg.test.imports`: A list of imports, eg `import * as React from \"react\";`
-   `rmg.test.export.type`: How we will export and then import your file.
-   `rmg.test.export.extension`: Enable/disable the file extension when importing.
-   `rmg.test.export.alias`: The name used when importing the test, we fallback to `test`.
-   `rmg.test.file.name`: The name given to your test's file, we fallback to the module's name.
-   `rmg.test.file.extension`: The type of file you are creating, we fallback to `.test.ts`.root.

## Known Issues

Nothing yet 🤞

## Release Notes

[Change Log](/CHANGELOG.md)

---

## Contribution

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

-   [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Setup

-   `yarn` | `npm` to install all the things.
-   `f5` to compile and run the app in a new instance of VSCode

**Enjoy!**
