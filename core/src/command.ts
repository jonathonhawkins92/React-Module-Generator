import * as fs from "fs/promises";
import * as path from "path";

import type { Relationships } from "./relationship";
import type { Config } from "./template/types";
import { templateValidator } from "./template/validator";
import { EOLS } from "./enums";

export default class Command {
	constructor(
		private eol: EOLS,
		private templateConfig: Record<string, Config>,
		private openFile: (path: string) => void,
		private validationError: (name: string) => void,
		private relationships: Relationships
	) {
		return this;
	}

	public async add(
		root: string,
		baseName: string,
		runtimeSettings: Record<string, boolean>
	) {
		const moduleName = this.normalizeComponentName(baseName);
		const depths = this.generateDepthMap();
		this.generateTemplateInstances(
			root,
			moduleName,
			depths,
			runtimeSettings
		);
		let openFilePath: null | string = null;

		const entrypoints: Record<string, true> = {};
		for (const entrypoint of this.relationships.entrypoints) {
			entrypoints[entrypoint] = true;
		}

		// create files
		for (const names of depths) {
			for (const name of names) {
				if (!runtimeSettings[name] || entrypoints[name]) {
					continue;
				}
				const node = this.relationships.nodes[name];

				if (!templateValidator.assert(node.instance)) {
					return this.validationError(node.name);
				}

				if (node.instance === null) {
					return this.validationError(node.name);
				}

				if (node.instance.directories.length > 0) {
					await this.createDir(root, node.instance.directories);
				}
				await fs.writeFile(node.instance.path, node.instance.content);

				if (node.open) {
					openFilePath = node.instance.path;
				}
			}
		}
		for (const name of this.relationships.entrypoints) {
			if (!runtimeSettings[name]) {
				continue;
			}
			const node = this.relationships.nodes[name];

			if (!templateValidator.assert(node.instance)) {
				return this.validationError(node.name);
			}

			if (node.instance === null) {
				return this.validationError(node.name);
			}

			if (node.instance.directories.length > 0) {
				await this.createDir(root, node.instance.directories);
			}

			try {
				const fileStats = await fs.stat(node.instance.path);
				if (!fileStats.isFile()) {
					throw new Error("Not a file");
				}
				await fs.writeFile(node.instance.path, node.instance.content, {
					flag: "a+",
				});
			} catch (_) {
				await fs.writeFile(node.instance.path, node.instance.content);
			}

			if (node.open) {
				openFilePath = node.instance.path;
			}
		}

		if (openFilePath !== null) {
			this.openFile(openFilePath);
		}
	}

	public async create(
		root: string,
		baseName: string,
		runtimeSettings: Record<string, boolean>
	) {
		const dirName = this.normalizeDirName(baseName);
		const directory = path.join(root, dirName);
		const moduleName = this.normalizeComponentName(baseName);

		const depths = this.generateDepthMap();
		this.generateTemplateInstances(
			directory,
			moduleName,
			depths,
			runtimeSettings
		);
		let openFilePath: null | string = null;

		await fs.mkdir(directory);

		// create files
		for (const names of depths) {
			for (const name of names) {
				if (!runtimeSettings[name]) {
					continue;
				}
				const node = this.relationships.nodes[name];

				if (!templateValidator.assert(node.instance)) {
					return this.validationError(node.name);
				}

				if (node.instance === null) {
					return this.validationError(node.name);
				}

				if (node.instance.directories.length > 0) {
					await this.createDir(directory, node.instance.directories);
				}
				await fs.writeFile(node.instance.path, node.instance.content);

				if (node.open) {
					openFilePath = node.instance.path;
				}
			}
		}

		if (openFilePath !== null) {
			this.openFile(openFilePath);
		}
	}

	public async explorerCreate(
		filePath: string,
		baseName: string,
		runtimeSettings: Record<string, boolean>
	) {
		const normalizedFilePath = this.formatDirName(filePath);
		const stats = await fs.lstat(normalizedFilePath);
		if (stats.isDirectory()) {
			this.create(normalizedFilePath, baseName, runtimeSettings);
		} else {
			this.create(
				path.dirname(normalizedFilePath),
				baseName,
				runtimeSettings
			);
		}
	}

