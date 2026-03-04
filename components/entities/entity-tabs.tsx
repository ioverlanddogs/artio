"use client";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EntityTabsProps = {
  artworks?: ReactNode;
  upcoming: ReactNode;
  past?: ReactNode;
  artists?: ReactNode;
  about: ReactNode;
};

export function EntityTabs({ artworks, upcoming, past, artists, about }: EntityTabsProps) {
  const defaultValue = artworks ? "artworks" : "upcoming";
  return (
    <Tabs defaultValue={defaultValue} className="space-y-4">
      <TabsList>
        {artworks ? <TabsTrigger value="artworks">Artworks</TabsTrigger> : null}
        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        {past ? <TabsTrigger value="past">Past</TabsTrigger> : null}
        {artists ? <TabsTrigger value="artists">Artists</TabsTrigger> : null}
        <TabsTrigger value="about">About</TabsTrigger>
      </TabsList>
      {artworks ? <TabsContent value="artworks">{artworks}</TabsContent> : null}
      <TabsContent value="upcoming">{upcoming}</TabsContent>
      {past ? <TabsContent value="past">{past}</TabsContent> : null}
      {artists ? <TabsContent value="artists">{artists}</TabsContent> : null}
      <TabsContent value="about">{about}</TabsContent>
    </Tabs>
  );
}
