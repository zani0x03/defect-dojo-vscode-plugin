import * as vscode from 'vscode';
import { Finding } from '../interfaces/finding'; // Ajuste o caminho se necessário



export class FindingTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly finding: Finding,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`;
        this.description = this.finding.severity;
    }

    contextValue = 'finding-item';
}