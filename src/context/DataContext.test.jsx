// @vitest-environment jsdom
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataProvider, useData } from './DataContext';

// Helper component to expose context values and actions
const TestComponent = () => {
    const {
        notes,
        projects,
        tasks,
        createNote,
        addTask,
        createProject,
        addProjectToNote,
        deleteProject
    } = useData();

    // Helper to link first note to "Project A"
    const linkProject = () => {
        const note = notes[0];
        const project = projects.find(p => p.name === "Project A");
        if (note && project) {
            addProjectToNote(note.id, project.id);
        }
    };

    // Helper to delete "Project A"
    const delProject = () => {
        const project = projects.find(p => p.name === "Project A");
        if (project) deleteProject(project.id);
    };

    return (
        <div>
            <div data-testid="notes-count">{notes.length}</div>
            <div data-testid="tasks-count">{tasks.length}</div>
            <div data-testid="projects-count">{projects.length}</div>

            <ul data-testid="project-list">
                {projects.map(p => (
                    <li key={p.id} data-testid="project-item">
                        {p.name}:{p.id}
                    </li>
                ))}
            </ul>

            <ul data-testid="note-list">
                {notes.map(n => (
                    <li key={n.id} data-testid="note-item">
                        {n.title} - Projects: {(n.projectIds || []).join(',')}
                    </li>
                ))}
            </ul>

            <button onClick={() => createNote()}>Create Note</button>
            <button onClick={() => addTask("New Task")}>Add Task</button>
            <button onClick={() => createProject("Project A")}>Create Project A</button>
            <button onClick={linkProject}>Link P1 to N1</button>
            <button onClick={delProject}>Delete Project A</button>
        </div>
    );
};

describe('DataContext', () => {
    beforeEach(() => {
        // Clear localStorage before each test to ensure clean state
        localStorage.clear();
        // Clear any mocks
        vi.restoreAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('Adding a Note/Task updates the state', async () => {
        const user = userEvent.setup();
        render(
            <DataProvider>
                <TestComponent />
            </DataProvider>
        );

        // Initial counts (localStorage is cleared in beforeEach, so both start at 0)
        expect(screen.getByTestId('notes-count').textContent).toBe('0');
        expect(screen.getByTestId('tasks-count').textContent).toBe('0');

        // Add Note
        await user.click(screen.getByText('Create Note'));
        expect(screen.getByTestId('notes-count').textContent).toBe('1');

        // Add Task
        await user.click(screen.getByText('Add Task'));
        expect(screen.getByTestId('tasks-count').textContent).toBe('1');
    });

    it('Deleting a Project cascades correctly', async () => {
        const user = userEvent.setup();
        render(
            <DataProvider>
                <TestComponent />
            </DataProvider>
        );

        // 0. Create a Note first (none exist after localStorage.clear)
        await user.click(screen.getByText('Create Note'));
        expect(screen.getByTestId('notes-count').textContent).toBe('1');

        // 1. Create Project A
        await user.click(screen.getByText('Create Project A'));
        expect(screen.getByTestId('projects-count').textContent).toBe('1');

        // Capture Project ID
        const projectItems = screen.getAllByTestId('project-item');
        const projectAItem = projectItems.find(item => item.textContent.includes('Project A'));
        expect(projectAItem).toBeDefined();
        const projectId = projectAItem.textContent.split(':')[1];
        expect(projectId).toBeTruthy();

        // 1b. Create a Note to link
        await user.click(screen.getByText('Create Note'));
        expect(screen.getByTestId('notes-count').textContent).toBe('1');

        // 2. Link Project A to the first note (N1)
        await user.click(screen.getByText('Link P1 to N1'));

        // Verify link exists in note list
        const noteList = screen.getByTestId('note-list');
        expect(noteList.textContent).toContain(projectId);

        // 3. Delete Project A
        await user.click(screen.getByText('Delete Project A'));

        // 4. Verify Project is gone
        expect(screen.getByTestId('projects-count').textContent).toBe('0');

        // 5. Verify Note no longer has the project ID
        expect(screen.getByTestId('note-list').textContent).not.toContain(projectId);
    });

    it('localStorage sync works as expected', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        render(
            <DataProvider>
                <TestComponent />
            </DataProvider>
        );

        await user.click(screen.getByText('Create Note'));

        // Advance past the 1-second debounce in useLocalStorage
        await vi.advanceTimersByTimeAsync(1100);

        // Expect 'maia.notes' to be updated with new data
        expect(setItemSpy).toHaveBeenCalledWith('maia.notes', expect.stringContaining('Untitled'));

        vi.useRealTimers();
    });
});
