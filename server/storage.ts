import type { DriverStanding, Race, TeamsConfig } from "@shared/schema";

export interface IStorage {
  getTeams(): TeamsConfig;
  getCachedStandings(): DriverStanding[] | null;
  setCachedStandings(standings: DriverStanding[]): void;
  getCachedPodiums(): Record<string, number> | null;
  setCachedPodiums(podiums: Record<string, number>): void;
  getCachedSchedule(): Race[] | null;
  setCachedSchedule(schedule: Race[]): void;
  getLastUpdated(): string | null;
  setLastUpdated(timestamp: string): void;
  getSeason(): string;
  setSeason(season: string): void;
}

export class MemStorage implements IStorage {
  private teams: TeamsConfig = {
    player1: {
      name: "Team Ross",
      driverIds: ["max_verstappen", "piastri", "hamilton", "bearman"]
    },
    player2: {
      name: "Team Danno",
      driverIds: ["russell", "norris", "leclerc", "antonelli"]
    }
  };
  private standings: DriverStanding[] | null = null;
  private podiums: Record<string, number> | null = null;
  private schedule: Race[] | null = null;
  private lastUpdated: string | null = null;
  private season: string = "2026";

  getTeams(): TeamsConfig { return this.teams; }
  getCachedStandings(): DriverStanding[] | null { return this.standings; }
  setCachedStandings(standings: DriverStanding[]): void { this.standings = standings; }
  getCachedPodiums(): Record<string, number> | null { return this.podiums; }
  setCachedPodiums(podiums: Record<string, number>): void { this.podiums = podiums; }
  getCachedSchedule(): Race[] | null { return this.schedule; }
  setCachedSchedule(schedule: Race[]): void { this.schedule = schedule; }
  getLastUpdated(): string | null { return this.lastUpdated; }
  setLastUpdated(timestamp: string): void { this.lastUpdated = timestamp; }
  getSeason(): string { return this.season; }
  setSeason(season: string): void { this.season = season; }
}

export const storage = new MemStorage();