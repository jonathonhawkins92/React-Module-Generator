import * as vscode from "vscode";
import FileController from "./file";

function showError(error: unknown) {
	if (error instanceof Error) {
		vscode.window.showErrorMessage(error.message);
	}
}

export function activate(context: vscode.ExtensionContext) {
	const create = vscode.commands.registerCommand(
		"rmg.create",
		async (file) => {
			try {
				const fileHandler = new FileController();
				if (!file || !file.path) {
					await fileHandler.create();
					return;
				}
				await fileHandler.explorerCreate(file.path);
			} catch (err) {
				showError(err);
			}
		}
	);
	context.subscriptions.push(create);

	const add = vscode.commands.registerCommand("rmg.add", async (file) => {
		try {
			const fileHandler = new FileController();
			if (!file || !file.path) {
				await fileHandler.add();
				return;
			}
			await fileHandler.explorerAdd(file.path);
		} catch (err) {
			showError(err);
		}
	});
	context.subscriptions.push(add);
}

// this method is called when your extension is deactivated
export function deactivate() {}
