import { WindData } from '../types/sailing';

export class WindCalculations {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static calculateTWA(_heading: number, _twd: number): number {
    // TODO: Implement TWA calculation logic
    // This will be implemented in Phase 4
    return 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async fetchWindData(_date: string): Promise<WindData[]> {
    // TODO: Implement wind data fetching
    // This will be implemented in Phase 4
    return [];
  }
}
