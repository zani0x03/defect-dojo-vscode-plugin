import { Finding } from "./finding";

export interface Product {
    name: string;
    description: string;
    tags: string;
    business_criticality: string;
    findings: Finding[];
}