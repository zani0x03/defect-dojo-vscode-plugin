import * as vscode from 'vscode';
import { Product } from '../interfaces/product';
import { ApiResponse } from '../interfaces/apiResponse';
import { Finding } from '../interfaces/finding';
import { FindingTreeItem } from '../classes/findingTreeItem';

export class ProductView implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private product: Product = {
        name: "",
        business_criticality: "",
        description: "",
        tags: "",
        findings: [{
            description:"",
            file_path: "",
            id: 0,
            line: 0,
            severity: "",
            title: ""
        }]
    };

    constructor(private context: vscode.ExtensionContext) {
        this.refresh();
    }

    private async fetchProductFindings(): Promise<void>{
        const configs = vscode.workspace.getConfiguration("defect-dojo-vscode-plugin");
        const token = await this.context.secrets.get('defectDojoToken');

        if (!configs.url || !configs.url  || !token) {
            vscode.window.showErrorMessage('Invalid configurations.');
            return;
        }

        await this.fetchProduct(token, configs.url , configs.productName );

        if (this.product.name.length > 0){
            await this.fetchFindings(token, configs.url , this.product.name );
        }

        this._onDidChangeTreeData.fire();
    }


    private async fetchProduct(token: string, url: string, productName: string){
        try {
            // Realizar requisição à API
            const response = await fetch(`${url}/api/v2/products?name_exact=${productName}`, {
                headers: {
                    'Authorization': `Token ${token}`
                }
            });

            if (!response.ok) {
                vscode.window.showErrorMessage('Error retrieving product data.');
            }

            const apiProduct = await response.json() as ApiResponse<Product>;

            this.product.description = apiProduct.results[0].description;
            this.product.name = apiProduct.results[0].name;
            this.product.tags = apiProduct.results[0].tags;
            this.product.business_criticality = apiProduct.results[0].business_criticality;


        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    }

    private async fetchFindings(token: string, url: string, productName: string){
        try {
            const response = await fetch(`${url}/api/v2/findings?active=true&o=severity&product_name=${productName}`, {
                headers: {
                    'Authorization': `Token ${token}`
                }
            });

            if (!response.ok) {
                vscode.window.showErrorMessage('Error retrieving findings.');
                return;
            }

            const apiFindings = await response.json() as ApiResponse<Finding>;

            this.product.findings = apiFindings.results;

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    }

    refresh(): void {
        this.fetchProductFindings();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!this.product) {
            return Promise.resolve([]);
          }
      
          if (!element) { // Retorna os itens de detalhe do produto e o nó de Findings
            const details: vscode.TreeItem[] = [
              new vscode.TreeItem(`Name: ${this.product.name}`, vscode.TreeItemCollapsibleState.None),
              new vscode.TreeItem(`Description: ${this.product.description || 'N/A'}`, vscode.TreeItemCollapsibleState.None),
              new vscode.TreeItem(`Tags: ${this.product.tags || 'N/A'}`, vscode.TreeItemCollapsibleState.None),
              new vscode.TreeItem(`Business Criticality: ${this.product.business_criticality || 'N/A'}`, vscode.TreeItemCollapsibleState.None),
              new vscode.TreeItem('Findings', vscode.TreeItemCollapsibleState.Expanded)
            ];
            return Promise.resolve(details);
          }
      
          // Se o elemento for o nó 'Findings', retorna os TreeItems das findings
          if (element.label === 'Findings') {
            return Promise.resolve(this.product.findings.
                filter(finding => finding.file_path).
                map(finding => {
                    const text = `${finding.title}(${finding.severity})`;
                    const item = new FindingTreeItem(text, finding, vscode.TreeItemCollapsibleState.None);
                    item.command = {
                        command: 'defect-dojo-vscode-plugin.openFile',
                        title: 'Open Finding',
                        arguments: [finding.file_path, finding.line, finding.title, finding.description]
                    };
                    item.contextValue="finding-item";
                    return item;
            }));
          }
      
          return Promise.resolve([]);
    }
}