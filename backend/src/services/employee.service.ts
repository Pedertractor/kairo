import { UnitType } from '../generated/client.js';
import { externalApi, ExternalApiError } from '../lib/external-api.js';
import type {
  EmployeeLookupResult,
  ExternalEmployee,
} from '../types/employee.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';

function parseUnit(unit: string): UnitType {
  if (unit === UnitType.PEDERTRACTOR || unit === UnitType.TRACTOR) {
    return unit;
  }

  throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
}

export class EmployeeService {
  async getByCardNumberAndUnit(
    cardNumber: string,
    unit: UnitType,
  ): Promise<EmployeeLookupResult> {
    try {
      const employee = await externalApi.get<ExternalEmployee>(
        `/employee/get/${cardNumber}/${unit}`,
      );

      if (!employee?.name) {
        throw new AppError(404, MENSAGENS.FUNCIONARIO_NAO_ENCONTRADO);
      }

      return {
        name: employee.name,
        cardNumber: employee.cardNumber ?? cardNumber,
        unit: parseUnit(employee.unit ?? unit),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof ExternalApiError) {
        if (error.status === 404) {
          throw new AppError(404, MENSAGENS.FUNCIONARIO_NAO_ENCONTRADO);
        }

        throw new AppError(502, MENSAGENS.ERRO_API_EXTERNA);
      }

      throw error;
    }
  }
}
