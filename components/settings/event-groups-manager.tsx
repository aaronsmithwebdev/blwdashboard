"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";

import type { ActionState } from "@/app/settings/actions";
import {
  createEventCategory,
  createEventGroup,
  deleteEventCategory,
  deleteEventGroup,
  updateEventCategory,
  updateEventGroup
} from "@/app/settings/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { SubmitButton } from "./submit-button";

type EventCategory = {
  id: string;
  slug: string;
  display_name: string;
  created_at?: string;
};

type EventGroup = {
  id: string;
  event_category_id: string;
  year: number;
  created_at?: string;
};

const initialState: ActionState = { ok: true, message: "" };

function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p className={`text-xs ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.message}</p>
  );
}

export function EventGroupsManager({
  categories,
  groups,
  mappingCounts
}: {
  categories: EventCategory[];
  groups: EventGroup[];
  mappingCounts: Record<string, number>;
}) {
  const [createCategoryState, createCategoryAction] = useFormState(
    createEventCategory,
    initialState
  );
  const [createGroupState, createGroupAction] = useFormState(createEventGroup, initialState);
  const [updateCategoryState, updateCategoryAction] = useFormState(
    updateEventCategory,
    initialState
  );
  const [deleteCategoryState, deleteCategoryAction] = useFormState(
    deleteEventCategory,
    initialState
  );
  const [updateGroupState, updateGroupAction] = useFormState(updateEventGroup, initialState);
  const [deleteGroupState, deleteGroupAction] = useFormState(deleteEventGroup, initialState);

  const categoryFormRef = useRef<HTMLFormElement | null>(null);
  const groupFormRef = useRef<HTMLFormElement | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  useEffect(() => {
    if (createCategoryState.ok && createCategoryState.message) {
      categoryFormRef.current?.reset();
    }
  }, [createCategoryState]);

  useEffect(() => {
    if (createGroupState.ok && createGroupState.message) {
      groupFormRef.current?.reset();
    }
  }, [createGroupState]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

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
          <CardTitle>Create Event Category</CardTitle>
          <CardDescription>Define the core event series (e.g., Sydney East).</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={categoryFormRef} action={createCategoryAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" placeholder="sydney-east" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">Display name</Label>
              <Input id="display_name" name="display_name" placeholder="Sydney East" required />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <SubmitButton label="Create category" pendingLabel="Creating..." />
              <FormMessage state={createCategoryState} />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Event Group (Year)</CardTitle>
          <CardDescription>Attach a year to a category for reporting.</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add at least one event category before creating groups.
            </p>
          ) : (
            <form ref={groupFormRef} action={createGroupAction} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event_category_id">Event category</Label>
                <select
                  id="event_category_id"
                  name="event_category_id"
                  className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm"
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input id="year" name="year" type="number" placeholder="2025" required />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <SubmitButton label="Create group" pendingLabel="Creating..." />
                <FormMessage state={createGroupState} />
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Event Categories</CardTitle>
            <CardDescription>Select a category to update or remove it.</CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Groups</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`cursor-pointer ${selectedCategoryId === category.id ? "bg-muted/40" : ""}`}
                    >
                      <TableCell>{category.display_name}</TableCell>
                      <TableCell>{category.slug}</TableCell>
                      <TableCell>{groupsByCategory.get(category.id)?.length ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {selectedCategory ? (
              <form
                key={selectedCategory.id}
                action={updateCategoryAction}
                className="mt-4 grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-4"
              >
                <input type="hidden" name="id" value={selectedCategory.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input name="slug" defaultValue={selectedCategory.slug} required />
                  <Input name="display_name" defaultValue={selectedCategory.display_name} required />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SubmitButton label="Save category" pendingLabel="Saving..." />
                  <FormMessage state={updateCategoryState} />
                </div>
              </form>
            ) : null}
            {selectedCategory ? (
              <form action={deleteCategoryAction} className="mt-2 flex items-center gap-3">
                <input type="hidden" name="id" value={selectedCategory.id} />
                <SubmitButton label="Delete category" pendingLabel="Deleting..." variant="outline" />
                <FormMessage state={deleteCategoryState} />
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Groups by Year</CardTitle>
            <CardDescription>Grouped by category, ordered by year.</CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups yet.</p>
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
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Year</TableHead>
                            <TableHead>Mapped events</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupList.map((group) => (
                            <TableRow
                              key={group.id}
                              onClick={() => setSelectedGroupId(group.id)}
                              className={`cursor-pointer ${selectedGroupId === group.id ? "bg-muted/40" : ""}`}
                            >
                              <TableCell>{group.year}</TableCell>
                              <TableCell>{mappingCounts[group.id] ?? 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedGroup ? (
              <form
                key={selectedGroup.id}
                action={updateGroupAction}
                className="mt-4 grid gap-3 rounded-lg border border-border/70 bg-muted/30 p-4"
              >
                <input type="hidden" name="id" value={selectedGroup.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    name="event_category_id"
                    defaultValue={selectedGroup.event_category_id}
                    className="h-10 rounded-md border border-input bg-background/70 px-3 text-sm"
                    required
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.display_name}
                      </option>
                    ))}
                  </select>
                  <Input name="year" type="number" defaultValue={selectedGroup.year} required />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SubmitButton label="Save group" pendingLabel="Saving..." />
                  <FormMessage state={updateGroupState} />
                </div>
              </form>
            ) : null}
            {selectedGroup ? (
              <form action={deleteGroupAction} className="mt-2 flex items-center gap-3">
                <input type="hidden" name="id" value={selectedGroup.id} />
                <SubmitButton label="Delete group" pendingLabel="Deleting..." variant="outline" />
                <FormMessage state={deleteGroupState} />
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
