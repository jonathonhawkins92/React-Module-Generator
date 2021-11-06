import * as vscode from "vscode";
import Command from "./command";

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
				const command = new Command();
				if (!file || !file.path) {
					await command.create();
					return;
				}
				await command.explorerCreate(file.path);
			} catch (err) {
				showError(err);
			}
		}
	);
	context.subscriptions.push(create);

	const add = vscode.commands.registerCommand("rmg.add", async (file) => {
		try {
			const command = new Command();
			if (!file || !file.path) {
				await command.add();
				return;
			}
			await command.explorerAdd(file.path);
		} catch (err) {
			showError(err);
		}
	});
	context.subscriptions.push(add);
}

// this method is called when your extension is deactivated
export function deactivate() {}
