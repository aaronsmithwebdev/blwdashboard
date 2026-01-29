"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";

import type { ActionState } from "@/app/settings/actions";
import {
  createGroupEventMapping,
  deleteGroupEventMapping,
  updateEventCategory,
  updateGroupEventMapping
} from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { SubmitButton } from "./submit-button";

type EventCategory = {
  id: string;
  slug: string;
  display_name: string;
};

type EventGroup = {
  id: string;
  event_category_id: string;
  year: number;
};

type EventRow = {
  event_id: number;
  event_name: string | null;
  event_code: string | null;
};

type EventMapping = {
  id: string;
  event_group_id: string;
  event_id: number;
  include_in_reporting: boolean | null;
  notes: string | null;
};

const initialState: ActionState = { ok: true, message: "" };

function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p className={`text-xs ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.message}</p>
  );
}

function buildEventLabel(event: EventRow) {
  const name = event.event_name ?? "Unnamed event";
  const code = event.event_code ? `(${event.event_code})` : "";
  return `${name} ${code}`.trim();
}

export function EventMappingManager({
  mappings,
  groups,
  categories,
  events
}: {
  mappings: EventMapping[];
  groups: EventGroup[];
  categories: EventCategory[];
  events: EventRow[];
}) {
  const [createState, createAction] = useFormState(createGroupEventMapping, initialState);
  const [updateCategoryState, updateCategoryAction] = useFormState(
    updateEventCategory,
    initialState
  );
  const [updateState, updateAction] = useFormState(updateGroupEventMapping, initialState);
  const [deleteState, deleteAction] = useFormState(deleteGroupEventMapping, initialState);

  const createFormRef = useRef<HTMLFormElement | null>(null);
  const manageRef = useRef<HTMLDivElement | null>(null);
  const [selectedMappingId, setSelectedMappingId] = useState<string>("");
  const [editingCategoryId, setEditingCategoryId] = useState<string>("");

  useEffect(() => {
    if (createState.ok && createState.message) {
      createFormRef.current?.reset();
    }
  }, [createState]);

  useEffect(() => {
    if (updateCategoryState.ok && updateCategoryState.message) {
      setEditingCategoryId("");
    }
  }, [updateCategoryState]);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const eventMap = useMemo(() => new Map(events.map((e) => [e.event_id, e])), [events]);

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

  const mappingsByGroup = useMemo(() => {
    const map = new Map<string, EventMapping[]>();
    mappings.forEach((mapping) => {
      if (!map.has(mapping.event_group_id)) {
        map.set(mapping.event_group_id, []);
      }
      map.get(mapping.event_group_id)?.push(mapping);
    });
    return map;
  }, [mappings]);

  const mappingOptions = useMemo(() => {
    return mappings.map((mapping) => {
      const group = groupMap.get(mapping.event_group_id);
      const category = group ? categoryMap.get(group.event_category_id) : null;
      const event = eventMap.get(mapping.event_id);
      const label = `${category?.display_name ?? "Event"} ${group?.year ?? ""} - ${
        event ? buildEventLabel(event) : mapping.event_id
      }`;
      return { id: mapping.id, label };
    });
  }, [mappings, groupMap, categoryMap, eventMap]);

  const selectedMapping = useMemo(
    () => mappings.find((mapping) => mapping.id === selectedMappingId) ?? null,
    [mappings, selectedMappingId]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Mapping</CardTitle>
          <CardDescription>Assign Funraisin events into a year-based group.</CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 || events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create groups and sync events before adding mappings.
            </p>
          ) : (
            <form ref={createFormRef} action={createAction} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event_group_id">Event group (year)</Label>
                <select
                  id="event_group_id"
                  name="event_group_id"
                  className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm"
                  required
                >
                  {groups.map((group) => {
                    const category = categoryMap.get(group.event_category_id);
                    return (
                      <option key={group.id} value={group.id}>
                        {category?.display_name ?? "Event"} - {group.year}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_id">Funraisin event</Label>
                <select
                  id="event_id"
                  name="event_id"
                  className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm"
                  required
                >
                  {events.map((event) => (
                    <option key={event.event_id} value={event.event_id}>
                      {buildEventLabel(event)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 flex items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="include_in_reporting" defaultChecked />
                  Include in reporting
                </label>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <input
                  id="notes"
                  name="notes"
                  placeholder="Optional notes"
                  className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <SubmitButton label="Create mapping" pendingLabel="Creating..." />
                <FormMessage state={createState} />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card ref={manageRef}>
        <CardHeader>
          <CardTitle>Manage Mappings</CardTitle>
          <CardDescription>Update or remove existing mappings.</CardDescription>
        </CardHeader>
        <CardContent>
          {mappingOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mappings available.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="mapping_select">Select mapping</Label>
                <select
                  id="mapping_select"
                  className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm"
                  value={selectedMappingId}
                  onChange={(event) => setSelectedMappingId(event.target.value)}
                >
                  <option value="">Select a mapping</option>
                  {mappingOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {selectedMapping ? (
                <form
                  key={selectedMapping.id}
                  action={updateAction}
                  className="md:col-span-2 grid gap-4 rounded-lg border border-border/70 bg-muted/30 p-4"
                >
                  <input type="hidden" name="id" value={selectedMapping.id} />
                  <select
                    name="event_group_id"
                    defaultValue={selectedMapping.event_group_id}
                    className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm"
                    required
                  >
                    {groups.map((group) => {
                      const category = categoryMap.get(group.event_category_id);
                      return (
                        <option key={group.id} value={group.id}>
                          {category?.display_name ?? "Event"} - {group.year}
                        </option>
                      );
                    })}
                  </select>
                  <select
                    name="event_id"
                    defaultValue={selectedMapping.event_id}
                    className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm"
                    required
                  >
                    {events.map((event) => (
                      <option key={event.event_id} value={event.event_id}>
                        {buildEventLabel(event)}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="include_in_reporting"
                      defaultChecked={selectedMapping.include_in_reporting ?? true}
                    />
                    Include in reporting
                  </label>
                  <input
                    name="notes"
                    defaultValue={selectedMapping.notes ?? ""}
                    placeholder="Notes"
                    className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <SubmitButton label="Save mapping" pendingLabel="Saving..." />
                    <FormMessage state={updateState} />
                  </div>
                </form>
              ) : null}
              {selectedMapping ? (
                <form action={deleteAction} className="md:col-span-2 flex items-center gap-3">
                  <input type="hidden" name="id" value={selectedMapping.id} />
                  <SubmitButton label="Delete mapping" pendingLabel="Deleting..." variant="outline" />
                  <FormMessage state={deleteState} />
                </form>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grouped Events</CardTitle>
          <CardDescription>Events organized by category and year.</CardDescription>
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
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{category.display_name}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditingCategoryId((prev) => (prev === category.id ? "" : category.id))
                        }
                      >
                        Edit name
                      </Button>
                    </div>
                    {editingCategoryId === category.id ? (
                      <form
                        action={updateCategoryAction}
                        className="mt-3 grid gap-3 rounded-md border border-border/60 bg-muted/40 p-3"
                      >
                        <input type="hidden" name="id" value={category.id} />
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`display_name_${category.id}`}>Display name</Label>
                            <Input
                              id={`display_name_${category.id}`}
                              name="display_name"
                              defaultValue={category.display_name}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`slug_${category.id}`}>Slug</Label>
                            <Input
                              id={`slug_${category.id}`}
                              name="slug"
                              defaultValue={category.slug}
                              required
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <SubmitButton label="Save group name" pendingLabel="Saving..." />
                          <FormMessage state={updateCategoryState} />
                        </div>
                      </form>
                    ) : null}
                    {groupList.map((group) => {
                      const groupMappings = mappingsByGroup.get(group.id) ?? [];
                      return (
                        <div key={group.id} className="mt-3 rounded-md border border-border/60 p-3">
                          <div className="flex items-center justify-between text-sm font-medium">
                            <span>{group.year}</span>
                            <span className="text-xs text-muted-foreground">
                              {groupMappings.length} mapped
                            </span>
                          </div>
                          {groupMappings.length === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">No events mapped yet.</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Event</TableHead>
                                  <TableHead>Reporting</TableHead>
                                  <TableHead className="text-right">Edit</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {groupMappings.map((mapping) => {
                                  const event = eventMap.get(mapping.event_id);
                                  return (
                                    <TableRow
                                      key={mapping.id}
                                      onClick={() => {
                                        setSelectedMappingId(mapping.id);
                                        manageRef.current?.scrollIntoView({
                                          behavior: "smooth",
                                          block: "start"
                                        });
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <TableCell>
                                        {event ? buildEventLabel(event) : mapping.event_id}
                                      </TableCell>
                                      <TableCell>
                                        {mapping.include_in_reporting === false ? "Off" : "On"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={(eventClick) => {
                                            eventClick.stopPropagation();
                                            setSelectedMappingId(mapping.id);
                                            manageRef.current?.scrollIntoView({
                                              behavior: "smooth",
                                              block: "start"
                                            });
                                          }}
                                        >
                                          Edit
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
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

