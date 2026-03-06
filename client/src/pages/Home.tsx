import { useQuery, useMutation } from "@tanstack/react-query";
import { getStandings, getSchedule, getTeams, updateStandings, type DriverStanding } from "@/lib/f1";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, RefreshCcw, Calendar, Flag, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const DRIVER_FALLBACKS: Record<string, { givenName: string, familyName: string, constructor: string }> = {
  "max_verstappen": { givenName: "Max", familyName: "Verstappen", constructor: "Red Bull" },
  "piastri": { givenName: "Oscar", familyName: "Piastri", constructor: "McLaren" },
  "hamilton": { givenName: "Lewis", familyName: "Hamilton", constructor: "Ferrari" },
  "bearman": { givenName: "Oliver", familyName: "Bearman", constructor: "Haas" },
  "russell": { givenName: "George", familyName: "Russell", constructor: "Mercedes" },
  "norris": { givenName: "Lando", familyName: "Norris", constructor: "McLaren" },
  "leclerc": { givenName: "Charles", familyName: "Leclerc", constructor: "Ferrari" },
  "antonelli": { givenName: "Kimi", familyName: "Antonelli", constructor: "Mercedes" },
};

export default function Home() {
  const { toast } = useToast();

  const { data: teams, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['/api/teams'],
    queryFn: getTeams,
  });

  const { data: standingsData, isLoading: isLoadingStandings } = useQuery({
    queryKey: ['/api/standings'],
    queryFn: getStandings,
  });

  const { data: scheduleData, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['/api/schedule'],
    queryFn: getSchedule,
  });

  const updateMutation = useMutation({
    mutationFn: updateStandings,
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/standings'], {
        standings: data.standings,
        podiums: data.podiums,
        lastUpdated: data.lastUpdated,
        season: data.season,
      });
      if (data.updated) {
        toast({
          title: "Standings Updated",
          description: "New results found! Points have been updated.",
        });
      } else {
        toast({
          title: "No New Results",
          description: "No new race results available. Points are already up to date.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not reach the F1 data service. Please try again later.",
        variant: "destructive",
      });
    },
  });

  const standings = standingsData?.standings;
  const podiums = standingsData?.podiums;

  const calculateTeamPoints = (driverIds: string[], standingsArr?: DriverStanding[]) => {
    if (!standingsArr) return 0;
    return driverIds.reduce((total, driverId) => {
      const driver = standingsArr.find(d => d.Driver.driverId === driverId);
      return total + (driver ? parseFloat(driver.points) : 0);
    }, 0);
  };

  const getDriverDetails = (driverId: string, standingsArr?: DriverStanding[]) => {
    if (!standingsArr) return null;
    return standingsArr.find(d => d.Driver.driverId === driverId);
  };

  const p1Ids = teams?.player1.driverIds || [];
  const p2Ids = teams?.player2.driverIds || [];
  const p1Points = calculateTeamPoints(p1Ids, standings);
  const p2Points = calculateTeamPoints(p2Ids, standings);
  const winningPlayer = p1Points > p2Points ? 1 : p2Points > p1Points ? 2 : 0;

  const renderTeamCard = (teamData: { name: string; driverIds: string[] } | undefined, playerNum: 1 | 2, points: number) => {
    if (!teamData) return null;
    const isWinning = winningPlayer === playerNum;

    const sortedDriverIds = [...teamData.driverIds].sort((a, b) => {
      const detailsA = getDriverDetails(a, standings);
      const detailsB = getDriverDetails(b, standings);
      const pointsA = detailsA ? parseFloat(detailsA.points) : 0;
      const pointsB = detailsB ? parseFloat(detailsB.points) : 0;
      return pointsB - pointsA;
    });

    return (
      <Card className={`glass-panel border-t-4 ${isWinning ? 'border-t-primary' : 'border-t-transparent'} transition-all duration-500`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-display flex items-center gap-2" data-testid={`text-team-name-${playerNum}`}>
              {teamData.name}
              {isWinning && <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />}
            </CardTitle>
            <div className="text-3xl font-display font-bold text-primary" data-testid={`text-team-points-${playerNum}`}>
              {points} <span className="text-sm text-muted-foreground">pts</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mt-4">
            {sortedDriverIds.map((driverId, idx) => {
              const details = getDriverDetails(driverId, standings);
              const fallback = DRIVER_FALLBACKS[driverId];

              return (
                <div key={driverId} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50 hover:border-primary/50 transition-colors" data-testid={`card-driver-${driverId}`}>
                  <div className="flex flex-col">
                    {details ? (
                      <>
                        <span className="font-semibold text-lg">{details.Driver.givenName} {details.Driver.familyName}</span>
                        <span className="text-sm text-muted-foreground">{details.Constructors[0]?.name || 'Unknown Team'}</span>
                      </>
                    ) : fallback ? (
                      <>
                        <span className="font-semibold text-lg text-muted-foreground">{fallback.givenName} {fallback.familyName}</span>
                        <span className="text-sm text-muted-foreground/70">{fallback.constructor} <span className="text-xs ml-1">(New for 2026)</span></span>
                      </>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Driver pending
                      </span>
                    )}
                  </div>
                  {details ? (
                    <div className="flex flex-col items-end">
                      <span className="font-display font-bold text-lg">{details.points}</span>
                      <span className="text-xs text-muted-foreground">{details.wins} Wins</span>
                    </div>
                  ) : fallback ? (
                    <div className="flex flex-col items-end opacity-50">
                      <span className="font-display font-bold text-lg">0</span>
                      <span className="text-xs text-muted-foreground">0 Wins</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const isLoading = isLoadingTeams || isLoadingStandings;

  return (
    <div className="min-h-screen container mx-auto px-4 py-8 max-w-6xl">
      <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter text-gradient mb-2 uppercase italic flex items-center gap-3">
            <Flag className="w-10 h-10 text-primary" />
            Apex Fantasy
          </h1>
          <p className="text-muted-foreground font-medium tracking-wide">Official F1 Head-to-Head Tracker</p>
        </div>

        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="f1-gradient text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all px-8 py-6 rounded-xl font-display font-bold text-lg"
          data-testid="button-update"
        >
          <RefreshCcw className={`w-5 h-5 mr-2 ${updateMutation.isPending ? 'animate-spin' : ''}`} />
          {updateMutation.isPending ? 'Updating...' : 'Update Points'}
        </Button>
      </header>

      <Tabs defaultValue="matchup" className="space-y-8">
        <TabsList className="bg-secondary/50 border border-border/50 p-1 rounded-xl h-14">
          <TabsTrigger value="matchup" className="rounded-lg font-display tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full px-8" data-testid="tab-matchup">Matchup</TabsTrigger>
          <TabsTrigger value="standings" className="rounded-lg font-display tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full px-8" data-testid="tab-standings">Full Standings</TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-lg font-display tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full px-8" data-testid="tab-schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="matchup" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-8">
              <Skeleton className="h-[400px] rounded-xl bg-secondary/50" />
              <Skeleton className="h-[400px] rounded-xl bg-secondary/50" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 relative">
              {renderTeamCard(teams?.player1, 1, p1Points)}

              <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-background border-2 border-primary items-center justify-center z-10 shadow-xl shadow-red-500/20">
                <span className="font-display font-bold text-xl italic">VS</span>
              </div>

              {renderTeamCard(teams?.player2, 2, p2Points)}
            </div>
          )}
          {standingsData?.lastUpdated && (
            <div className="text-center mt-8 text-sm text-muted-foreground" data-testid="text-last-synced">
              Last synced: {new Date(standingsData.lastUpdated).toLocaleTimeString()} ({standingsData.season} season)
            </div>
          )}
        </TabsContent>

        <TabsContent value="standings" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="font-display">Official Driver Standings</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStandings ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full bg-secondary/50" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                    <div className="col-span-1">Pos</div>
                    <div className="col-span-3">Driver</div>
                    <div className="col-span-3">Constructor</div>
                    <div className="col-span-2 text-center">Podiums</div>
                    <div className="col-span-1 text-center">Wins</div>
                    <div className="col-span-2 text-right">Points</div>
                  </div>
                  {standings?.map((driver) => (
                    <div key={driver.Driver.driverId} className="grid grid-cols-12 gap-4 px-4 py-3 items-center rounded-lg hover:bg-secondary/40 transition-colors border border-transparent hover:border-border/50" data-testid={`row-standing-${driver.Driver.driverId}`}>
                      <div className="col-span-1 font-display font-bold text-lg text-primary">{driver.position}</div>
                      <div className="col-span-3 font-semibold">{driver.Driver.givenName} {driver.Driver.familyName}</div>
                      <div className="col-span-3 text-muted-foreground">{driver.Constructors[0]?.name}</div>
                      <div className="col-span-2 text-center text-yellow-500 font-display">{podiums?.[driver.Driver.driverId] || 0}</div>
                      <div className="col-span-1 text-center">{driver.wins}</div>
                      <div className="col-span-2 text-right font-display font-bold">{driver.points}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Season Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSchedule ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full bg-secondary/50" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scheduleData?.schedule?.map((race) => {
                    const raceDate = new Date(race.date);
                    const isPast = raceDate < new Date();
                    return (
                      <div key={race.round} className={`p-4 rounded-xl border ${isPast ? 'bg-secondary/20 border-border/30 opacity-70' : 'bg-secondary/60 border-border/60 hover:border-primary/50'} transition-all`} data-testid={`card-race-${race.round}`}>
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant={isPast ? "secondary" : "default"} className={!isPast ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}>
                            Round {race.round}
                          </Badge>
                          <span className="text-sm font-medium">{raceDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1">{race.raceName}</h3>
                        <p className="text-sm text-muted-foreground">{race.Circuit.Location.locality}, {race.Circuit.Location.country}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}