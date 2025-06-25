import * as vscode from 'vscode';
import { Product } from '../interfaces/product';
import { ApiResponse } from '../interfaces/apiResponse';
import { Finding } from '../interfaces/finding';
import { FindingTreeItem } from '../classes/findingTreeItem';

const ACTIVE_FILTER_KEY = 'DefectDojoActiveFilterKey';
const FINDINGS_PAGE_SIZE = 10;

interface FindingsNode extends vscode.TreeItem {
    type: 'findingsNode';
    nextOffset: number;
    hasMore: boolean;
}


interface LoadMoreNode extends vscode.TreeItem {
    type: 'loadMoreNode';
    parentId: string; 
}

export class ProductView implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private product: Product = {
        name: "",
        business_criticality: "",
        description: "",
        tags: "",
        findings: []
    };

    private loadedFindingsMap: Map<string, Finding[]> = new Map();
    private totalFindingsCount: number = 0;

    private mainFindingsNode: FindingsNode | undefined; 

    constructor(private context: vscode.ExtensionContext) {
        vscode.commands.registerCommand('defect-dojo-vscode-plugin.loadMoreFindings', (parentId: string) => this.loadMoreFindings(parentId));
        this.refresh();
    }

    private async fetchProductFindings(): Promise<void> {
        const configs = vscode.workspace.getConfiguration("defect-dojo-vscode-plugin");
        const token = await this.context.secrets.get('defectDojoToken');
        let productName = "";

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No directory is open in VS Code.');
            return;
        }

        if (!configs.url || !token) {
            vscode.window.showErrorMessage('Invalid configurations.');
            return;
        }

        if (!configs.productName) {
            const arrProductName = workspaceFolders[0].uri.fsPath.split("\\");
            productName = arrProductName[arrProductName.length - 1];
        } else {
            productName = configs.productName;
        }

        await this.fetchProduct(token, configs.url, productName);

        if (this.product.name.length > 0) {
            this.loadedFindingsMap.clear();
            this.totalFindingsCount = 0;
            this.mainFindingsNode = undefined;
        }

        this._onDidChangeTreeData.fire();
    }

    private async fetchProduct(token: string, url: string, productName: string) {
        try {
            const response = await fetch(`${url}/api/v2/products?name_exact=${productName}`, {
                headers: {
                    'Authorization': `Token ${token}`
                }
            });

            if (!response.ok) {
                vscode.window.showErrorMessage('Error retrieving product data.');
                return;
            }

            const apiProduct = await response.json() as ApiResponse<Product>;

            if (apiProduct.results && apiProduct.results.length > 0) {
                this.product.description = apiProduct.results[0].description;
                this.product.name = apiProduct.results[0].name;
                this.product.tags = apiProduct.results[0].tags;
                this.product.business_criticality = apiProduct.results[0].business_criticality;
            } else {
                vscode.window.showInformationMessage(`Product "${productName}" not found.`);
                this.product = { name: "", business_criticality: "", description: "", tags: "", findings: [] };
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    }

    private async fetchFindings(token: string, url: string, productName: string, offset: number, limit: number): Promise<{ findings: Finding[], totalCount: number }> {
        const _currentFilter = this.context.workspaceState.get<string>(ACTIVE_FILTER_KEY) || 'all';
        let filter = "";

        switch (_currentFilter) {
            case "active":
                filter = "&active=true";
                break;
            case "active_verified":
                filter = "&active=true&verified=true";
                break;
            case "active_unverified":
                filter = "&active=true&verified=false";
                break;
            case "inactive":
                filter = "&active=false";
                break;
        }

        try {
            const response = await fetch(`${url}/api/v2/findings?o=severity&product_name=${productName}${filter}&limit=${limit}&offset=${offset}`, {
                headers: {
                    'Authorization': `Token ${token}`
                }
            });

            if (!response.ok) {
                vscode.window.showErrorMessage('Error retrieving findings.');
                return { findings: [], totalCount: 0 };
            }

            const apiResponse = await response.json() as ApiResponse<Finding>;
            return { findings: apiResponse.results, totalCount: apiResponse.count };

        } catch (error) {
            vscode.window.showErrorMessage(`Error fetching findings: ${error}`);
            return { findings: [], totalCount: 0 };
        }
    }

    refresh(): void {
        this.fetchProductFindings();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!this.product || this.product.name.length === 0) {
            return Promise.resolve([]);
        }

        if (!element) {
            const details: vscode.TreeItem[] = [
                new vscode.TreeItem(`Name: ${this.product.name}`, vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem(`Description: ${this.product.description || 'N/A'}`, vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem(`Tags: ${this.product.tags || 'N/A'}`, vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem(`Business Criticality: ${this.product.business_criticality || 'N/A'}`, vscode.TreeItemCollapsibleState.None),
            ];

            if (!this.mainFindingsNode) {
                this.mainFindingsNode = {
                    label: 'Findings',
                    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                    type: 'findingsNode',
                    nextOffset: 0, 
                    hasMore: true,
                    id: 'mainFindingsNode'
                };
            }
            details.push(this.mainFindingsNode);

            return Promise.resolve(details);
        }

        if (element.id === 'mainFindingsNode') {
            const currentFindingsNode = element as FindingsNode; 

            const token = await this.context.secrets.get('defectDojoToken');
            const configs = vscode.workspace.getConfiguration("defect-dojo-vscode-plugin");

            if (!token || !configs.url) {
                vscode.window.showErrorMessage('Invalid configurations or token.');
                return [];
            }

            const offsetToFetch = currentFindingsNode.nextOffset; 

            const { findings: newFindings, totalCount } = await this.fetchFindings(
                token,
                configs.url,
                this.product.name,
                offsetToFetch, 
                FINDINGS_PAGE_SIZE
            );

            this.totalFindingsCount = totalCount;

            let allLoadedFindings = this.loadedFindingsMap.get(currentFindingsNode.id!) || [];

            const newUniqueFindings = newFindings.filter(nf => !allLoadedFindings.some(lf => lf.id === nf.id));
            allLoadedFindings = [...allLoadedFindings, ...newUniqueFindings];

            this.loadedFindingsMap.set(currentFindingsNode.id!, allLoadedFindings);

            let resultItems: vscode.TreeItem[] = allLoadedFindings
                .filter(finding => finding.file_path)
                .map(finding => {
                    const text = `${finding.title}(${finding.severity})`;
                    const item = new FindingTreeItem(text, finding, vscode.TreeItemCollapsibleState.None);
                    item.command = {
                        command: 'defect-dojo-vscode-plugin.openFile',
                        title: 'Open Finding',
                        arguments: [finding.file_path, finding.line, finding.title, finding.description]
                    };
                    item.contextValue = "finding-item";
                    return item;
                });

            currentFindingsNode.nextOffset = offsetToFetch + FINDINGS_PAGE_SIZE;
            currentFindingsNode.hasMore = (allLoadedFindings.length < this.totalFindingsCount);

            if (currentFindingsNode.hasMore) {
                const loadMoreItem: LoadMoreNode = {
                    label: `Carregar Mais Findings (${allLoadedFindings.length}/${this.totalFindingsCount})...`,
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    command: {
                        command: 'defect-dojo-vscode-plugin.loadMoreFindings',
                        title: 'Load More Findings',
                        arguments: [currentFindingsNode.id!] 
                    },
                    type: 'loadMoreNode',
                    parentId: currentFindingsNode.id!, 
                    iconPath: new vscode.ThemeIcon('sync')
                };
                resultItems.push(loadMoreItem);
            }

            return Promise.resolve(resultItems);
        }

        return Promise.resolve([]);
    }

    private async loadMoreFindings(parentId: string) {
        if (this.mainFindingsNode && this.mainFindingsNode.id === parentId) {
            this._onDidChangeTreeData.fire(this.mainFindingsNode);
        }
    }
}