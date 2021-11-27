import type { FileBase } from "./template/base";

interface Node {
	instance: FileBase | null;
	template: typeof FileBase;
	name: string;
	children: string[];
	open?: boolean;
}

export interface Relationships {
	entrypoints: string[];
	nodes: Record<string, Node>;
}
