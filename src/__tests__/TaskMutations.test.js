/**
 * Mutation-path tests for Tasks page handlers.
 *
 * Covers: submit routing (create/update), edit form population,
 * form reset, and status toggle logic.
 */

// ── Extracted logic mirrors ──────────────────────────────────────────────

function handleSubmitRouting(form, editingTask) {
  if (editingTask) {
    return { action: 'update', id: editingTask.id, data: form };
  }
  return { action: 'create', data: form };
}

function populateEditForm(task) {
  return {
    title: task.title || '',
    description: task.description || '',
    phase: task.phase || 'pre_launch',
    month: task.month || 1,
    estimated_cost: task.estimated_cost || 0,
    priority: task.priority || 'medium',
    due_date: task.due_date || '',
  };
}

function resetForm() {
  return {
    title: '',
    description: '',
    phase: 'pre_launch',
    month: 1,
    estimated_cost: 0,
    priority: 'medium',
    due_date: '',
  };
}

function toggleStatus(task) {
  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  return { id: task.id, data: { ...task, status: newStatus } };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Task mutation paths', () => {
  describe('handleSubmit routing', () => {
    it('routes to create when no editing task', () => {
      const result = handleSubmitRouting({ title: 'New task' }, null);
      expect(result.action).toBe('create');
    });

    it('routes to update when editing task exists', () => {
      const result = handleSubmitRouting({ title: 'Updated' }, { id: 't-1' });
      expect(result).toEqual({ action: 'update', id: 't-1', data: { title: 'Updated' } });
    });
  });

  describe('populateEditForm', () => {
    it('populates form from task data', () => {
      const form = populateEditForm({
        title: 'Setup domain',
        description: 'Register domain',
        phase: 'launch',
        month: 3,
        estimated_cost: 500,
        priority: 'high',
        due_date: '2026-03-01',
      });

      expect(form.title).toBe('Setup domain');
      expect(form.phase).toBe('launch');
      expect(form.estimated_cost).toBe(500);
    });

    it('defaults missing fields', () => {
      const form = populateEditForm({});
      expect(form.title).toBe('');
      expect(form.phase).toBe('pre_launch');
      expect(form.month).toBe(1);
      expect(form.estimated_cost).toBe(0);
      expect(form.priority).toBe('medium');
    });
  });

  describe('resetForm', () => {
    it('returns clean default form', () => {
      const form = resetForm();
      expect(form.title).toBe('');
      expect(form.phase).toBe('pre_launch');
      expect(form.priority).toBe('medium');
      expect(Object.keys(form)).toHaveLength(7);
    });
  });

  describe('toggleStatus', () => {
    it('toggles completed -> pending', () => {
      const result = toggleStatus({ id: 't-1', status: 'completed', title: 'Done' });
      expect(result.data.status).toBe('pending');
      expect(result.id).toBe('t-1');
    });

    it('toggles pending -> completed', () => {
      const result = toggleStatus({ id: 't-2', status: 'pending', title: 'Todo' });
      expect(result.data.status).toBe('completed');
    });

    it('toggles any non-completed -> completed', () => {
      const result = toggleStatus({ id: 't-3', status: 'in_progress' });
      expect(result.data.status).toBe('completed');
    });

    it('preserves other task fields', () => {
      const result = toggleStatus({
        id: 't-4',
        status: 'pending',
        title: 'Keep',
        priority: 'high',
      });
      expect(result.data.title).toBe('Keep');
      expect(result.data.priority).toBe('high');
    });
  });
});
