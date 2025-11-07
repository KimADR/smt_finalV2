export declare enum EnterpriseStatusDto {
    ACTIF = "ACTIF",
    INACTIF = "INACTIF",
    SUSPENDU = "SUSPENDU"
}
export declare enum TaxTypeDto {
    IR = "IR",
    IS = "IS"
}
export declare class CreateEntrepriseDto {
    name: string;
    siret?: string;
    address?: string;
    contactEmail?: string;
    phone?: string;
    sector?: string;
    legalForm?: string;
    activity?: string;
    annualRevenue?: number;
    city?: string;
    postalCode?: string;
    description?: string;
    status?: EnterpriseStatusDto;
    taxType?: TaxTypeDto;
    userId?: number;
}
export declare class UpdateEntrepriseDto {
    name?: string;
    siret?: string;
    address?: string;
    contactEmail?: string;
    phone?: string;
    sector?: string;
    legalForm?: string;
    activity?: string;
    annualRevenue?: number;
    city?: string;
    postalCode?: string;
    description?: string;
    status?: EnterpriseStatusDto;
    taxType?: TaxTypeDto;
    userId?: number | null;
}
