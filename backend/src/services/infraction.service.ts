import { env } from '../config/env.js';
import { infractionsResponseSchema } from '../schemas/infraction.schema.js';
import type { InfractionsQuery, InfractionsReport } from '../types/infraction.types.js';
import { AppError } from '../utils/errors.js';

type P5Config = Pick<typeof env, 'P5_INFRACTIONS_API_URL' | 'P5_INFRACTIONS_API_KEY'>;

export class InfractionService {
  constructor(
    private readonly config: P5Config = env,
    private readonly request: typeof fetch = fetch,
    private readonly timeoutMs = 15_000,
  ) {}

  async getReport(query: InfractionsQuery): Promise<InfractionsReport> {
    const { P5_INFRACTIONS_API_URL: apiUrl, P5_INFRACTIONS_API_KEY: apiKey } = this.config;
    if (!apiUrl || !apiKey) {
      throw new AppError(503, 'A integração de infrações com o P5 não está configurada');
    }

    const url = new URL(apiUrl);
    url.searchParams.set('month', String(query.month));
    url.searchParams.set('year', String(query.year));
    const signal = AbortSignal.timeout(this.timeoutMs);

    try {
      const response = await this.request(url, {
        headers: { Accept: 'application/json', 'X-Kairo-API-Key': apiKey },
        signal,
        redirect: 'error',
      });

      if (!response.ok) {
        throw new AppError(502, 'Não foi possível consultar as infrações no P5');
      }

      const result = infractionsResponseSchema.safeParse(await response.json());
      if (!result.success || result.data.month !== query.month || result.data.year !== query.year) {
        throw new AppError(502, 'O P5 retornou uma resposta de infrações inválida');
      }

      return result.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (signal.aborted) {
        throw new AppError(504, 'O P5 demorou para responder à consulta de infrações. Tente novamente');
      }
      if (error instanceof SyntaxError) {
        throw new AppError(502, 'O P5 retornou uma resposta de infrações inválida');
      }
      throw new AppError(502, 'Não foi possível conectar ao P5 para consultar as infrações');
    }
  }
}
