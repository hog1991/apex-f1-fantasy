import { z } from "zod";

export const driverStandingSchema = z.object({
  position: z.string(),
  points: z.string(),
  wins: z.string(),
  Driver: z.object({
    driverId: z.string(),
    permanentNumber: z.string().optional(),
    code: z.string().optional(),
    givenName: z.string(),
    familyName: z.string(),
  }),
  Constructors: z.array(z.object({
    constructorId: z.string(),
    name: z.string(),
  })),
});

export const raceSchema = z.object({
  round: z.string(),
  raceName: z.string(),
  Circuit: z.object({
    circuitName: z.string(),
    Location: z.object({
      locality: z.string(),
      country: z.string(),
    }),
  }),
  date: z.string(),
  time: z.string().optional(),
});

export type DriverStanding = z.infer<typeof driverStandingSchema>;
export type Race = z.infer<typeof raceSchema>;

export interface Team {
  name: string;
  driverIds: string[];
}

export interface TeamsConfig {
  player1: Team;
  player2: Team;
}

export interface UpdateResult {
  updated: boolean;
  standings: DriverStanding[];
  podiums: Record<string, number>;
  lastUpdated: string;
  season: string;
}