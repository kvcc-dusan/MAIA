// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import NoteHeader from "./NoteHeader.jsx";

afterEach(cleanup);
const crumb = () => screen.getByText("engineering-pack").closest("p");

describe("NoteHeader breadcrumb", () => {
  it("shows the folders a note lives in, like Obsidian", () => {
    render(<NoteHeader title="engineering-pack" folder="Projects/_team-pack/00-Foundation" />);
    expect(crumb()).toHaveTextContent("Projects/_team-pack/00-Foundation/engineering-pack");
  });

  it("falls back to the vault name for a note at the top level", () => {
    render(<NoteHeader title="engineering-pack" folder="" />);
    expect(crumb()).toHaveTextContent("MAIA/engineering-pack");
  });

  it("ignores stray slashes in the folder value", () => {
    render(<NoteHeader title="engineering-pack" folder="/Omnis//PROJECTS/" />);
    expect(crumb()).toHaveTextContent("Omnis/PROJECTS/engineering-pack");
  });
});
