"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";

import type { ActionState } from "@/app/settings/actions";
import {
  createEventGroupDiscount,
  deleteEventGroupDiscount,
  updateEventGroupDiscount
} from "@/app/settings/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { SubmitButton } from "./submit-button";

type EventCategory = {
  id: string;
  display_name: string;
};

type EventGroup = {
  id: string;
  event_category_id: string;
  year: number;
};

type DiscountTier = {
  id: string;
  event_group_id: string;
  label: string;
  discount_amount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
};

const initialState: ActionState = { ok: true, message: "" };

function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p className={`text-xs ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.message}</p>
  );
}

export function DiscountsManager({
  categories,
  groups,
  tiers
}: {
  categories: EventCategory[];
  groups: EventGroup[];
  tiers: DiscountTier[];
}) {
  const [createState, createAction] = useFormState(createEventGroupDiscount, initialState);
  const [updateState, updateAction] = useFormState(updateEventGroupDiscount, initialState);
  const [deleteState, deleteAction] = useFormState(deleteEventGroupDiscount, initialState);

  const createRef = useRef<HTMLFormElement | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>("");

  useEffect(() => {
    if (createState.ok && createState.message) {
      createRef.current?.reset();
    }
  }, [createState]);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const groupOptions = useMemo(() => {
    return groups
      .map((group) => {
        const category = categoryMap.get(group.event_category_id);
        return {
          id: group.id,
          label: `${category?.display_name ?? "Event"} · ${group.year}`
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [groups, categoryMap]);

  const tierOptions = useMemo(() => {
    return tiers
      .map((tier) => {
        const group = groupMap.get(tier.event_group_id);
        const category = group ? categoryMap.get(group.event_category_id) : null;
        const label = `${category?.display_name ?? "Event"} · ${group?.year ?? ""} · ${tier.label}`;
        return { id: tier.id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tiers, groupMap, categoryMap]);

  const selectedTier = useMemo(
    () => tiers.find((tier) => tier.id === selectedTierId) ?? null,
    [tiers, selectedTierId]
  );

  const tiersByGroup = useMemo(() => {
    const map = new Map<string, DiscountTier[]>();
    tiers.forEach((tier) => {
      if (!map.has(tier.event_group_id)) {
        map.set(tier.event_group_id, []);
      }
      map.get(tier.event_group_id)?.push(tier);
    });
    map.forEach((list) => list.sort((a, b) => (a.ends_at ?? "").localeCompare(b.ends_at ?? "")));
    return map;
  }, [tiers]);

  const groupsByCategory = useMemo(() => {
    const map = new Map<string, EventGroup[]>();
    groups.forEach((group) => {
      if (!map.has(group.event_category_id)) {
        map.set(group.event_category_id, []);
      }
      map.get(group.event_category_id)?.push(group);
    });
    map.forEach((list) => list.sort((a, b) => b.year - a.year));
    return map;
  }, [groups]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Discount Tier</CardTitle>
          <CardDescription>Define pricing windows per event year.</CardDescription>
        </CardHeader>
        <CardContent>
          {groupOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create event groups before adding discount tiers.
            </p>
          ) : (
            <form ref={createRef} action={createAction} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event_group_id">Event group</Label>
                <select
                  id="event_group_id"
                  name="event_group_id"
                  className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm"
                  required
                >
                  {groupOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="label">Tier name</Label>
                <Input id="label" name="label" placeholder="Early Bird" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_amount">Discount amount</Label>
                <Input id="discount_amount" name="discount_amount" type="number" step="0.01" placeholder="20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="starts_at">Starts at</Label>
                <Input id="starts_at" name="starts_at" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends_at">Ends at</Label>
                <Input id="ends_at" name="ends_at" type="date" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="Optional notes" />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <SubmitButton label="Create tier" pendingLabel="Creating..." />
                <FormMessage state={createState} />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Discount Tiers</CardTitle>
          <CardDescription>Edit or remove an existing tier.</CardDescription>
        </CardHeader>
        <CardContent>
          {tierOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tiers created yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tier_select">Select tier</Label>
                <select
                  id="tier_select"
                  className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm"
                  value={selectedTierId}
                  onChange={(event) => setSelectedTierId(event.target.value)}
                >
                  <option value="">Select a tier</option>
                  {tierOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {selectedTier ? (
                <form
                  key={selectedTier.id}
                  action={updateAction}
                  className="md:col-span-2 grid gap-4 rounded-lg border border-border/70 bg-muted/30 p-4"
                >
                  <input type="hidden" name="id" value={selectedTier.id} />
                  <select
                    name="event_group_id"
                    defaultValue={selectedTier.event_group_id}
                    className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm"
                    required
                  >
                    {groupOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Input name="label" defaultValue={selectedTier.label} required />
                  <Input
                    name="discount_amount"
                    type="number"
                    step="0.01"
                    defaultValue={selectedTier.discount_amount ?? ""}
                  />
                  <Input name="starts_at" type="date" defaultValue={selectedTier.starts_at ?? ""} />
                  <Input name="ends_at" type="date" defaultValue={selectedTier.ends_at ?? ""} />
                  <Input name="notes" defaultValue={selectedTier.notes ?? ""} placeholder="Notes" />
                  <div className="flex flex-wrap items-center gap-3">
                    <SubmitButton label="Save tier" pendingLabel="Saving..." />
                    <FormMessage state={updateState} />
                  </div>
                </form>
              ) : null}
              {selectedTier ? (
                <form action={deleteAction} className="md:col-span-2 flex items-center gap-3">
                  <input type="hidden" name="id" value={selectedTier.id} />
                  <SubmitButton label="Delete tier" pendingLabel="Deleting..." variant="outline" />
                  <FormMessage state={deleteState} />
                </form>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discount Schedule</CardTitle>
          <CardDescription>Event categories grouped by year.</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No event categories available.</p>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => {
                const groupList = groupsByCategory.get(category.id) ?? [];
                if (groupList.length === 0) {
                  return null;
                }
                return (
                  <div key={category.id} className="rounded-lg border border-border/70 bg-white/60 p-3">
                    <p className="text-sm font-semibold">{category.display_name}</p>
                    {groupList.map((group) => {
                      const groupTiers = tiersByGroup.get(group.id) ?? [];
                      return (
                        <div
                          key={group.id}
                          className="mt-3 rounded-md border border-border/60 bg-background/70 p-3"
                        >
                          <div className="flex items-center justify-between text-sm font-medium">
                            <span>{group.year}</span>
                            <span className="text-xs text-muted-foreground">
                              {groupTiers.length} tiers
                            </span>
                          </div>
                          {groupTiers.length === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">No tiers added yet.</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Tier</TableHead>
                                  <TableHead>Discount</TableHead>
                                  <TableHead>Window</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {groupTiers.map((tier) => (
                                  <TableRow key={tier.id}>
                                    <TableCell>{tier.label}</TableCell>
                                  <TableCell>
                                    {tier.discount_amount !== null ? `$${tier.discount_amount}` : "--"}
                                  </TableCell>
                                    <TableCell>
                                      {tier.starts_at ?? "--"} to {tier.ends_at ?? "--"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
