export declare enum MouvementTypeDto {
    CREDIT = "CREDIT",
    DEBIT = "DEBIT",
    TAXPAIMENT = "TAXPAIMENT"
}
export declare class CreateMouvementDto {
    entrepriseId: number;
    type: MouvementTypeDto;
    amount: number;
    description?: string;
}
