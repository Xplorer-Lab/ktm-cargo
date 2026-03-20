/**
 * Mutation-path tests for ShipmentDocuments page handlers.
 *
 * Covers: document generation tracking, batch print validation,
 * shipment selection (toggle/selectAll), and doc status derivation.
 */

// ── Extracted logic mirrors ──────────────────────────────────────────────

const DOCUMENT_TYPES = [
  { id: 'commercial_invoice', label: 'Commercial Invoice' },
  { id: 'packing_list', label: 'Packing List' },
  { id: 'air_waybill', label: 'Air Waybill' },
  { id: 'customs_declaration', label: 'Customs Declaration' },
];

function handleGenerateDoc(generatedDocs, shipmentId, docType) {
  return {
    ...generatedDocs,
    [shipmentId]: {
      ...(generatedDocs[shipmentId] || {}),
      [docType]: true,
    },
  };
}

function handleGenerateAllDocs(generatedDocs, shipmentId) {
  const allDocs = {};
  DOCUMENT_TYPES.forEach((doc) => {
    allDocs[doc.id] = true;
  });
  return {
    ...generatedDocs,
    [shipmentId]: allDocs,
  };
}

function canBatchPrint(selectedShipments) {
  return selectedShipments.length > 0;
}

function toggleShipmentSelection(selected, id) {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

function selectAllShipments(currentSelected, eligibleShipments) {
  if (currentSelected.length === eligibleShipments.length) {
    return [];
  }
  return eligibleShipments.map((s) => s.id);
}

function getDocStatus(generatedDocs, shipmentId) {
  const docs = generatedDocs[shipmentId] || {};
  const count = Object.keys(docs).length;
  if (count === 0) return { label: 'Not Generated', color: 'bg-slate-100 text-slate-600' };
  if (count < 4) return { label: `${count}/4 Docs`, color: 'bg-amber-100 text-amber-800' };
  return { label: 'Complete', color: 'bg-emerald-100 text-emerald-800' };
}

function isValidDocType(docType) {
  const templates = ['commercial_invoice', 'packing_list', 'air_waybill', 'customs_declaration'];
  return templates.includes(docType);
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('ShipmentDocument mutation paths', () => {
  describe('handleGenerateDoc', () => {
    it('marks a single doc as generated', () => {
      const result = handleGenerateDoc({}, 's-1', 'packing_list');
      expect(result['s-1'].packing_list).toBe(true);
    });

    it('adds to existing docs for same shipment', () => {
      const existing = { 's-1': { commercial_invoice: true } };
      const result = handleGenerateDoc(existing, 's-1', 'packing_list');

      expect(result['s-1'].commercial_invoice).toBe(true);
      expect(result['s-1'].packing_list).toBe(true);
    });

    it('does not affect other shipments', () => {
      const existing = { 's-1': { commercial_invoice: true } };
      const result = handleGenerateDoc(existing, 's-2', 'air_waybill');

      expect(result['s-1'].commercial_invoice).toBe(true);
      expect(result['s-2'].air_waybill).toBe(true);
    });
  });

  describe('handleGenerateAllDocs', () => {
    it('generates all 4 document types', () => {
      const result = handleGenerateAllDocs({}, 's-1');
      const docs = result['s-1'];

      expect(Object.keys(docs)).toHaveLength(4);
      expect(docs.commercial_invoice).toBe(true);
      expect(docs.packing_list).toBe(true);
      expect(docs.air_waybill).toBe(true);
      expect(docs.customs_declaration).toBe(true);
    });
  });

  describe('canBatchPrint', () => {
    it('returns true when shipments are selected', () => {
      expect(canBatchPrint(['s-1'])).toBe(true);
    });

    it('returns false when none selected', () => {
      expect(canBatchPrint([])).toBe(false);
    });
  });

  describe('toggleShipmentSelection', () => {
    it('adds shipment when not selected', () => {
      expect(toggleShipmentSelection(['s-1'], 's-2')).toEqual(['s-1', 's-2']);
    });

    it('removes shipment when already selected', () => {
      expect(toggleShipmentSelection(['s-1', 's-2'], 's-1')).toEqual(['s-2']);
    });
  });

  describe('selectAllShipments', () => {
    const eligible = [{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }];

    it('selects all when not all selected', () => {
      expect(selectAllShipments(['s-1'], eligible)).toEqual(['s-1', 's-2', 's-3']);
    });

    it('deselects all when all are already selected', () => {
      expect(selectAllShipments(['s-1', 's-2', 's-3'], eligible)).toEqual([]);
    });
  });

  describe('getDocStatus', () => {
    it('returns Not Generated for no docs', () => {
      expect(getDocStatus({}, 's-1').label).toBe('Not Generated');
    });

    it('returns partial count for 2 docs', () => {
      const docs = { 's-1': { commercial_invoice: true, packing_list: true } };
      expect(getDocStatus(docs, 's-1').label).toBe('2/4 Docs');
    });

    it('returns Complete for all 4 docs', () => {
      const docs = {
        's-1': {
          commercial_invoice: true,
          packing_list: true,
          air_waybill: true,
          customs_declaration: true,
        },
      };
      expect(getDocStatus(docs, 's-1').label).toBe('Complete');
    });
  });

  describe('isValidDocType', () => {
    it('validates known doc types', () => {
      expect(isValidDocType('commercial_invoice')).toBe(true);
      expect(isValidDocType('air_waybill')).toBe(true);
    });

    it('rejects unknown doc types', () => {
      expect(isValidDocType('receipt')).toBe(false);
    });
  });
});
