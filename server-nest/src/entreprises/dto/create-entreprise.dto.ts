import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsEmail,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export enum EnterpriseStatusDto {
  ACTIF = 'ACTIF',
  INACTIF = 'INACTIF',
  SUSPENDU = 'SUSPENDU',
}

export enum TaxTypeDto {
  IR = 'IR',
  IS = 'IS',
}

export class CreateEntrepriseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  siret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  legalForm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  activity?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  annualRevenue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(EnterpriseStatusDto)
  status?: EnterpriseStatusDto;

  @IsOptional()
  @IsEnum(TaxTypeDto)
  taxType?: TaxTypeDto;

  // Optionally assign an existing user to this entreprise on create
  @IsOptional()
  @IsNumber()
  @IsPositive()
  userId?: number;
}

export class UpdateEntrepriseDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  siret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  legalForm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  activity?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  annualRevenue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(EnterpriseStatusDto)
  status?: EnterpriseStatusDto;

  @IsOptional()
  @IsEnum(TaxTypeDto)
  taxType?: TaxTypeDto;

  // Optionally change assigned user for this entreprise
  @IsOptional()
  @IsNumber()
  @IsPositive()
  userId?: number | null;
}
