// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import FileController from "./file";

function showError(error: unknown) {
  if (error instanceof Error) {
    vscode.window.showErrorMessage(error.message);
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "rmg" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let create = vscode.commands.registerCommand("rmg.create", async () => {
    try {
      const fileHandler = new FileController();
      await fileHandler.create();
    } catch (err) {
      showError(err);
    }
  });
  context.subscriptions.push(create);

  const explorerCreate = vscode.commands.registerCommand(
    "rmg.explorerCreate",
    async (file) => {
      try {
        if (!file || !file.path) {
          return;
        }
        const fileHandler = new FileController();
        await fileHandler.explorerCreate(file.path);
      } catch (err) {
        showError(err);
      }
    }
  );
  context.subscriptions.push(explorerCreate);

  const explorerAdd = vscode.commands.registerCommand(
    "rmg.explorerAdd",
    async (file) => {
      try {
        if (!file || !file.path) {
          return;
        }
        const fileHandler = new FileController();
        await fileHandler.explorerAdd(file.path);
      } catch (err) {
        showError(err);
      }
    }
  );
  context.subscriptions.push(explorerAdd);
}

// this method is called when your extension is deactivated
export function deactivate() {}