	public async explorerAdd(
		filePath: string,
		baseName: string,
		runtimeSettings: Record<string, boolean>
	) {
		const normalizedFilePath = this.formatDirName(filePath);
		const stats = await fs.lstat(normalizedFilePath);
		if (stats.isDirectory()) {
			this.add(normalizedFilePath, baseName, runtimeSettings);
		} else {
			this.add(
				path.dirname(normalizedFilePath),
				baseName,
				runtimeSettings
			);
		}
	}

	private generateDepthMap() {
		const MAX_DEPTH = 99;
		const lookup: Record<string, number> = {};
		const relationship = this.relationships;

		function depthFinder(children: string[], depth = 1) {
			// TODO: replace with tarjan's algorithm
			if (depth > MAX_DEPTH) {
				console.error(
					`Max depth of ${MAX_DEPTH} reached, there is probably a circular reference in your files relationships.`
				);
				return;
			}

			if (children.length <= 0) {
				return;
			}

			for (const child of children) {
				const node = relationship.nodes[child];

				if (lookup[node.name]) {
					const refDepth = lookup[node.name] ?? 0;
					if (refDepth > depth) {
						// Already processed
						return;
					}
				}

				lookup[node.name] = depth;

				const nextNode = relationship.nodes[child];
				depthFinder(nextNode.children, depth + 1);
			}
		}

		for (const entry of this.relationships.entrypoints) {
			const node = this.relationships.nodes[entry];
			lookup[node.name] = 0;
			depthFinder(node.children);
		}

		const result: string[][] = [];
		for (const [name, index] of Object.entries(lookup)) {
			if (!result[index]) {
				result[index] = [];
			}
			result[index].push(name);
		}

		return result;
	}

	private generateTemplateInstances(
		directory: string,
		moduleName: string,
		depths: string[][],
		runtimeSettings: Record<string, boolean>
	) {
		// map node relationships
		for (let depth = depths.length - 1; depth >= 0; depth--) {
			const names = depths[depth];
			for (const name of names) {
				if (!runtimeSettings[name]) {
					continue;
				}
				const node = this.relationships.nodes[name];
				const children = [];
				for (const childName of node.children) {
					const child = this.relationships.nodes[childName].instance;
					if (child === null) {
						continue;
					}
					children.push(child);
				}

				const template = new node.template(
					node.name,
					directory,
					moduleName,
					children,
					this.eol,
					this.templateConfig[node.name]
				);
				if (!templateValidator.assert<typeof template>(template)) {
					return this.validationError(template.name);
				}
				this.relationships.nodes[name].instance = template;
			}
		}
	}

	private async createDir(parentDir: string, dirs: string[]) {
		let prevDir = parentDir;
		for (const dir of dirs) {
			const nextDir = path.join(prevDir, dir);
			try {
				const prevDirStats = await fs.stat(prevDir);
				if (prevDirStats.isDirectory()) {
					await fs.mkdir(nextDir);
				}
			} catch (e) {
				if (e instanceof Error && e.message.includes("ENOENT")) {
					console.log("[command.createDir]", e);
				}
			}
			prevDir = nextDir;
		}
	}

	private normalizeName(value: string, delimiter: string) {
		return value
			.split(/(?=[A-Z0-9])/) // split out all the numbers and capitalized words
			.join(delimiter) // recreate the string with numbers and capitalized words spaced out
			.replace(/[^A-Za-z0-9]/g, delimiter) // replace all non alphanumeric characters
			.split(delimiter) // create an array of entries
			.filter(Boolean); // remove empty entries
	}

	private normalizeDirName(value: string) {
		const delimiter = "-";
		return this.normalizeName(value, delimiter)
			.join(delimiter) // recreate the string
			.toLowerCase();
	}

	private normalizeComponentName(value: string) {
		const delimiter = "-";
		let result = "";
		for (const chunk of this.normalizeName(value, delimiter)) {
			result += chunk[0].toUpperCase() + chunk.slice(1);
		}
		return result;
	}

	private formatDirName(dir: string) {
		if (process.platform !== "win32") {
			return dir;
		}
		/**
		 * this is for WSL
		 * for some reason it adds / to the end of the path
		 */
		if (dir[0] === "/") {
			return dir.slice(1);
		}
		return dir;
	}
}
