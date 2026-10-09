// @vitest-environment jsdom
import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
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


// ---------------------------------------------------------------------------
// Opus data layer: task status model, legacy shapes, auto-promote
// ---------------------------------------------------------------------------

let ctx;
const Probe = () => {
    ctx = useData();
    return null;
};
const mount = () => render(<DataProvider><Probe /></DataProvider>);
// One call = one "event": React flushes between calls, like separate clicks.
const run = (fn) => act(() => { fn(ctx); });
const stored = (key) => JSON.parse(localStorage.getItem(key));

const T = {
    a: '2026-09-01T00:00:00.000Z',
    b: '2026-09-02T00:00:00.000Z',
    c: '2026-09-05T00:00:00.000Z',
    done: '2026-09-20T10:00:00.000Z',
};
const legacyTask = (id, extra = {}) => ({
    id, title: id, desc: '', done: false, createdAt: T.a, due: null,
    projectId: 'p1', isNextAction: false, status: null, schedule: 'today', ...extra,
});

describe('DataContext tasks: status model', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
        cleanup();
    });

    it('addTask creates a todo task with the mirrored done flag', () => {
        mount();
        let id;
        run((c) => { id = c.addTask('Write tests'); });
        expect(ctx.tasks).toHaveLength(1);
        expect(ctx.tasks[0]).toMatchObject({
            id, title: 'Write tests', status: 'todo', done: false, startedAt: null, doneAt: null, schedule: 'today',
        });
    });

    it('addTask ignores an empty title and returns nothing', () => {
        mount();
        let id = 'unset';
        run((c) => { id = c.addTask('   '); });
        expect(id).toBeUndefined();
        expect(ctx.tasks).toHaveLength(0);
    });

    it('updateTask applies the one status rule: doing, done, reopen', () => {
        mount();
        let id;
        run((c) => { id = c.addTask('Ship'); });

        run((c) => c.updateTask(id, { status: 'doing' }));
        const doing = ctx.tasks[0];
        expect(doing).toMatchObject({ status: 'doing', done: false });
        expect(doing.startedAt).toBeTruthy();
        expect(doing.doneAt).toBeNull();

        run((c) => c.updateTask(id, { status: 'done' }));
        const done = ctx.tasks[0];
        expect(done).toMatchObject({ status: 'done', done: true, startedAt: doing.startedAt });
        expect(done.doneAt).toBeTruthy();

        run((c) => c.updateTask(id, { status: 'doing' }));
        expect(ctx.tasks[0]).toMatchObject({ status: 'doing', done: false, doneAt: null, startedAt: doing.startedAt });
    });

    it('updateTask still accepts the legacy patches', () => {
        mount();
        let id;
        run((c) => { id = c.addTask('Legacy'); });

        run((c) => c.updateTask(id, { status: 'blocked' }));
        expect(ctx.tasks[0]).toMatchObject({ status: 'blocked', done: false });

        run((c) => c.updateTask(id, { status: null }));
        expect(ctx.tasks[0]).toMatchObject({ status: 'todo', done: false });

        run((c) => c.updateTask(id, { done: true }));
        expect(ctx.tasks[0]).toMatchObject({ status: 'done', done: true });
        expect(ctx.tasks[0].doneAt).toBeTruthy();

        run((c) => c.updateTask(id, { done: false }));
        expect(ctx.tasks[0]).toMatchObject({ status: 'todo', done: false, doneAt: null });

        run((c) => c.updateTask(id, { isNextAction: true, title: 'Renamed' }));
        expect(ctx.tasks[0]).toMatchObject({ isNextAction: true, title: 'Renamed', status: 'todo' });
    });

    it('toggleTask completes then reopens and no longer writes completedAt', () => {
        mount();
        let id;
        run((c) => { id = c.addTask('Toggle me'); });
        run((c) => c.toggleTask(id));
        expect(ctx.tasks[0]).toMatchObject({ status: 'done', done: true });
        expect(ctx.tasks[0].doneAt).toBeTruthy();
        expect('completedAt' in ctx.tasks[0]).toBe(false);
        run((c) => c.toggleTask(id));
        expect(ctx.tasks[0]).toMatchObject({ status: 'todo', done: false, doneAt: null });
    });

    it('toggleTask auto-promotes the next action: today before soon, oldest first, never blocked or other projects', () => {
        localStorage.setItem('maia.tasks', JSON.stringify([
            legacyTask('a', { isNextAction: true }),
            legacyTask('b', { schedule: 'soon', createdAt: T.b }),
            legacyTask('c', { createdAt: T.c }),
            legacyTask('d', { status: 'blocked', createdAt: T.b }),
            legacyTask('e', { projectId: 'p2', createdAt: T.a }),
        ]));
        mount();

        run((c) => c.toggleTask('a'));
        const byId = Object.fromEntries(ctx.tasks.map((t) => [t.id, t]));
        expect(byId.a).toMatchObject({ done: true, status: 'done', isNextAction: false });
        expect(byId.c.isNextAction).toBe(true);
        expect(byId.b.isNextAction).toBe(false);
        expect(byId.d.isNextAction).toBe(false);
        expect(byId.e.isNextAction).toBe(false);

        // Reopening keeps the flag where it is: no second promotion
        run((c) => c.toggleTask('a'));
        const reopened = Object.fromEntries(ctx.tasks.map((t) => [t.id, t]));
        expect(reopened.a).toMatchObject({ done: false, status: 'todo', isNextAction: false });
        expect(reopened.c.isNextAction).toBe(true);
    });

    it('a task completed from a board drop (status patch) promotes the next action too', () => {
        localStorage.setItem('maia.tasks', JSON.stringify([
            legacyTask('a', { isNextAction: true }),
            legacyTask('b', { createdAt: T.b }),
        ]));
        mount();
        run((c) => c.updateTask('a', { status: 'done' }));
        expect(ctx.tasks.find((t) => t.id === 'b').isNextAction).toBe(true);
        expect(ctx.tasks.find((t) => t.id === 'a').isNextAction).toBe(false);
    });

    it('normalizes legacy tasks on read but never rewrites storage for a read-only session', () => {
        const legacy = [
            legacyTask('open'),
            legacyTask('finished', { done: true, completedAt: T.done }),
            legacyTask('stuck', { status: 'blocked' }),
        ];
        const rawTasks = JSON.stringify(legacy);
        const rawProjects = JSON.stringify([{ id: 'p1', name: 'Old', milestones: [{ id: 'm1', title: 'M', date: '2026-10-01', done: true }] }]);
        localStorage.setItem('maia.tasks', rawTasks);
        localStorage.setItem('maia.projects', rawProjects);
        vi.useFakeTimers();

        const view = mount();

        const byId = Object.fromEntries(ctx.tasks.map((t) => [t.id, t]));
        expect(byId.open).toMatchObject({ status: 'todo', done: false, doneAt: null });
        expect(byId.finished).toMatchObject({ status: 'done', done: true, doneAt: T.done });
        expect(byId.stuck).toMatchObject({ status: 'blocked', done: false });
        expect(ctx.projects[0]).toMatchObject({ workstreams: [], decisions: [], questions: [], phase: null });
        expect(ctx.projects[0].milestones[0]).toMatchObject({ status: 'done', done: true, workstreamId: null });

        act(() => { vi.advanceTimersByTime(1500); }); // past the debounced write
        expect(localStorage.getItem('maia.tasks')).toBe(rawTasks);
        expect(localStorage.getItem('maia.projects')).toBe(rawProjects);
        view.unmount(); // and past the unmount flush
        expect(localStorage.getItem('maia.tasks')).toBe(rawTasks);
        expect(localStorage.getItem('maia.projects')).toBe(rawProjects);
    });

    it('only the edited task changes shape in storage; the others stay legacy', () => {
        const legacy = [legacyTask('a'), legacyTask('b', { createdAt: T.b })];
        localStorage.setItem('maia.tasks', JSON.stringify(legacy));
        const view = mount();
        run((c) => c.updateTask('a', { status: 'doing' }));
        view.unmount();
        const after = stored('maia.tasks');
        expect(after[0]).toMatchObject({ id: 'a', status: 'doing', done: false });
        expect(after[1]).toEqual(legacy[1]);
    });

    it('exposes the raw setters and the existing public API unchanged', () => {
        mount();
        [
            'notes', 'setNotes', 'notesMeta', 'projects', 'setProjects', 'ledger', 'setLedger',
            'tasks', 'setTasks', 'reminders', 'setReminders', 'sessions', 'setSessions',
            'createNote', 'updateNote', 'deleteNote', 'deleteAllNotes', 'renameNote', 'moveNoteToProject',
            'addProjectToNote', 'removeProjectFromNote', 'updateProject', 'deleteProject', 'createProject',
            'addTask', 'updateTask', 'deleteTask', 'toggleTask', 'setNextAction', 'addReminder',
            'createDecision', 'reviewDecision', 'deleteDecision', 'generateSamples',
        ].forEach((key) => expect(ctx, key).toHaveProperty(key));
        expect(typeof ctx.setTasks).toBe('function');
        expect(ctx).toHaveProperty('activity');
    });
});
