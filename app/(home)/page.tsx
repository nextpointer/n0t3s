"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Github, NotebookPen } from "lucide-react";
import { useState, useEffect } from "react";

export default function Home() {
  return (
    <>
      <title>Next Notes</title>
      <div className="w-full md:w-2xl h-screen flex flex-col justify-start items-start">
        <div className="flex flex-row justify-end items-center w-full gap-2">
          <h1 className="mr-auto text-2xl font-semibold">Next Notes</h1>
          <Button variant={"outline"}>
            <Github />
          </Button>
          <Button>
            <NotebookPen className="mr-1" /> New Note
          </Button>
        </div>
        <div className="flex flex-row w-full gap-2 mt-12 justify-start items-center">
          <Select>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All tags</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sort by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="newest">Newer first</SelectItem>
                <SelectItem value="oldest">Older first</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
