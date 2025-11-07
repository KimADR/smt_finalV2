import type { AuthUser } from '../auth/auth.types';
import { MouvementsService } from './mouvements.service';
import type { Request } from 'express';
export declare class MouvementsController {
    private readonly service;
    constructor(service: MouvementsService);
    list(req: Request & {
        user?: AuthUser;
    }, period?: string, entrepriseId?: string): Promise<any>;
    stats(req: Request & {
        user?: AuthUser;
    }, period?: string, entrepriseId?: string): Promise<any>;
    getOne(id: number, req: Request & {
        user?: AuthUser;
    }): Promise<any>;
    create(req: Request & {
        user?: AuthUser;
    }, body: Record<string, unknown>, files?: Express.Multer.File[]): Promise<any>;
    update(id: number, req: Request & {
        user?: AuthUser;
    }, body: Record<string, unknown>, files?: Express.Multer.File[]): Promise<any>;
    remove(id: number, req: Request & {
        user?: AuthUser;
    }): Promise<{
        id: number;
    }>;
}
