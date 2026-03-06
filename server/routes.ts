import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { DriverStanding } from "@shared/schema";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";

async function fetchStandingsFromAPI(season: string): Promise<DriverStanding[]> {
  const res = await fetch(`${JOLPICA_BASE}/${season}/driverstandings.json`);
  if (!res.ok) throw new Error(`Failed to fetch standings for ${season}`);
  const data = await res.json();
  return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
}

async function fetchPodiumsFromAPI(season: string): Promise<Record<string, number>> {
  const res = await fetch(`${JOLPICA_BASE}/${season}/results.json?limit=1000`);
  if (!res.ok) return {};
  const data = await res.json();
  const races = data.MRData?.RaceTable?.Races || [];

  const podiums: Record<string, number> = {};
  for (const race of races) {
    const results = race.Results || [];
    for (const result of results) {
      const pos = parseInt(result.position);
      if (pos >= 1 && pos <= 3) {
        podiums[result.Driver.driverId] = (podiums[result.Driver.driverId] || 0) + 1;
      }
    }
  }
  return podiums;
}

async function fetchScheduleFromAPI(season: string) {
  const res = await fetch(`${JOLPICA_BASE}/${season}.json`);
  if (!res.ok) throw new Error(`Failed to fetch schedule for ${season}`);
  const data = await res.json();
  return data.MRData.RaceTable.Races || [];
}

function standingsChanged(oldStandings: DriverStanding[] | null, newStandings: DriverStanding[]): boolean {
  if (!oldStandings) return true;
  if (oldStandings.length !== newStandings.length) return true;
  for (let i = 0; i < newStandings.length; i++) {
    if (oldStandings[i]?.points !== newStandings[i]?.points ||
        oldStandings[i]?.position !== newStandings[i]?.position ||
        oldStandings[i]?.wins !== newStandings[i]?.wins) {
      return true;
    }
  }
  return false;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/teams", (_req, res) => {
    res.json(storage.getTeams());
  });

  app.get("/api/standings", async (_req, res) => {
    try {
      const cached = storage.getCachedStandings();
      const podiums = storage.getCachedPodiums();
      if (cached && podiums) {
        return res.json({
          standings: cached,
          podiums,
          lastUpdated: storage.getLastUpdated(),
          season: storage.getSeason(),
        });
      }

      let standings = await fetchStandingsFromAPI("2026");
      let season = "2026";
      if (standings.length === 0) {
        standings = await fetchStandingsFromAPI("2025");
        season = "2025";
      }

      let fetchedPodiums = await fetchPodiumsFromAPI(season);

      const now = new Date().toISOString();
      storage.setCachedStandings(standings);
      storage.setCachedPodiums(fetchedPodiums);
      storage.setLastUpdated(now);
      storage.setSeason(season);

      res.json({ standings, podiums: fetchedPodiums, lastUpdated: now, season });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/standings/update", async (_req, res) => {
    try {
      const oldStandings = storage.getCachedStandings();

      let newStandings = await fetchStandingsFromAPI("2026");
      let season = "2026";
      if (newStandings.length === 0) {
        newStandings = await fetchStandingsFromAPI("2025");
        season = "2025";
      }

      const newPodiums = await fetchPodiumsFromAPI(season);
      const updated = standingsChanged(oldStandings, newStandings);

      if (updated) {
        const now = new Date().toISOString();
        storage.setCachedStandings(newStandings);
        storage.setCachedPodiums(newPodiums);
        storage.setLastUpdated(now);
        storage.setSeason(season);
        res.json({ updated: true, standings: newStandings, podiums: newPodiums, lastUpdated: now, season });
      } else {
        res.json({
          updated: false,
          standings: oldStandings,
          podiums: storage.getCachedPodiums(),
          lastUpdated: storage.getLastUpdated(),
          season: storage.getSeason(),
        });
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/schedule", async (_req, res) => {
    try {
      const cached = storage.getCachedSchedule();
      if (cached) {
        return res.json({ schedule: cached, season: storage.getSeason() });
      }

      let races = await fetchScheduleFromAPI("2026");
      let season = "2026";
      if (races.length === 0) {
        races = await fetchScheduleFromAPI("2025");
        season = "2025";
      }

      storage.setCachedSchedule(races);
      res.json({ schedule: races, season });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}