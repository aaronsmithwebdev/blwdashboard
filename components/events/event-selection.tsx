"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type EventGroupOption = {
  id: string;
  categoryId: string;
  categoryName: string;
  year: number;
};

type EventSelectionProps = {
  groups: EventGroupOption[];
  selectedGroupId: string;
  selectedCompareId: string | null;
  offsetDays: number;
  projectionEnabled: boolean;
  projectionDate: string;
};

function buildGroupLabel(group: EventGroupOption) {
  return `${group.categoryName} ${group.year}`;
}

export function EventSelection({
  groups,
  selectedGroupId,
  selectedCompareId,
  offsetDays,
  projectionEnabled,
  projectionDate
}: EventSelectionProps) {
  const initialGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0];
  const [groupId, setGroupId] = useState(initialGroup?.id ?? "");
  const [compareId, setCompareId] = useState(selectedCompareId ?? "none");
  const [offset, setOffset] = useState(offsetDays);
  const [projectionOn, setProjectionOn] = useState(projectionEnabled);
  const [projectionDay, setProjectionDay] = useState(projectionDate);

  useEffect(() => {
    setProjectionOn(projectionEnabled);
  }, [projectionEnabled]);

  useEffect(() => {
    setProjectionDay(projectionDate);
  }, [projectionDate]);

  const selectedGroup = groups.find((group) => group.id === groupId) ?? groups[0];
  const relatedGroups = selectedGroup
    ? groups
        .filter((group) => group.categoryId === selectedGroup.categoryId)
        .sort((a, b) => b.year - a.year)
    : [];
  const compareOptions = selectedGroup
    ? relatedGroups.filter((group) => group.id !== selectedGroup.id)
    : [];

  useEffect(() => {
    if (!selectedGroup) return;
    if (compareId === "none") return;
    const isValid = compareOptions.some((group) => group.id === compareId);
    if (isValid) return;
    const previousYear = compareOptions.find((group) => group.year === selectedGroup.year - 1);
    setCompareId(previousYear?.id ?? "none");
  }, [compareId, compareOptions, selectedGroup]);

  if (!selectedGroup) return null;

  return (
    <form method="get" className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label htmlFor="group">Event group</Label>
        <select
          id="group"
          name="group"
          className="h-10 min-w-[220px] rounded-md border border-input bg-background/70 px-3 text-sm"
          value={groupId}
          onChange={(event) => {
            const nextGroupId = event.target.value;
            const nextGroup = groups.find((group) => group.id === nextGroupId) ?? groups[0];
            const nextRelated = groups
              .filter((group) => group.categoryId === nextGroup.categoryId)
              .sort((a, b) => b.year - a.year);
            const nextCompareOptions = nextRelated.filter((group) => group.id !== nextGroup.id);
            const previousYear = nextCompareOptions.find(
              (group) => group.year === nextGroup.year - 1
            );
            setGroupId(nextGroupId);
            setCompareId(previousYear?.id ?? "none");
          }}
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {buildGroupLabel(group)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="compare">Compare to</Label>
        <select
          id="compare"
          name="compare"
          key={selectedGroup.id}
          className="h-10 min-w-[200px] rounded-md border border-input bg-background/70 px-3 text-sm"
          value={compareId}
          onChange={(event) => setCompareId(event.target.value)}
        >
          <option value="none">No comparison</option>
          {compareOptions.map((group) => (
            <option key={group.id} value={group.id}>
              {buildGroupLabel(group)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="offset">Offset days</Label>
        <input
          id="offset"
          name="offset"
          type="number"
          step="1"
          value={offset}
          onChange={(event) => setOffset(Number(event.target.value))}
          className="h-10 w-[140px] rounded-md border border-input bg-background/70 px-3 text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="projectionDate">Projection date</Label>
        <input
          id="projectionDate"
          name="projectionDate"
          type="date"
          value={projectionDay}
          onChange={(event) => setProjectionDay(event.target.value)}
          className="h-10 w-[170px] rounded-md border border-input bg-background/70 px-3 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="projection"
          value="1"
          checked={projectionOn}
          onChange={(event) => setProjectionOn(event.target.checked)}
        />
        Show progression
      </label>
      <Button type="submit">Apply</Button>
    </form>
  );
}
