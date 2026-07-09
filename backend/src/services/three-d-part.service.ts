import type { ThreeDPart } from '../generated/client.js';
import { ThreeDPartRepository } from '../repositories/three-d-part.repository.js';
import type { ThreeDPartSummary } from '../types/three-d-part.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

function toThreeDPartSummary(part: ThreeDPart): ThreeDPartSummary {
  return {
    id: part.id,
    name: part.name,
    code: part.code,
    timeToPrint: part.timeToPrint,
    createdAt: part.createdAt.toISOString(),
    updatedAt: part.updatedAt.toISOString(),
  };
}

export class ThreeDPartService {
  constructor(private readonly threeDPartRepository: ThreeDPartRepository) {}

  async list(): Promise<ThreeDPartSummary[]> {
    const parts = await this.threeDPartRepository.findAll();
    return parts.map(toThreeDPartSummary);
  }

  async getById(id: string): Promise<ThreeDPartSummary> {
    const part = await this.threeDPartRepository.findById(id);

    if (!part) {
      throw new AppError(404, MENSAGENS.PECA_3D_NAO_ENCONTRADA);
    }

    return toThreeDPartSummary(part);
  }

  async create(
    name: string,
    code: string,
    timeToPrint: number,
  ): Promise<ThreeDPartSummary> {
    const existing = await this.threeDPartRepository.findByCode(code);

    if (existing) {
      throw new AppError(409, MENSAGENS.CODIGO_PECA_3D_JA_CADASTRADO);
    }

    const part = await this.threeDPartRepository.create({
      name,
      code,
      timeToPrint,
    });

    return toThreeDPartSummary(part);
  }

  async update(
    id: string,
    data: { name?: string; code?: string; timeToPrint?: number },
  ): Promise<ThreeDPartSummary> {
    const part = await this.threeDPartRepository.findById(id);

    if (!part) {
      throw new AppError(404, MENSAGENS.PECA_3D_NAO_ENCONTRADA);
    }

    if (data.code && data.code !== part.code) {
      const existing = await this.threeDPartRepository.findByCode(data.code);

      if (existing) {
        throw new AppError(409, MENSAGENS.CODIGO_PECA_3D_JA_CADASTRADO);
      }
    }

    const updated = await this.threeDPartRepository.update(id, data);
    return toThreeDPartSummary(updated);
  }

  async delete(id: string): Promise<void> {
    const part = await this.threeDPartRepository.findById(id);

    if (!part) {
      throw new AppError(404, MENSAGENS.PECA_3D_NAO_ENCONTRADA);
    }

    await this.threeDPartRepository.delete(id);
  }
}
