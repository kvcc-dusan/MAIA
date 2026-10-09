// @vitest-environment jsdom
// Opus data layer in DataContext: embedded project collections, activity log,
// delete cascades and the "status never diverges from done" invariant.
// (Status transitions and legacy-shape reads live in DataContext.test.jsx.)
import React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataProvider, useData } from './DataContext';
import { ACTIVITY_CAP } from '../features/Opus/lib/activityLog.js';
import { TASK_STATUSES } from '../features/Opus/lib/taskModel.js';

let ctx;
const Probe = () => {
    ctx = useData();
    return null;
};
const mount = () => render(<DataProvider><Probe /></DataProvider>);
const run = (fn) => act(() => { fn(ctx); });
const stored = (key) => JSON.parse(localStorage.getItem(key));
const project = (id) => ctx.projects.find((p) => p.id === id);

// Creates a project and returns its id.
const makeProject = (name = 'Alpha') => {
    let id;
    run((c) => { id = c.createProject(name).id; });
    return id;
};

describe('DataContext Opus layer', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
        cleanup();
    });

    describe('projects', () => {
        it('createProject adds the new empty Opus fields', () => {
            mount();
            const id = makeProject();
            expect(project(id)).toMatchObject({
                name: 'Alpha', startDate: null, targetDate: null, phase: null, nextMeeting: null,
                workstreams: [], decisions: [], questions: [], milestones: [],
            });
        });

        it('updateProject still works with legacy milestone writes (done flipped by hand)', () => {
            mount();
            const id = makeProject();
            let mid;
            run((c) => { mid = c.addMilestone(id, { title: 'Alpha', date: '2026-10-20' }); });
            expect(project(id).milestones[0]).toMatchObject({ id: mid, status: 'planned', done: false });

            run((c) => c.updateProject(id, {
                milestones: project(id).milestones.map((m) => ({ ...m, done: true })),
            }));
            expect(project(id).milestones[0]).toMatchObject({ status: 'done', done: true });

            run((c) => c.updateProject(id, { phase: 'Build', name: 'Renamed' }));
            expect(project(id)).toMatchObject({ phase: 'Build', name: 'Renamed' });
        });

        it('deleteProject unassigns tasks (project, workstream, milestone) and removes only its activity', () => {
            mount();
            const doomed = makeProject('Doomed');
            const kept = makeProject('Kept');
            let taskId; let keptTaskId; let wsId; let msId;
            run((c) => { taskId = c.addTask('In doomed', null, '', doomed); });
            run((c) => { keptTaskId = c.addTask('In kept', null, '', kept); });
            run((c) => { wsId = c.addWorkstream(doomed, { name: 'WS' }); });
            run((c) => { msId = c.addMilestone(doomed, { title: 'MS' }); });
            run((c) => c.updateTask(taskId, { workstreamId: wsId, milestoneId: msId }));
            expect(ctx.activity.some((a) => a.projectId === doomed)).toBe(true);

            run((c) => c.deleteProject(doomed));

            expect(ctx.projects.map((p) => p.id)).toEqual([kept]);
            const task = ctx.tasks.find((t) => t.id === taskId);
            expect(task).toMatchObject({ projectId: null, workstreamId: null, milestoneId: null });
            expect(ctx.tasks.find((t) => t.id === keptTaskId).projectId).toBe(kept);
            expect(ctx.activity.some((a) => a.projectId === doomed)).toBe(false);
            expect(ctx.activity.some((a) => a.projectId === kept)).toBe(true);
        });
    });

    describe('workstreams', () => {
        it('cycles colors 1 to 4 and appends order', () => {
            mount();
            const id = makeProject();
            for (let i = 0; i < 5; i++) {
                run((c) => c.addWorkstream(id, { name: `W${i}` }));
            }
            const list = project(id).workstreams;
            expect(list.map((w) => w.color)).toEqual(['1', '2', '3', '4', '1']);
            expect(list.map((w) => w.order)).toEqual([0, 1, 2, 3, 4]);
            expect(list[0]).toMatchObject({ name: 'W0', status: 'active', owner: '' });
        });

        it('updateWorkstream merges the patch and leaves the others alone', () => {
            mount();
            const id = makeProject();
            let a; let b;
            run((c) => { a = c.addWorkstream(id, { name: 'A' }); });
            run((c) => { b = c.addWorkstream(id, { name: 'B' }); });
            run((c) => c.updateWorkstream(id, a, { name: 'A2', owner: 'Ana' }));
            expect(project(id).workstreams.find((w) => w.id === a)).toMatchObject({ name: 'A2', owner: 'Ana' });
            expect(project(id).workstreams.find((w) => w.id === b).name).toBe('B');
        });

        it('deleting a workstream clears references on tasks, milestones, decisions and questions', () => {
            mount();
            const id = makeProject();
            let doomed; let other; let t1; let t2; let t3; let mDoomed; let mOther;
            run((c) => { doomed = c.addWorkstream(id, { name: 'Doomed' }); });
            run((c) => { other = c.addWorkstream(id, { name: 'Other' }); });
            run((c) => { t1 = c.addTask('t1', null, '', id, { workstreamId: doomed }); });
            run((c) => { t2 = c.addTask('t2', null, '', id, { workstreamId: other }); });
            run((c) => { t3 = c.addTask('t3', null, '', id); });
            run((c) => { mDoomed = c.addMilestone(id, { title: 'm1', workstreamId: doomed }); });
            run((c) => { mOther = c.addMilestone(id, { title: 'm2', workstreamId: other }); });
            run((c) => c.addDecision(id, { title: 'd1', workstreamId: doomed }));
            run((c) => c.addQuestion(id, { question: 'q1?', workstreamId: doomed }));

            run((c) => c.deleteWorkstream(id, doomed));

            const p = project(id);
            expect(p.workstreams.map((w) => w.id)).toEqual([other]);
            expect(p.milestones.find((m) => m.id === mDoomed).workstreamId).toBeNull();
            expect(p.milestones.find((m) => m.id === mOther).workstreamId).toBe(other);
            expect(p.decisions[0].workstreamId).toBeNull();
            expect(p.questions[0].workstreamId).toBeNull();
            const byId = Object.fromEntries(ctx.tasks.map((t) => [t.id, t]));
            expect(byId[t1].workstreamId).toBeNull();
            expect(byId[t2].workstreamId).toBe(other);
            expect(byId[t3].workstreamId).toBeNull();
        });
    });

    describe('milestones', () => {
        it('keeps done and status mirrored through every kind of patch', () => {
            mount();
            const id = makeProject();
            let mid;
            run((c) => { mid = c.addMilestone(id, { title: 'Beta', date: '2026-11-01' }); });
            const read = () => project(id).milestones.find((m) => m.id === mid);

            run((c) => c.updateMilestone(id, mid, { status: 'at-risk' }));
            expect(read()).toMatchObject({ status: 'at-risk', done: false });
            run((c) => c.updateMilestone(id, mid, { status: 'done' }));
            expect(read()).toMatchObject({ status: 'done', done: true });
            run((c) => c.updateMilestone(id, mid, { done: false }));
            expect(read()).toMatchObject({ status: 'planned', done: false });
            run((c) => c.updateMilestone(id, mid, { done: true }));
            expect(read()).toMatchObject({ status: 'done', done: true });
            expect(read().updatedAt).toBeTruthy();
        });

        it('deleting a milestone clears milestoneId on tasks', () => {
            mount();
            const id = makeProject();
            let mid; let tid;
            run((c) => { mid = c.addMilestone(id, { title: 'Gone' }); });
            run((c) => { tid = c.addTask('t', null, '', id, { milestoneId: mid }); });
            run((c) => c.deleteMilestone(id, mid));
            expect(project(id).milestones).toEqual([]);
            expect(ctx.tasks.find((t) => t.id === tid).milestoneId).toBeNull();
        });
    });

    describe('decisions and questions', () => {
        it('project decisions are separate from the Ledger decisions', () => {
            mount();
            const id = makeProject();
            let did;
            run((c) => { did = c.addDecision(id, { title: 'Use SQLite', by: 'Dušan' }); });
            run((c) => c.createDecision({ title: 'Ledger one' }));
            expect(project(id).decisions).toHaveLength(1);
            expect(ctx.ledger).toHaveLength(1);

            run((c) => c.updateDecision(id, did, { detail: 'Because' }));
            expect(project(id).decisions[0]).toMatchObject({ title: 'Use SQLite', by: 'Dušan', detail: 'Because' });

            run((c) => c.deleteProjectDecision(id, did));
            expect(project(id).decisions).toEqual([]);
            expect(ctx.ledger).toHaveLength(1);

            run((c) => c.deleteDecision(ctx.ledger[0].id));
            expect(ctx.ledger).toEqual([]);
        });

        it('answerQuestion closes a question and stamps updatedAt', () => {
            mount();
            const id = makeProject();
            let qid;
            run((c) => { qid = c.addQuestion(id, { question: 'Who signs off?', blocking: true }); });
            expect(project(id).questions[0]).toMatchObject({ status: 'open', blocking: true, answer: '' });

            run((c) => c.answerQuestion(id, qid, 'Ana'));
            expect(project(id).questions[0]).toMatchObject({ status: 'answered', answer: 'Ana' });
            expect(project(id).questions[0].updatedAt).toBeTruthy();

            run((c) => c.updateQuestion(id, qid, { status: 'open' }));
            expect(project(id).questions[0].status).toBe('open');
            run((c) => c.deleteQuestion(id, qid));
            expect(project(id).questions).toEqual([]);
        });

        it('ignores a project id that does not exist', () => {
            mount();
            let id = 'unset';
            run((c) => { id = c.addWorkstream('nope', { name: 'x' }); });
            expect(id).toBeNull();
            expect(ctx.projects).toEqual([]);
            expect(ctx.activity).toEqual([]);
        });
    });

    describe('activity log', () => {
        it('logs created, status, updated and deleted for tasks with from and to', () => {
            mount();
            const pid = makeProject();
            let id;
            run((c) => { id = c.addTask('Write the report', null, '', pid); });
            run((c) => c.updateTask(id, { status: 'doing' }));
            run((c) => c.toggleTask(id));
            run((c) => c.updateTask(id, { title: 'Write the weekly report' }));
            run((c) => c.deleteTask(id));

            const entries = ctx.activity.filter((a) => a.itemId === id);
            expect(entries.map((a) => a.kind)).toEqual(['created', 'status', 'status', 'updated', 'deleted']);
            expect(entries[1]).toMatchObject({ collection: 'tasks', projectId: pid, from: 'todo', to: 'doing' });
            expect(entries[2]).toMatchObject({ from: 'doing', to: 'done' });
            expect(entries[3].title).toBe('Write the weekly report');
            expect(entries[0]).toMatchObject({ title: 'Write the report', from: null, to: null });
            expect(typeof entries[0].at).toBe('string');
        });

        it('does not log a no-op update', () => {
            mount();
            let id;
            run((c) => { id = c.addTask('Same'); });
            const before = ctx.activity.length;
            run((c) => c.updateTask(id, { title: 'Same' }));
            run((c) => c.updateTask(id, { status: null }));
            expect(ctx.activity).toHaveLength(before);
        });

        it('truncates long titles to 80 characters', () => {
            mount();
            run((c) => c.addTask('x'.repeat(200)));
            expect(ctx.activity[0].title).toHaveLength(80);
        });

        it('logs the embedded collections, with status moves for milestones and questions', () => {
            mount();
            const pid = makeProject();
            let ws; let ms; let q;
            run((c) => { ws = c.addWorkstream(pid, { name: 'Core' }); });
            run((c) => { ms = c.addMilestone(pid, { title: 'Alpha' }); });
            run((c) => { q = c.addQuestion(pid, { question: 'Why?' }); });
            run((c) => c.updateMilestone(pid, ms, { status: 'done' }));
            run((c) => c.answerQuestion(pid, q, 'Because'));
            run((c) => c.deleteWorkstream(pid, ws));

            const summary = ctx.activity.map((a) => `${a.collection}:${a.kind}`);
            expect(summary).toEqual([
                'workstreams:created', 'milestones:created', 'questions:created',
                'milestones:status', 'questions:status', 'workstreams:deleted',
            ]);
            expect(ctx.activity[3]).toMatchObject({ from: 'planned', to: 'done', projectId: pid, title: 'Alpha' });
            expect(ctx.activity[4]).toMatchObject({ from: 'open', to: 'answered' });
        });

        it('collapses repeated updates to the same item within 60 seconds, but not after', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-10-09T10:00:00.000Z'));
            mount();
            let id;
            run((c) => { id = c.addTask('Draft'); });

            run((c) => c.updateTask(id, { title: 'Draft 2' }));
            vi.setSystemTime(new Date('2026-10-09T10:00:30.000Z'));
            run((c) => c.updateTask(id, { title: 'Draft 3' }));
            vi.setSystemTime(new Date('2026-10-09T10:00:50.000Z'));
            run((c) => c.updateTask(id, { title: 'Draft 4' }));

            expect(ctx.activity.map((a) => a.kind)).toEqual(['created', 'updated']);
            expect(ctx.activity[1].title).toBe('Draft 4');

            vi.setSystemTime(new Date('2026-10-09T10:02:00.000Z'));
            run((c) => c.updateTask(id, { title: 'Draft 5' }));
            expect(ctx.activity.map((a) => a.kind)).toEqual(['created', 'updated', 'updated']);
        });

        it('caps the log at 3000 entries and keeps the newest', () => {
            const seed = Array.from({ length: ACTIVITY_CAP }, (_, i) => ({
                at: '2026-09-01T00:00:00.000Z', kind: 'created', collection: 'tasks',
                itemId: `old-${i}`, projectId: null, title: `old ${i}`, from: null, to: null,
            }));
            localStorage.setItem('maia.activity', JSON.stringify(seed));
            mount();
            run((c) => c.addTask('Newest'));
            expect(ctx.activity).toHaveLength(ACTIVITY_CAP);
            expect(ctx.activity[0].itemId).toBe('old-1');
            expect(ctx.activity[ACTIVITY_CAP - 1].title).toBe('Newest');
        });

        it('a corrupt stored log never breaks the edit that tried to log', () => {
            localStorage.setItem('maia.activity', JSON.stringify({ not: 'a list' }));
            mount();
            let id;
            expect(() => run((c) => { id = c.addTask('Still works'); })).not.toThrow();
            expect(ctx.tasks.map((t) => t.id)).toEqual([id]);
            expect(Array.isArray(ctx.activity)).toBe(true);
        });
    });

    describe('invariant: status and done never diverge', () => {
        it('holds in what consumers read and in what is written to storage, over random edits', () => {
            const legacy = [
                { id: 't0', title: 't0', done: true, completedAt: '2026-09-10T10:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z', status: null, projectId: 'p', schedule: 'today' },
                { id: 't1', title: 't1', done: false, createdAt: '2026-09-02T00:00:00.000Z', status: 'blocked', projectId: 'p', schedule: 'today', isNextAction: true },
                { id: 't2', title: 't2', done: false, createdAt: '2026-09-03T00:00:00.000Z', status: null, projectId: 'p', schedule: 'soon' },
            ];
            localStorage.setItem('maia.tasks', JSON.stringify(legacy));
            const view = mount();
            let id3;
            run((c) => { id3 = c.addTask('t3', null, '', 'p'); });

            const ids = ['t0', 't1', 't2', id3];
            const ops = [
                (c, id) => c.toggleTask(id),
                (c, id) => c.updateTask(id, { status: 'todo' }),
                (c, id) => c.updateTask(id, { status: 'doing' }),
                (c, id) => c.updateTask(id, { status: 'blocked' }),
                (c, id) => c.updateTask(id, { status: 'done' }),
                (c, id) => c.updateTask(id, { done: true }),
                (c, id) => c.updateTask(id, { done: false }),
                (c, id) => c.updateTask(id, { status: null }),
                (c, id) => c.updateTask(id, { title: `renamed ${id}` }),
            ];

            // Small deterministic LCG so a failure reproduces.
            let state = 42;
            const next = (n) => {
                state = (state * 1664525 + 1013904223) % 4294967296;
                return state % n;
            };
            const check = () => {
                ctx.tasks.forEach((t) => {
                    expect(t.done).toBe(t.status === 'done');
                    expect(Boolean(t.doneAt)).toBe(t.status === 'done');
                });
            };

            check();
            for (let i = 0; i < 120; i++) {
                const id = ids[next(ids.length)];
                const op = ops[next(ops.length)];
                run((c) => op(c, id));
                check();
            }

            view.unmount();
            const persisted = stored('maia.tasks');
            expect(persisted).toHaveLength(4);
            persisted.forEach((t) => {
                if (!TASK_STATUSES.includes(t.status)) return; // never touched: still the legacy shape (status: null)
                expect(t.done).toBe(t.status === 'done');
                expect(Boolean(t.doneAt)).toBe(t.status === 'done');
            });
        });
    });

    describe('generateSamples', () => {
        it('fills tasks, activity and the Opus fields along with projects and notes', () => {
            mount();
            run((c) => c.generateSamples());
            expect(ctx.notes.length).toBeGreaterThan(0);
            expect(ctx.projects.length).toBe(4);
            expect(ctx.tasks.length).toBeGreaterThan(50);
            expect(ctx.activity.length).toBeGreaterThan(ctx.tasks.length);
            const core = ctx.projects.find((p) => p.name === 'Maia Core');
            expect(core.workstreams.length).toBeGreaterThan(0);
            expect(core.milestones.length).toBeGreaterThan(0);
            ctx.tasks.forEach((t) => expect(t.done).toBe(t.status === 'done'));
        });
    });
});
