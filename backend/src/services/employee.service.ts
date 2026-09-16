import { UnitType } from '../generated/client.js';
import { externalApi, ExternalApiError } from '../lib/external-api.js';
import type {
  EmployeeLookupResult,
  EmployeeShiftInfo,
  ExternalEmployee,
} from '../types/employee.types.js';
import { AppError } from '../utils/errors.js';
import { MENSAGENS } from '../utils/response.js';
import { parseExternalShiftBounds } from '../utils/shift.js';

function parseUnit(unit: string): UnitType {
  if (unit === UnitType.PEDERTRACTOR || unit === UnitType.TRACTOR) {
    return unit;
  }

  throw new AppError(400, MENSAGENS.REQUISICAO_INVALIDA);
}

function tryParseUnit(unit: string): UnitType | null {
  if (unit === UnitType.PEDERTRACTOR || unit === UnitType.TRACTOR) {
    return unit;
  }

  return null;
}

/** `/employee/get` answers with a flat array, but tolerate a wrapped payload. */
function extractEmployees(body: unknown): ExternalEmployee[] {
  if (Array.isArray(body)) {
    return body as ExternalEmployee[];
  }

  if (body && typeof body === 'object') {
    for (const key of ['employees', 'dados', 'data']) {
      const value = (body as Record<string, unknown>)[key];

      if (Array.isArray(value)) {
        return value as ExternalEmployee[];
      }
    }
  }

  return [];
}

function isExternalEmployeeActive(employee: ExternalEmployee): boolean {
  const flag = employee.active ?? employee.status;
  return flag === true;
}

function toShiftInfo(employee: ExternalEmployee): EmployeeShiftInfo | null {
  if (!employee?.cardNumber) {
    return null;
  }

  const unit = tryParseUnit(employee.unit);

  if (!unit) {
    return null;
  }

  const bounds = parseExternalShiftBounds(
    employee.firstEntry,
    employee.secondExit,
  );

  if (!bounds) {
    return null;
  }

  return {
    cardNumber: employee.cardNumber,
    unit,
    startMinutes: bounds.startMinutes,
    endMinutes: bounds.endMinutes,
  };
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

      if (!isExternalEmployeeActive(employee)) {
        throw new AppError(404, MENSAGENS.FUNCIONARIO_INATIVO);
      }

      return {
        name: employee.name,
        cardNumber: employee.cardNumber ?? cardNumber,
        unit: parseUnit(employee.unit ?? unit),
        shift: parseExternalShiftBounds(
          employee.firstEntry,
          employee.secondExit,
        ),
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

  async listShifts(): Promise<EmployeeShiftInfo[]> {
    try {
      const body = await externalApi.get<unknown>('/employee/get');
      const shifts: EmployeeShiftInfo[] = [];

      for (const employee of extractEmployees(body)) {
        const shift = toShiftInfo(employee);

        if (shift) {
          shifts.push(shift);
        }
      }

      return shifts;
    } catch (error) {
      if (error instanceof ExternalApiError) {
        throw new AppError(502, MENSAGENS.ERRO_API_EXTERNA);
      }

      throw error;
    }
  }
}
