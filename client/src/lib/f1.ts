import { apiRequest } from "./queryClient";

export interface Driver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
}

export interface Constructor {
  constructorId: string;
  name: string;
}

export interface DriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}

export interface Race {
  round: string;
  raceName: string;
  Circuit: {
    circuitName: string;
    Location: {
      locality: string;
      country: string;
    }
  };
  date: string;
  time?: string;
}

export interface StandingsResponse {
  standings: DriverStanding[];
  podiums: Record<string, number>;
  lastUpdated: string;
  season: string;
}

export interface UpdateResponse extends StandingsResponse {
  updated: boolean;
}

export interface ScheduleResponse {
  schedule: Race[];
  season: string;
}

export interface TeamsConfig {
  player1: { name: string; driverIds: string[] };
  player2: { name: string; driverIds: string[] };
}

export async function getTeams(): Promise<TeamsConfig> {
  const res = await fetch("/api/teams");
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

export async function getStandings(): Promise<StandingsResponse> {
  const res = await fetch("/api/standings");
  if (!res.ok) throw new Error("Failed to fetch standings");
  return res.json();
}

export async function updateStandings(): Promise<UpdateResponse> {
  const res = await apiRequest("POST", "/api/standings/update");
  return res.json();
}

export async function getSchedule(): Promise<ScheduleResponse> {
  const res = await fetch("/api/schedule");
  if (!res.ok) throw new Error("Failed to fetch schedule");
  return res.json();
}